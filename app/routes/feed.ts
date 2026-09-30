import { Request, Response, sql, NotFoundError } from "@elements/app";

interface FeedOwner {
  id: string;
  name: string;
  role: "employee" | "manager";
}

interface FeedEvent {
  id: string;
  userName: string;
  type: "vacation" | "sick" | "personal";
  startDate: string;
  endDate: string;
  note: string;
  decidedAt: Date | null;
  updatedAt: Date;
}

const LABELS = { vacation: "Vacation", sick: "Sick", personal: "Personal" };

/**
 * A person's approved time off as an iCalendar feed. The token in the url is
 * the only credential, since calendar apps subscribe without a session. A
 * manager's feed also carries their team's time off.
 */
export default function feed(req: Request, res: Response) {
  let token = String(req.params.token ?? "");

  let owner = sql<FeedOwner>(`select id, name, role from users where feedToken = ${token}`).first();
  if (!owner) {
    throw new NotFoundError("no such calendar");
  }

  let events = sql<FeedEvent>(`
    select r.id, u.name as userName, r.type,
           r.startDate::text as startDate, r.endDate::text as endDate,
           r.note, r.decidedAt, r.updatedAt
      from requests r
      join users u on u.id = r.userId
     where r.status = 'approved'
       and (r.userId = ${owner.id} or r.managerId = ${owner.id})
       and r.endDate >= current_date - interval '1 year'
     order by r.startDate
  `).all();

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="awaywell.ics"`);
  res.setHeader("Cache-Control", "private, max-age=300");
  res.end(buildCalendar(owner, events));
}

export function buildCalendar(owner: FeedOwner, events: FeedEvent[]): string {
  let lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//awaywell//time off//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(owner.role === "manager" ? `${owner.name}'s team · awaywell` : "My time off · awaywell")}`,
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (let e of events) {
    let label = LABELS[e.type];
    let summary = owner.role === "manager" ? `${e.userName} · ${label}` : `${label} (awaywell)`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@awaywell`,
      `DTSTAMP:${stamp(e.decidedAt ?? e.updatedAt)}`,
      `DTSTART;VALUE=DATE:${compactDay(e.startDate)}`,
      // DTEND on an all-day event is exclusive, so it is the day after
      `DTEND;VALUE=DATE:${compactDay(nextDay(e.endDate))}`,
      `SUMMARY:${escapeText(summary)}`,
      "TRANSP:TRANSPARENT",
      `CATEGORIES:${label.toUpperCase()}`,
    );

    if (e.note) {
      lines.push(`DESCRIPTION:${escapeText(e.note)}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.map(fold).join("\r\n") + "\r\n";
}

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 caps a content line at 75 octets; longer ones continue after CRLF and a space. */
function fold(line: string): string {
  let bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) {
    return line;
  }

  let parts: string[] = [];
  let current = "";
  let size = 0;

  for (let ch of line) {
    let n = Buffer.byteLength(ch, "utf8");
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }

    current += ch;
    size += n;
  }

  parts.push(current);

  return parts.join("\r\n ");
}

function compactDay(day: string): string {
  return day.replace(/-/g, "");
}

function nextDay(day: string): string {
  let d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);

  return d.toISOString().slice(0, 10);
}

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
