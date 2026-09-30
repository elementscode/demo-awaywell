import { test, equal, assert, errorf, sql, ValidationError, ForbiddenError, NotFoundError } from "@elements/app";
import { makeTeam, signInAs } from "#app/shared/testing/fixtures";
import { submitRequest, cancelRequest, decideRequest, balancesFor, teamMonth, pendingFor } from "#app/shared/services/timeoff";

async function expectError(fn: () => unknown, kind: Function, contains: string) {
  try {
    await fn();
    errorf("expected %v containing %v", kind.name, contains);
  } catch (caught) {
    let err = caught as any;
    assert(err instanceof kind, `expected ${kind.name}, got ${err?.constructor?.name}: ${err?.message}`);

    let text = JSON.stringify((caught as any).errors ?? (caught as any).message);
    assert(text.includes(contains), `expected "${contains}" in ${text}`);
  }
}

test("time off", async () => {
  test("submit counts only working days and holds them as pending", async () => {
    let team = makeTeam();
    signInAs(team.employeeId);

    // Fri Oct 9 through Tue Oct 13 2026 is three working days
    let r = submitRequest({ type: "vacation", startDate: "2026-10-09", endDate: "2026-10-13", note: "  trip  " });
    equal(r.days, 3);
    equal(r.status, "pending");
    equal(r.note, "trip");
    equal(r.managerId, team.managerId);

    let vacation = balancesFor(team.employeeId).find((b) => b.type === "vacation")!;
    equal(vacation.pendingDays, 3);
    equal(vacation.usedDays, 0);
    equal(vacation.remainingDays, 7);
  });

  test("submit schedules the manager's email", async () => {
    let team = makeTeam();
    signInAs(team.employeeId);

    let r = submitRequest({ type: "sick", startDate: "2026-10-05", endDate: "2026-10-05", note: "" });
    let jobs = sql<{ n: number }>(`select count(*)::int as n from elements.jobs where fields->>'requestId' = ${r.id}`).firstOrThrow();
    equal(jobs.n, 1);
  });

  test("submit rejects bad dates, weekends, overlaps and overdrawn balances", async () => {
    let team = makeTeam();
    signInAs(team.employeeId);

    await expectError(() => submitRequest({ type: "vacation", startDate: "2026-10-09", endDate: "2026-10-01", note: "" }), ValidationError, "before the first");
    await expectError(() => submitRequest({ type: "vacation", startDate: "2026-10-10", endDate: "2026-10-11", note: "" }), ValidationError, "weekend");
    await expectError(() => submitRequest({ type: "personal", startDate: "2026-10-05", endDate: "2026-10-07", note: "" }), ValidationError, "2 personal days left");

    submitRequest({ type: "vacation", startDate: "2026-10-05", endDate: "2026-10-06", note: "" });
    await expectError(() => submitRequest({ type: "sick", startDate: "2026-10-06", endDate: "2026-10-06", note: "" }), ValidationError, "already have time off");
  });

  test("managers cannot request time off", async () => {
    let team = makeTeam();
    signInAs(team.managerId);

    await expectError(() => submitRequest({ type: "vacation", startDate: "2026-10-05", endDate: "2026-10-05", note: "" }), ForbiddenError, "manager");
  });

  test("only the requester cancels, and only while pending", async () => {
    let team = makeTeam();
    signInAs(team.employeeId);
    let r = submitRequest({ type: "vacation", startDate: "2026-10-05", endDate: "2026-10-06", note: "" });

    signInAs(team.otherId);
    await expectError(() => cancelRequest(r.id), ValidationError, "only your own pending");

    signInAs(team.employeeId);
    equal(cancelRequest(r.id).status, "cancelled");
    equal(balancesFor(team.employeeId).find((b) => b.type === "vacation")!.remainingDays, 10);
    await expectError(() => cancelRequest(r.id), ValidationError, "only your own pending");
  });

  test("approving moves days from pending to used", async () => {
    let team = makeTeam();
    signInAs(team.employeeId);
    let r = submitRequest({ type: "vacation", startDate: "2026-10-05", endDate: "2026-10-09", note: "" });

    signInAs(team.managerId);
    equal(pendingFor(team.managerId).length, 1);
    equal(pendingFor(team.managerId)[0].remainingAfter, 5);

    let decided = decideRequest(r.id, "approved", "enjoy");
    equal(decided.status, "approved");
    equal(decided.decisionComment, "enjoy");
    assert(decided.decidedAt instanceof Date, "decidedAt is set");

    let vacation = balancesFor(team.employeeId).find((b) => b.type === "vacation")!;
    equal(vacation.usedDays, 5);
    equal(vacation.pendingDays, 0);
    equal(pendingFor(team.managerId).length, 0);

    await expectError(() => decideRequest(r.id, "denied", "changed my mind"), ValidationError, "already been decided");
  });

  test("denying needs a comment and frees the days", async () => {
    let team = makeTeam();
    signInAs(team.employeeId);
    let r = submitRequest({ type: "vacation", startDate: "2026-10-05", endDate: "2026-10-06", note: "" });

    signInAs(team.managerId);
    await expectError(() => decideRequest(r.id, "denied", "   "), ValidationError, "say why");
    equal(decideRequest(r.id, "denied", "launch week").status, "denied");
    equal(balancesFor(team.employeeId).find((b) => b.type === "vacation")!.remainingDays, 10);
  });

  test("a manager cannot decide another team's request, and an employee cannot decide at all", async () => {
    let team = makeTeam();
    let outsider = sql<{ id: string }>(`
      insert into users (email, name, passwordHash, role) values ('x@test.dev', 'Xan', 'x', 'manager') returning id
    `).firstOrThrow().id;

    signInAs(team.employeeId);
    let r = submitRequest({ type: "vacation", startDate: "2026-10-05", endDate: "2026-10-06", note: "" });

    signInAs(team.otherId);
    await expectError(() => decideRequest(r.id, "approved", ""), ForbiddenError, "managers only");

    signInAs(outsider);
    await expectError(() => decideRequest(r.id, "approved", ""), NotFoundError, "not found");
  });

  test("the team month holds approved and pending time off that touches the month", async () => {
    let team = makeTeam();
    signInAs(team.employeeId);
    submitRequest({ type: "vacation", startDate: "2026-09-28", endDate: "2026-10-02", note: "" });
    let later = submitRequest({ type: "sick", startDate: "2026-11-02", endDate: "2026-11-02", note: "" });
    cancelRequest(later.id);

    signInAs(team.otherId);
    let denied = submitRequest({ type: "vacation", startDate: "2026-10-20", endDate: "2026-10-20", note: "" });

    signInAs(team.managerId);
    decideRequest(denied.id, "denied", "no");

    equal(teamMonth(team.managerId, "2026-10").map((r) => r.startDate), ["2026-09-28"]);
    equal(teamMonth(team.managerId, "2026-11").length, 0);
    await expectError(() => teamMonth(team.managerId, "2026-13"), ValidationError, "month");
  });
});
