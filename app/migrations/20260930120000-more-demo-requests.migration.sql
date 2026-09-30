-- more demo requests, so both months of the team calendar look lived in
/** @env development */

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
         ('omar@awaywell.test',   'vacation', 0,  2, 3, 'approved',  'Friend''s wedding in Denver',   ''),
         ('lena@awaywell.test',   'personal', 0, 10, 1, 'approved',  'Jury duty',                     ''),
         ('jules@awaywell.test',  'vacation', 0, 16, 3, 'approved',  'Long weekend in Montreal',      'Have fun!'),
         ('priya@awaywell.test',  'sick',     0, 23, 2, 'approved',  'Bad cold',                      'Rest up.'),
         ('jules@awaywell.test',  'personal', 0, 28, 1, 'approved',  'Parent-teacher conference',     ''),
         ('lena@awaywell.test',   'sick',     0, 29, 1, 'approved',  'Stomach bug',                   ''),
         ('priya@awaywell.test',  'vacation', 1,  1, 2, 'approved',  'Apple picking upstate',         ''),
         ('omar@awaywell.test',   'personal', 1,  6, 1, 'pending',   'Passport appointment',          ''),
         ('omar@awaywell.test',   'sick',     1, 13, 1, 'approved',  'Minor knee surgery',            'Hope it goes smoothly.'),
         ('jules@awaywell.test',  'personal', 1,  8, 1, 'approved',  'Closing on the house',          'Good luck!'),
         ('lena@awaywell.test',   'vacation', 1, 14, 2, 'pending',   'Cousin''s wedding',             ''),
         ('priya@awaywell.test',  'vacation', 1, 27, 2, 'approved',  'Visiting my grandparents',      ''),
         ('theo@awaywell.test',   'vacation', 0,  7, 3, 'approved',  'Camping at the lake',           ''),
         ('marcus@awaywell.test', 'personal', 0, 11, 1, 'approved',  'Moving day',                    ''),
         ('aiko@awaywell.test',   'sick',     0, 17, 1, 'approved',  'Fever',                         'Take care.'),
         ('rosa@awaywell.test',   'vacation', 0, 21, 3, 'approved',  'Sister''s graduation',          'Congrats to her!'),
         ('noor@awaywell.test',   'personal', 0, 25, 1, 'approved',  'Volunteering day',              ''),
         ('theo@awaywell.test',   'sick',     0, 28, 2, 'approved',  'Sinus infection',               ''),
         ('rosa@awaywell.test',   'personal', 1,  2, 1, 'approved',  'Home repairs',                  ''),
         ('noor@awaywell.test',   'vacation', 1,  5, 3, 'approved',  'Family in Toronto',             ''),
         ('aiko@awaywell.test',   'vacation', 1, 19, 3, 'approved',  'Autumn leaves in Vermont',      ''),
         ('theo@awaywell.test',   'vacation', 1, 28, 3, 'pending',   'Halloween with the kids',       '')
       ) v(email, type, mon, day, len, status, note, comment)
       join users u on u.email = v.email
 cross join lateral (
       select b.d + case extract(isodow from b.d) when 6 then 2 when 7 then 1 else 0 end as d
         from (select (date_trunc('month', current_date) + make_interval(months => v.mon))::date + v.day - 1 as d) b
     ) s;
