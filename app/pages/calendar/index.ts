import { Request, Response } from "@elements/app";
import { personForPage } from "#app/shared/services/auth";
import { requestEvents, teamMonth } from "#app/shared/services/timeoff";
import { toDay } from "#app/shared/format";
import html from "./template";

export default function route(req: Request, res: Response) {
  let person = personForPage("manager");
  if (!person) {
    return;
  }

  let today = toDay(new Date());
  let asked = String(req.query.month ?? "");
  let month = /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : today.slice(0, 7);

  let listener = requestEvents.listen({ filter: (e) => e.managerId === person.id });

  return new html({ person, month, today, initial: teamMonth(person.id, month), listener });
}
