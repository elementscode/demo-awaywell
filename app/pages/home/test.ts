import { test, equal } from "@elements/app";
import { makeTeam, signInAs } from "#app/shared/testing/fixtures";
import { submitRequest, fetchMine } from "#app/shared/services/timeoff";

test("home", () => {
  test("an employee sees their own balances and requests, not a teammate's", () => {
    let team = makeTeam();

    signInAs(team.otherId);
    submitRequest({ type: "sick", startDate: "2026-10-05", endDate: "2026-10-05", note: "" });

    signInAs(team.employeeId);
    submitRequest({ type: "vacation", startDate: "2026-10-12", endDate: "2026-10-13", note: "" });

    let mine = fetchMine();
    equal(mine.balances.map((b) => b.type), ["vacation", "sick", "personal"]);
    equal(mine.requests.length, 1);
    equal(mine.requests[0].type, "vacation");
  });
});
