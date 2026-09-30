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
