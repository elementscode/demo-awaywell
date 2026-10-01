![Awaywell, a time off app built with Elements: the team calendar for October, with vacation, sick and personal days in different colors and pending requests striped.](https://elements.dev/demos/01a0f3a8-3881-7fd5-9f2e-8272c870a636/poster?v=2a795814a221)

# Awaywell

> A demo app built with [Elements](https://elements.dev).

Request time off, approve it with a comment, track balances by type, and see who is out on a live team calendar with .ics feeds.

**Demo:** [Awaywell](https://elements.dev/demos/01a0f3a8-3881-7fd5-9f2e-8272c870a636)

## Agent specs

What one run of the prompt below took, from an empty Elements project to this
app.

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 14 min
- **Cost:** $5.08 at API rates, September 2026

## Get started

```bash
elements create awaywell -scaffold=elementscode/demo-awaywell
```

## How it's built

Awaywell needed two kinds of accounts, emails on both sides of a request, a calendar feed per person, and a live team calendar. Each of those is a part of Elements, so the agent spent its 14 minutes on the time off rules themselves.

### What Elements gave the app

- **Live pages from one channel.** `requestEvents` in `app/shared/services/timeoff.ts` is a Channel that every write notifies. The home, approvals and calendar pages each listen filtered to their own person or team, then re-read through an rpc such as `fetchTeamMonth`, so a manager's calendar fills in as requests arrive.
- **Server calls as function calls.** `submitRequest`, `cancelRequest` and `decideRequest` are `@rpc` functions called straight from the page. A `ValidationError` returns field messages such as "those dates are all weekend" to the form.
- **Background email.** `NotifyRequestJob` in `app/jobs/notify-request.ts` emails the manager when a request comes in and the employee when it is decided. The rpc schedules it inside its transaction, so mail goes out for committed requests.
- **A calendar feed in one route.** `app/routes/feed.ts` answers `/feed/:token.ics` with a person's approved time off, and a manager's feed carries their team. The private token in the url is the credential, so calendar apps can subscribe.
- **Sessions and roles.** `app/shared/services/auth.ts` holds `currentManagerOrThrow` for rpcs and `personForPage`, which sends someone on the wrong page to their own home.
- **Data from SQL files.** Three migrations define the schema, a `workingDays` function that counts weekdays for both the rpc and the seed, and two managers with ten reports, their balances and about forty requests in every status. The project server applied each migration as soon as it was saved.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 24 tests pass. Every page works on desktop and phone, and live updates arrive across sessions, such as an approval turning a request solid on a manager's open calendar.

Start in `app/shared/services/timeoff.ts`.

## Demo accounts

The seed creates two managers with five reports each, a balance per type for
every employee (vacation, sick and personal), and about forty requests across
this month and next in every status: approved, pending, denied and cancelled.
The dates are set relative to the current month, so the calendar is always
current. Every account's password is `awaywell`, and the sign-in page lists
them.

| Email                  | Role     | Manager      |
| ---------------------- | -------- | ------------ |
| maya@awaywell.test     | manager  |              |
| priya@awaywell.test    | employee | Maya Okafor  |
| sam@awaywell.test      | employee | Maya Okafor  |
| lena@awaywell.test     | employee | Maya Okafor  |
| omar@awaywell.test     | employee | Maya Okafor  |
| jules@awaywell.test    | employee | Maya Okafor  |
| daniel@awaywell.test   | manager  |              |
| aiko@awaywell.test     | employee | Daniel Reyes |
| marcus@awaywell.test   | employee | Daniel Reyes |
| noor@awaywell.test     | employee | Daniel Reyes |
| theo@awaywell.test     | employee | Daniel Reyes |
| rosa@awaywell.test     | employee | Daniel Reyes |

In development the emails for new, approved and denied requests are written to
the job log instead of sent.

## The prompt

```text
Build a time off app named awaywell for a company of about twenty people.

Two kinds of accounts: employee and manager. Each employee has one manager.

EMPLOYEE
- Request time off: type (vacation, sick, personal), dates, a note.
- See their balance per type, and their requests with status.
- Cancel a pending request.

MANAGER
- Approve or deny their reports' requests with a comment.
- Team calendar: a month view of who is out, colored by type.

Everyone gets an email when a request is approved or denied, and managers get
one when a request comes in. Each person has a private calendar feed url
(.ics) of approved time off to subscribe to in their calendar app.

Seed two managers, ten employees, balances, and requests across this month and
next in every status. Show the seeded logins on the sign-in page.

New requests and approvals update the calendar in real time.
```

## License

MIT. See [LICENSE](LICENSE).
