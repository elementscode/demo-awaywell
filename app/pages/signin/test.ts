import { test, equal, assert, session, AuthError } from "@elements/app";
import { makeTeam } from "#app/shared/testing/fixtures";
import { signin } from "#app/shared/services/auth";
import { groupByTeam } from "./template";

test("signin", () => {
  test("a manager lands on approvals and an employee on their own page", () => {
    makeTeam();

    equal(signin("BOSS@test.dev ", "secret-pass"), "/approvals");
    equal(session.get("role"), "manager");

    equal(signin("emp@test.dev", "secret-pass"), "/");
    equal(session.get("userName"), "Eli Employee");
  });

  test("a wrong password does not say which part was wrong", () => {
    makeTeam();

    try {
      signin("emp@test.dev", "nope");
      assert(false, "expected an AuthError");
    } catch (err: any) {
      assert(err instanceof AuthError, "AuthError");
      equal(err.message, "invalid email or password");
    }
  });

  test("demo logins group under their manager", () => {
    let teams = groupByTeam([
      { id: "1", email: "m@x", name: "Maya", role: "manager", team: "Maya" },
      { id: "2", email: "p@x", name: "Priya", role: "employee", team: "Maya" },
      { id: "3", email: "d@x", name: "Dan", role: "manager", team: "Dan" },
    ]);

    equal(teams.map((t) => `${t.name}:${t.people.length}`), ["Maya:2", "Dan:1"]);
  });
});
