-- demo people and requests

-- every demo account signs in with the password "awaywell" (shown on /signin)
with pw as (select crypt('awaywell', genSalt('bf', 12)) as hash)
insert into users (email, name, passwordHash, role)
     select v.email, v.name, pw.hash, 'manager'
       from pw, (values
         ('maya@awaywell.test',   'Maya Okafor'),
         ('daniel@awaywell.test', 'Daniel Reyes')
       ) v(email, name);

insert into users (email, name, passwordHash, role, managerId)
     select v.email, v.name, m.passwordHash, 'employee', m.id
       from (values
         ('priya@awaywell.test',  'Priya Shah',     'maya@awaywell.test'),
         ('sam@awaywell.test',    'Sam Whitfield',  'maya@awaywell.test'),
         ('lena@awaywell.test',   'Lena Novak',     'maya@awaywell.test'),
         ('omar@awaywell.test',   'Omar Haddad',    'maya@awaywell.test'),
         ('jules@awaywell.test',  'Jules Moreau',   'maya@awaywell.test'),
         ('aiko@awaywell.test',   'Aiko Tanaka',    'daniel@awaywell.test'),
         ('marcus@awaywell.test', 'Marcus Bell',    'daniel@awaywell.test'),
         ('noor@awaywell.test',   'Noor Rahman',    'daniel@awaywell.test'),
         ('theo@awaywell.test',   'Theo Lindqvist', 'daniel@awaywell.test'),
         ('rosa@awaywell.test',   'Rosa Jimenez',   'daniel@awaywell.test')
       ) v(email, name, managerEmail)
       join users m on m.email = v.managerEmail;

insert into balances (userId, type, allowanceDays)
     select u.id, t.type::timeOffType, t.days + case when t.type = 'vacation' and u.name < 'M' then 5 else 0 end
       from users u
 cross join (values ('vacation', 15), ('sick', 10), ('personal', 3)) t(type, days)
      where u.role = 'employee';

-- mon 0 is this month, 1 is next; day is the day of that month, moved off a
-- weekend so every request costs at least one working day
insert into requests (userId, managerId, type, startDate, endDate, days, note, status, decisionComment, createdAt, decidedAt)
     select u.id,
            u.managerId,
            v.type::timeOffType,
            s.d,
            s.d + v.len - 1,
            workingDays(s.d, s.d + v.len - 1),
            v.note,
            v.status::requestStatus,
            v.comment,
            least(now() - interval '1 hour', s.d - interval '12 days'),
            case when v.status in ('approved', 'denied')
                 then least(now() - interval '30 minutes', s.d - interval '10 days')
            end
       from (values
         ('priya@awaywell.test',  'vacation', 0,  8, 4, 'approved',  'Lake cabin with family',        ''),
         ('priya@awaywell.test',  'personal', 1, 20, 1, 'pending',   'Moving apartments',             ''),
         ('sam@awaywell.test',    'sick',     0, 15, 2, 'approved',  'Flu',                           'Feel better.'),
         ('sam@awaywell.test',    'personal', 0, 30, 1, 'pending',   'Afternoon appointment',         ''),
         ('sam@awaywell.test',    'vacation', 1, 12, 5, 'pending',   'Visiting my sister in Lisbon',  ''),
         ('lena@awaywell.test',   'vacation', 0, 22, 3, 'denied',    'Long weekend',                  'Launch week. Can we look at early October instead?'),
         ('lena@awaywell.test',   'vacation', 1,  5, 3, 'approved',  'Long weekend, rescheduled',     'Enjoy it.'),
         ('omar@awaywell.test',   'personal', 0, 29, 1, 'cancelled', 'Car inspection',                ''),
         ('omar@awaywell.test',   'vacation', 1, 19, 5, 'approved',  'Hiking in the Dolomites',       ''),
         ('jules@awaywell.test',  'sick',     1,  1, 1, 'approved',  'Dental surgery',                ''),
         ('jules@awaywell.test',  'vacation', 1, 26, 4, 'pending',   'Conference, then a few days',   ''),
         ('aiko@awaywell.test',   'vacation', 0,  1, 4, 'approved',  'Stretching the long weekend',   ''),
         ('aiko@awaywell.test',   'personal', 1,  9, 1, 'pending',   'School event',                  ''),
         ('marcus@awaywell.test', 'sick',     0, 24, 1, 'approved',  'Migraine',                      ''),
         ('marcus@awaywell.test', 'vacation', 1, 12, 5, 'approved',  'Wedding in Oaxaca',             'Congratulations!'),
         ('noor@awaywell.test',   'vacation', 0, 14, 5, 'approved',  'Family visit',                  ''),
         ('noor@awaywell.test',   'vacation', 1, 21, 3, 'denied',    'Short trip',                    'Rosa has asked for that week already. Could you shift it by one?'),
         ('theo@awaywell.test',   'personal', 1,  2, 1, 'cancelled', 'Plans changed',                 ''),
         ('theo@awaywell.test',   'vacation', 1, 15, 2, 'pending',   'Long weekend',                  ''),
         ('rosa@awaywell.test',   'sick',     0, 10, 1, 'approved',  'Doctor''s appointment',         ''),
         ('rosa@awaywell.test',   'vacation', 1, 22, 5, 'pending',   'Road trip up the coast',        '')
       ) v(email, type, mon, day, len, status, note, comment)
       join users u on u.email = v.email
 cross join lateral (
       select b.d + case extract(isodow from b.d) when 6 then 2 when 7 then 1 else 0 end as d
         from (select (date_trunc('month', current_date) + make_interval(months => v.mon))::date + v.day - 1 as d) b
     ) s;
