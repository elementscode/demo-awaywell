import { sql, tx, Channel, ForbiddenError, NotFoundError, ValidationError } from "@elements/app";
import { currentPersonOrThrow, currentManagerOrThrow } from "#app/shared/services/auth";
import { NotifyRequestJob } from "#app/jobs/notify-request";

export type TimeOffType = "vacation" | "sick" | "personal";
export type RequestStatus = "pending" | "approved" | "denied" | "cancelled";

export const TYPES: TimeOffType[] = ["vacation", "sick", "personal"];

export const TYPE_LABELS: Record<TimeOffType, string> = {
  vacation: "Vacation",
  sick: "Sick",
  personal: "Personal",
};

export interface Balance {
  id: string;
  type: TimeOffType;
  allowanceDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

export interface TimeOffRequest {
  id: string;
  createdAt: Date;
  userId: string;
  userName: string;
  managerId: string;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  days: number;
  note: string;
  status: RequestStatus;
  decisionComment: string;
  decidedAt: Date | null;
}

export interface PendingRequest extends TimeOffRequest {
  remainingAfter: number;
}

export interface RequestForm {
  type: TimeOffType;
  startDate: string;
  endDate: string;
  note: string;
}

/**
 * A signal that a request changed. Pages listen filtered to their own team or
 * person and re-read through an rpc, so the payload carries only the routing.
 */
export interface RequestEvent {
  requestId: string;
  userId: string;
  managerId: string;
}

export const requestEvents = new Channel<RequestEvent>("requestEvents");

const REQUEST_COLUMNS = sql.raw(`
  r.id, r.createdAt, r.userId, u.name as userName, r.managerId, r.type,
  r.startDate::text as startDate, r.endDate::text as endDate, r.days::float8 as days,
  r.note, r.status, r.decisionComment, r.decidedAt
`);

export function balancesFor(userId: string): Balance[] {
  return sql<Balance>(`
    select b.id,
           b.type,
           b.allowanceDays::float8 as allowanceDays,
           coalesce(sum(r.days) filter (where r.status = 'approved'), 0)::float8 as usedDays,
           coalesce(sum(r.days) filter (where r.status = 'pending'), 0)::float8 as pendingDays,
           (b.allowanceDays - coalesce(sum(r.days) filter (where r.status in ('approved', 'pending')), 0))::float8 as remainingDays
      from balances b
      left join requests r on r.userId = b.userId and r.type = b.type
     where b.userId = ${userId}
     group by b.id
     order by array_position(array['vacation', 'sick', 'personal']::timeOffType[], b.type)
  `).all();
}

export function requestsFor(userId: string): TimeOffRequest[] {
  return sql<TimeOffRequest>(`
    select ${REQUEST_COLUMNS}
      from requests r
      join users u on u.id = r.userId
     where r.userId = ${userId}
     order by r.startDate desc
  `).all();
}

export function pendingFor(managerId: string): PendingRequest[] {
  return sql<PendingRequest>(`
    select ${REQUEST_COLUMNS},
           (select b.allowanceDays - coalesce(sum(x.days), 0)
              from balances b
              left join requests x on x.userId = b.userId and x.type = b.type and x.status in ('approved', 'pending')
             where b.userId = r.userId and b.type = r.type
             group by b.allowanceDays)::float8 as remainingAfter
      from requests r
      join users u on u.id = r.userId
     where r.managerId = ${managerId}
       and r.status = 'pending'
     order by r.startDate, r.createdAt
  `).all();
}

export function recentDecisionsFor(managerId: string): TimeOffRequest[] {
  return sql<TimeOffRequest>(`
    select ${REQUEST_COLUMNS}
      from requests r
      join users u on u.id = r.userId
     where r.managerId = ${managerId}
       and r.status in ('approved', 'denied')
     order by r.decidedAt desc nulls last
     limit 8
  `).all();
}

/** Approved and pending time off for a manager's team from today on. */
export function teamUpcoming(managerId: string): TimeOffRequest[] {
  return sql<TimeOffRequest>(`
    select ${REQUEST_COLUMNS}
      from requests r
      join users u on u.id = r.userId
     where r.managerId = ${managerId}
       and r.status in ('approved', 'pending')
       and r.endDate >= current_date
     order by r.startDate, u.name
  `).all();
}

/** Approved and pending time off for a manager's team overlapping one month. */
export function teamMonth(managerId: string, month: string): TimeOffRequest[] {
  let first = monthStart(month);

  return sql<TimeOffRequest>(`
    select ${REQUEST_COLUMNS}
      from requests r
      join users u on u.id = r.userId
     where r.managerId = ${managerId}
       and r.status in ('approved', 'pending')
       and r.startDate < (${first}::date + interval '1 month')
       and r.endDate >= ${first}::date
     order by r.startDate, u.name
  `).all();
}

export function monthStart(month: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new ValidationError("month must look like 2026-10");
  }

  return `${month}-01`;
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

function announce(r: { id: string; userId: string; managerId: string }) {
  requestEvents.notify({ requestId: r.id, userId: r.userId, managerId: r.managerId });
}

/** @rpc */
export function submitRequest(form: RequestForm): TimeOffRequest {
  let me = currentPersonOrThrow();
  if (!me.managerId) {
    throw new ForbiddenError("only employees with a manager can request time off");
  }

  let errors: { type?: string[]; startDate?: string[]; endDate?: string[] } = {};

  if (!TYPES.includes(form.type)) {
    errors.type = ["pick a type"];
  }

  if (!isDate(form.startDate)) {
    errors.startDate = ["pick a first day"];
  }

  if (!isDate(form.endDate)) {
    errors.endDate = ["pick a last day"];
  } else if (isDate(form.startDate) && form.endDate < form.startDate) {
    errors.endDate = ["the last day comes before the first"];
  }

  if (Object.keys(errors).length) {
    throw new ValidationError(errors);
  }

  let note = form.note.trim().slice(0, 500);

  let request = tx(() => {
    let days = sql<{ n: number }>(`select workingDays(${form.startDate}::date, ${form.endDate}::date) as n`).firstOrThrow().n;
    if (days === 0) {
      throw new ValidationError({ endDate: ["those dates are all weekend"] });
    }

    let overlap = sql(`
      select 1
        from requests
       where userId = ${me.id}
         and status in ('pending', 'approved')
         and startDate <= ${form.endDate}::date
         and endDate >= ${form.startDate}::date
    `).first();

    if (overlap) {
      throw new ValidationError({ startDate: ["you already have time off in those dates"] });
    }

    let balance = balancesFor(me.id).find((b) => b.type === form.type);
    let remaining = balance?.remainingDays ?? 0;
    if (days > remaining) {
      throw new ValidationError({
        endDate: [`that is ${days} working days; you have ${remaining} ${form.type} days left`],
      });
    }

    let row = sql<{ id: string }>(`
      insert into requests (userId, managerId, type, startDate, endDate, days, note)
           values (${me.id}, ${me.managerId}, ${form.type}, ${form.startDate}, ${form.endDate}, ${days}, ${note})
        returning id
    `).firstOrThrow("insert returned no row");

    new NotifyRequestJob({ requestId: row.id, event: "submitted" }).schedule();

    return findRequest(row.id);
  });

  announce(request);

  return request;
}

/** @rpc */
export function cancelRequest(id: string): TimeOffRequest {
  let me = currentPersonOrThrow();

  let row = sql<{ id: string; userId: string; managerId: string }>(`
    update requests
       set status = 'cancelled'
     where id = ${id}
       and userId = ${me.id}
       and status = 'pending'
 returning id, userId, managerId
  `).first();

  if (!row) {
    throw new ValidationError("only your own pending requests can be cancelled");
  }

  announce(row);

  return findRequest(row.id);
}

/** @rpc */
export function decideRequest(id: string, decision: "approved" | "denied", comment: string): TimeOffRequest {
  let me = currentManagerOrThrow();

  if (decision !== "approved" && decision !== "denied") {
    throw new ValidationError("decision must be approve or deny");
  }

  let text = comment.trim().slice(0, 500);
  if (decision === "denied" && !text) {
    throw new ValidationError("say why when you deny a request");
  }

  let row = tx(() => {
    let updated = sql<{ id: string; userId: string; managerId: string }>(`
      update requests
         set status = ${decision},
             decisionComment = ${text},
             decidedAt = now()
       where id = ${id}
         and managerId = ${me.id}
         and status = 'pending'
   returning id, userId, managerId
    `).first();

    if (!updated) {
      let exists = sql(`select 1 from requests where id = ${id} and managerId = ${me.id}`).first();
      throw exists
        ? new ValidationError("that request has already been decided or cancelled")
        : new NotFoundError("request not found");
    }

    new NotifyRequestJob({ requestId: updated.id, event: "decided" }).schedule();

    return updated;
  });

  announce(row);

  return findRequest(row.id);
}

export function findRequest(id: string): TimeOffRequest {
  return sql<TimeOffRequest>(`
    select ${REQUEST_COLUMNS}
      from requests r
      join users u on u.id = r.userId
     where r.id = ${id}
  `).firstOrThrow("request not found");
}

/** @rpc */
export function fetchMine(): { balances: Balance[]; requests: TimeOffRequest[] } {
  let me = currentPersonOrThrow();

  return { balances: balancesFor(me.id), requests: requestsFor(me.id) };
}

/** @rpc */
export function fetchApprovals(): Approvals {
  let me = currentManagerOrThrow();

  return approvalsFor(me.id);
}

export interface Approvals {
  pending: PendingRequest[];
  recent: TimeOffRequest[];
  upcoming: TimeOffRequest[];
}

export function approvalsFor(managerId: string): Approvals {
  return { pending: pendingFor(managerId), recent: recentDecisionsFor(managerId), upcoming: teamUpcoming(managerId) };
}

/** @rpc */
export function fetchTeamMonth(month: string): TimeOffRequest[] {
  let me = currentManagerOrThrow();

  return teamMonth(me.id, month);
}
