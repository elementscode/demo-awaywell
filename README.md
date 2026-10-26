![Time off requests, approvals and balances, built by Claude Code on Elements: the team calendar for October, with vacation, sick and personal days in different colors and pending requests striped.](https://elements.dev/demos/01a0f3a8-3881-7fd5-9f2e-8272c870a636/poster?v=2a795814a221)

# Time off requests, approvals and balances, built by Claude Code on Elements

> Awaywell is a full-stack app built with Claude Code on Elements.

Request time off, approve it with a comment, track balances by type, and see who is out on a live team calendar with .ics feeds.

[Run this app on your machine](https://elements.dev/demos/01a0f3a8-3881-7fd5-9f2e-8272c870a636). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

## How it's built

Awaywell needed two kinds of accounts, emails on both sides of a request, a calendar feed per person, and a live team calendar. Each of those is a part of Elements, so the agent spent its 14 minutes on the time off rules themselves.

- **A live team calendar.** Every request, cancellation and decision notifies a channel. A manager's calendar and approvals page, and an employee's own page, each listen for their team or person and re-read, so a new request or approval shows up on an open calendar right away.

- **Requests and approvals as function calls.** Requesting, cancelling, approving and denying are `@rpc` functions called from the page. The server counts working days, checks the balance and overlapping dates, and returns messages such as "those dates are all weekend" to the form.

- **Emails from a job.** A background job emails the manager when a request comes in and the employee when it is decided, using two email templates. It is scheduled in the same transaction as the request, so mail follows committed changes.

- **A calendar feed per person.** One route serves each person's approved time off as an .ics feed at a private url, and a manager's feed includes their team, so it subscribes in any calendar app.

- **Sessions and roles.** Employees and managers each land on their own pages, and manager-only server calls share one guard.

- **Data from SQL files.** Migrations define the schema, a working-days function used by both the app and the seed, and two managers with ten reports, balances and about forty requests in every status. The project server applied each one as soon as it was saved.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
