import { sql, session } from "@elements/app";

export interface Team {
  managerId: string;
  employeeId: string;
  otherId: string;
  managerEmail: string;
  employeeEmail: string;
}

function person(email: string, name: string, role: "employee" | "manager", managerId: string | null): string {
  // bf cost 4 keeps fixtures fast; production hashes use cost 12
  return sql<{ id: string }>(`
    insert into users (email, name, passwordHash, role, managerId)
         values (${email}, ${name}, crypt('secret-pass', genSalt('bf', 4)), ${role}, ${managerId})
      returning id
  `).firstOrThrow().id;
}

/** A manager with two reports, each holding 10 vacation, 5 sick and 2 personal days. */
export function makeTeam(): Team {
  // Emails are unique, so a per-call suffix keeps test files running at once from colliding.
  let suffix = crypto.randomUUID().slice(0, 8);
  let managerEmail = `boss.${suffix}@test.dev`;
  let employeeEmail = `emp.${suffix}@test.dev`;
  let managerId = person(managerEmail, "Bea Boss", "manager", null);
  let employeeId = person(employeeEmail, "Eli Employee", "employee", managerId);
  let otherId = person(`other.${suffix}@test.dev`, "Ola Other", "employee", managerId);

  for (let id of [employeeId, otherId]) {
    sql(`
      insert into balances (userId, type, allowanceDays)
           values (${id}, 'vacation', 10), (${id}, 'sick', 5), (${id}, 'personal', 2)
    `);
  }

  return { managerId, employeeId, otherId, managerEmail, employeeEmail };
}

export function signInAs(userId: string) {
  let u = sql<{ name: string; role: "employee" | "manager" }>(`select name, role from users where id = ${userId}`).firstOrThrow();
  session.login({ userId, userName: u.name, role: u.role });
}
