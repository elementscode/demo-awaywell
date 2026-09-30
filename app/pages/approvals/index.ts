import { Request, Response, getAppUrl } from "@elements/app";
import { personForPage } from "#app/shared/services/auth";
import { approvalsFor, requestEvents } from "#app/shared/services/timeoff";
import html from "./template";

export default function route(req: Request, res: Response) {
  let person = personForPage("manager");
  if (!person) {
    return;
  }

  let listener = requestEvents.listen({ filter: (e) => e.managerId === person.id });

  return new html({
    person,
    feedUrl: `${getAppUrl()}/feed/${person.feedToken}.ics`,
    initial: approvalsFor(person.id),
    listener,
  });
}
