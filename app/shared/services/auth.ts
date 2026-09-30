import { sql, session, AuthError, ForbiddenError, redirect } from "@elements/app";

export type Role = "employee" | "manager";

export interface Person {
  id: string;
  email: string;
  name: string;
  role: Role;
  managerId: string | null;
  feedToken: string;
}

export interface DemoLogin {
  id: string;
  email: string;
  name: string;
  role: Role;
  team: string;
}

export const DEMO_PASSWORD = "awaywell";

export function findPerson(id: string): Person | undefined {
  return sql<Person>(`
    select id, email, name, role, managerId, feedToken
      from users
     where id = ${id}
  `).first();
}

export function currentPersonOrThrow(): Person {
  session.isLoggedInOrThrow();

  let person = findPerson(session.getOrThrow("userId"));
  if (!person) {
    throw new AuthError("sign in again");
  }

  return person;
}

export function currentManagerOrThrow(): Person {
  let person = currentPersonOrThrow();
  if (person.role !== "manager") {
    throw new ForbiddenError("managers only");
  }

  return person;
}

/**
 * For page routes: a visitor who is not signed in goes to /signin rather
 * than seeing a 401, and one with the wrong role goes to their own home.
 */
export function personForPage(role: Role): Person | undefined {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let person = findPerson(session.getOrThrow("userId"));
  if (!person) {
    session.logout();
    redirect("/signin");
    return;
  }

  if (person.role !== role) {
    redirect(homeFor(person.role));
    return;
  }

  return person;
}

export function homeFor(role: Role): string {
  return role === "manager" ? "/approvals" : "/";
}

export function demoLogins(): DemoLogin[] {
  return sql<DemoLogin>(`
    select u.id, u.email, u.name, u.role, coalesce(m.name, u.name) as team
      from users u
      left join users m on m.id = u.managerId
     where u.email like '%@awaywell.test'
     order by coalesce(m.name, u.name), u.role desc, u.name
  `).all();
}

/** @rpc */
export function signin(email: string, password: string): string {
  let address = email.trim().toLowerCase();

  if (!address || !password) {
    throw new AuthError("enter your email and password");
  }

  let user = sql<{ id: string; name: string; role: Role }>(`
    select id, name, role
      from users
     where email = ${address}
       and passwordHash = crypt(${password}, passwordHash)
  `).first();

  if (!user) {
    throw new AuthError("invalid email or password");
  }

  session.login({ userId: user.id, userName: user.name, role: user.role });

  return homeFor(user.role);
}

/** @rpc */
export function signout() {
  session.logout();
}
