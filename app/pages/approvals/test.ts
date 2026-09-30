import { test, equal, assert, ForbiddenError } from "@elements/app";
import { makeTeam, signInAs } from "#app/shared/testing/fixtures";
import { submitRequest, fetchApprovals } from "#app/shared/services/timeoff";

test("approvals", () => {
  test("a manager sees pending requests and who else is out", () => {
    let team = makeTeam();

    signInAs(team.employeeId);
    submitRequest({ type: "vacation", startDate: "2027-01-04", endDate: "2027-01-06", note: "ski" });

    signInAs(team.otherId);
    submitRequest({ type: "personal", startDate: "2027-01-05", endDate: "2027-01-05", note: "" });

    signInAs(team.managerId);
    let data = fetchApprovals();
    equal(data.pending.map((r) => r.userName), ["Eli Employee", "Ola Other"]);
    equal(data.upcoming.length, 2);
  });

  test("an employee cannot open the approvals data", () => {
    let team = makeTeam();
    signInAs(team.employeeId);

    try {
      fetchApprovals();
      assert(false, "expected ForbiddenError");
    } catch (err: any) {
      assert(err instanceof ForbiddenError, "ForbiddenError");
    }
  });
});
