import { Request, Response, getAppUrl, sql } from "@elements/app";
import { personForPage } from "#app/shared/services/auth";
import { balancesFor, requestsFor, requestEvents } from "#app/shared/services/timeoff";
import html from "./template";

export default function route(req: Request, res: Response) {
  let person = personForPage("employee");
  if (!person) {
    return;
  }

  let manager = sql<{ name: string }>(`select name from users where id = ${person.managerId}`).first();

  // listen before reading, so a change landing in between still arrives
  let listener = requestEvents.listen({ filter: (e) => e.userId === person.id });

  return new html({
    person,
    managerName: manager?.name ?? "your manager",
    feedUrl: `${getAppUrl()}/feed/${person.feedToken}.ics`,
    initial: { balances: balancesFor(person.id), requests: requestsFor(person.id) },
    listener,
  });
}
