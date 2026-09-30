import { test, equal } from "@elements/app";
import { monthCells, outOn } from "./template";

test("calendar", () => {
  test("a month is whole Monday-to-Sunday weeks", () => {
    let cells = monthCells("2026-10", "2026-10-15");
    equal(cells.length, 35);
    equal(cells[0].day, "2026-09-28");
    equal(cells[cells.length - 1].day, "2026-11-01");
    equal(cells.filter((c) => c.inMonth).length, 31);
    equal(cells.filter((c) => c.isToday).map((c) => c.day), ["2026-10-15"]);
    equal(cells[5].isWeekend, true);
  });

  test("a request covers every day in its range", () => {
    let r = { startDate: "2026-10-05", endDate: "2026-10-07" } as any;
    equal(outOn("2026-10-04", [r]).length, 0);
    equal(outOn("2026-10-05", [r]).length, 1);
    equal(outOn("2026-10-07", [r]).length, 1);
    equal(outOn("2026-10-08", [r]).length, 0);
  });
});
