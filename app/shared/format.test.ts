import { test, equal } from "@elements/app";
import { workingDaysBetween, formatRange, formatDays, shiftMonth, addDays } from "#app/shared/format";

test("format", () => {
  test("working days skip weekends", () => {
    equal(workingDaysBetween("2026-10-09", "2026-10-13"), 3);
    equal(workingDaysBetween("2026-10-10", "2026-10-11"), 0);
    equal(workingDaysBetween("2026-10-05", "2026-10-05"), 1);
    equal(workingDaysBetween("2026-10-05", "2026-10-01"), 0);
  });

  test("ranges and counts read naturally", () => {
    equal(formatRange("2026-10-05", "2026-10-05"), "Mon, Oct 5");
    equal(formatRange("2026-10-05", "2026-10-09"), "Mon, Oct 5 – Fri, Oct 9");
    equal(formatDays(1), "1 day");
    equal(formatDays(2.5), "2.5 days");
  });

  test("month and day arithmetic crosses boundaries", () => {
    equal(shiftMonth("2026-12", 1), "2027-01");
    equal(shiftMonth("2026-01", -1), "2025-12");
    equal(addDays("2026-10-31", 1), "2026-11-01");
  });
});
