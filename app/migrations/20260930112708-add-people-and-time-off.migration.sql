-- add people and time off

create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create type userRole as enum ('employee', 'manager');
create type timeOffType as enum ('vacation', 'sick', 'personal');
create type requestStatus as enum ('pending', 'approved', 'denied', 'cancelled');

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  name text not null,
  passwordHash text not null,
  role userRole not null default 'employee',
  managerId uuid references users(id) on delete set null,
  -- the secret in the private .ics url; rotating it revokes old subscriptions
  feedToken text not null unique default encode(gen_random_bytes(18), 'hex'),
  check (role = 'manager' or managerId is not null)
);

create index usersManagerIdIdx on users (managerId);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

create table balances (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid not null references users(id) on delete cascade,
  type timeOffType not null,
  allowanceDays numeric(5, 1) not null check (allowanceDays >= 0),
  unique (userId, type)
);

create trigger balancesTouchUpdatedAt
  before update on balances
  for each row execute function touchUpdatedAt();

create table requests (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid not null references users(id) on delete cascade,
  -- copied from the requester at submit time, so a request stays with the
  -- manager who was asked even if the reporting line changes later
  managerId uuid not null references users(id),
  type timeOffType not null,
  startDate date not null,
  endDate date not null,
  days numeric(5, 1) not null check (days > 0),
  note text not null default '',
  status requestStatus not null default 'pending',
  decisionComment text not null default '',
  decidedAt timestamptz,
  check (endDate >= startDate)
);

create index requestsUserIdIdx on requests (userId, startDate);
create index requestsManagerIdIdx on requests (managerId, startDate);

create trigger requestsTouchUpdatedAt
  before update on requests
  for each row execute function touchUpdatedAt();

-- weekdays between two dates, inclusive; what a request costs against a balance
create or replace function workingDays(fromDate date, toDate date)
returns integer
language sql
immutable
as $$
  select count(*)::int
    from generate_series(fromDate, toDate, interval '1 day') d
   where extract(isodow from d) < 6;
$$;
