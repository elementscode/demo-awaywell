import { Job, email, sql } from "@elements/app";
import RequestSubmittedEmail from "#app/emails/request-submitted";
import RequestDecidedEmail from "#app/emails/request-decided";
import { formatRange } from "#app/shared/format";

export interface NotifyRequestJobFields {
  requestId: string;
  event: "submitted" | "decided";
}

interface RequestMail {
  type: "vacation" | "sick" | "personal";
  startDate: string;
  endDate: string;
  days: number;
  note: string;
  status: string;
  decisionComment: string;
  employeeName: string;
  employeeEmail: string;
  managerName: string;
  managerEmail: string;
}

const LABELS = { vacation: "Vacation", sick: "Sick", personal: "Personal" };

/**
 * Emails the other side of a request: the manager when it comes in, the
 * employee when it is decided. Scheduled inside the write's transaction, so
 * nothing is sent for a request that did not commit.
 */
export class NotifyRequestJob extends Job<NotifyRequestJobFields> {
  static maxAttempts = 5;

  run() {
    let r = sql<RequestMail>(`
      select r.type, r.startDate::text as startDate, r.endDate::text as endDate,
             r.days::float8 as days, r.note, r.status, r.decisionComment,
             e.name as employeeName, e.email as employeeEmail,
             m.name as managerName, m.email as managerEmail
        from requests r
        join users e on e.id = r.userId
        join users m on m.id = r.managerId
       where r.id = ${this.fields.requestId}
    `).first();

    if (!r) {
      return;
    }

    let when = formatRange(r.startDate, r.endDate);

    if (this.fields.event === "submitted") {
      email({
        to: r.managerEmail,
        subject: `${r.employeeName} requested ${r.type} time off: ${when}`,
        body: new RequestSubmittedEmail({
          managerName: r.managerName,
          employeeName: r.employeeName,
          typeLabel: LABELS[r.type],
          startDate: r.startDate,
          endDate: r.endDate,
          days: r.days,
          note: r.note,
        }),
      });

      return;
    }

    let approved = r.status === "approved";

    email({
      to: r.employeeEmail,
      subject: `${approved ? "Approved" : "Denied"}: ${r.type} time off ${when}`,
      body: new RequestDecidedEmail({
        employeeName: r.employeeName,
        managerName: r.managerName,
        approved,
        typeLabel: LABELS[r.type],
        startDate: r.startDate,
        endDate: r.endDate,
        days: r.days,
        comment: r.decisionComment,
      }),
    });
  }
}
