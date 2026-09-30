import { test, equal, assert } from "@elements/app";
import { buildCalendar } from "#app/routes/feed";

test("calendar feed", () => {
  let owner = { id: "u1", name: "Bea Boss", role: "manager" as const };
  let event = {
    id: "r1",
    userName: "Eli Employee",
    type: "vacation" as const,
    startDate: "2026-10-05",
    endDate: "2026-10-09",
    note: "Beach, sun; and a very long note that goes on long enough to need folding across lines",
    decidedAt: new Date("2026-09-20T12:00:00Z"),
    updatedAt: new Date("2026-09-20T12:00:00Z"),
  };

  let ics = buildCalendar(owner, [event]);
  let lines = ics.split("\r\n");

  test("all-day events end the day after the last day off", () => {
    assert(lines.includes("DTSTART;VALUE=DATE:20261005"), "start date");
    assert(lines.includes("DTEND;VALUE=DATE:20261010"), "exclusive end date");
    assert(lines.includes("DTSTAMP:20260920T120000Z"), "stamp");
  });

  test("a manager's feed names who is out", () => {
    assert(lines.includes("SUMMARY:Eli Employee · Vacation"), ics);
  });

  test("text is escaped and long lines fold at 75 octets", () => {
    assert(ics.includes("Beach\\, sun\; and"), "escaped");

    for (let line of lines) {
      assert(Buffer.byteLength(line, "utf8") <= 75, `line too long: ${line}`);
    }
  });

  test("the feed opens and closes a calendar with CRLF line endings", () => {
    equal(lines[0], "BEGIN:VCALENDAR");
    equal(lines[lines.length - 2], "END:VCALENDAR");
    equal(lines[lines.length - 1], "");
  });
});
