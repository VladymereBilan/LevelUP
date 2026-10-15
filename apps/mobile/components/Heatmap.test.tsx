import { render, screen, fireEvent } from "@testing-library/react-native";
import { Heatmap, heatmapCellSize } from "./Heatmap";
import type { StreakCalendar } from "../lib/statsProgress";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** What `getStreakCalendar` is called with — asserting against the shipped value is the
 * point, since the bug was a grid that didn't fill at the column count actually used. */
const SHIPPED_WEEKS = 13;

/** Width a phone actually gives this chart: a ~390pt screen, less the screen's 20pt padding
 * each side and the card's own 16pt each side. */
const REAL_CARD_WIDTH = 318;

const ROW_LABEL_WIDTH = 14;
const GAP = 4;

function widthUsedBy(weeks: number, cell: number): number {
  return ROW_LABEL_WIDTH + GAP + weeks * cell + (weeks - 1) * GAP;
}

function calendarOf(weeks: number): StreakCalendar {
  return {
    rows: WEEKDAY_LABELS.map((_, weekday) =>
      Array.from({ length: weeks }, (_, week) =>
        week === weeks - 1 && weekday < 3
          ? { date: "2026-10-14", count: 1, level: 2 as const }
          : null,
      ),
    ),
    weekdayLabels: WEEKDAY_LABELS,
    firstDate: "2026-07-19",
    maxCount: 3,
  };
}

async function layout(width: number) {
  // Must be awaited: an un-awaited fireEvent leaves overlapping act() scopes, which corrupts
  // every later test in the file rather than failing this one.
  await fireEvent(screen.getByTestId("heatmap"), "layout", {
    nativeEvent: { layout: { width, height: 200, x: 0, y: 0 } },
  });
}

describe("heatmapCellSize", () => {
  it("spans the card at the column count the app ships", () => {
    const used = widthUsedBy(SHIPPED_WEEKS, heatmapCellSize(REAL_CARD_WIDTH, SHIPPED_WEEKS));

    expect(used).toBeLessThanOrEqual(REAL_CARD_WIDTH);
    // The regression being guarded: hardcoded 14pt squares used 248 of 318pt and read as a
    // chart that had been cut off partway across its card.
    expect(used).toBeGreaterThan(REAL_CARD_WIDTH * 0.9);
  });

  it("never overflows its container at any column count", () => {
    for (const weeks of [1, 5, 9, 13, 17, 26]) {
      expect(widthUsedBy(weeks, heatmapCellSize(REAL_CARD_WIDTH, weeks))).toBeLessThanOrEqual(
        REAL_CARD_WIDTH,
      );
    }
  });

  it("grows the squares as the container grows", () => {
    expect(heatmapCellSize(200, SHIPPED_WEEKS)).toBeLessThan(
      heatmapCellSize(REAL_CARD_WIDTH, SHIPPED_WEEKS),
    );
  });

  it("stays positive on a degenerate container instead of collapsing", () => {
    expect(heatmapCellSize(0, SHIPPED_WEEKS)).toBeGreaterThan(0);
    expect(heatmapCellSize(-50, SHIPPED_WEEKS)).toBeGreaterThan(0);
    expect(heatmapCellSize(REAL_CARD_WIDTH, 0)).toBeGreaterThan(0);
  });
});

describe("Heatmap", () => {
  it("draws one cell per weekday per week", async () => {
    await render(<Heatmap calendar={calendarOf(SHIPPED_WEEKS)} />);

    expect(screen.getByTestId("heatmap-cell-0-0")).toBeTruthy();
    expect(screen.getByTestId("heatmap-cell-6-12")).toBeTruthy();
    expect(screen.queryByTestId("heatmap-cell-6-13")).toBeNull();
  });

  it("sizes its cells from the measured container", async () => {
    await render(<Heatmap calendar={calendarOf(SHIPPED_WEEKS)} />);

    await layout(REAL_CARD_WIDTH);
    const wide = screen.getByTestId("heatmap-cell-0-0").props.style.width;

    await layout(160);
    const narrow = screen.getByTestId("heatmap-cell-0-0").props.style.width;

    expect(wide).toBeGreaterThan(narrow);
    expect(narrow).toBeGreaterThan(0);
    expect(widthUsedBy(SHIPPED_WEEKS, wide)).toBeLessThanOrEqual(REAL_CARD_WIDTH);
  });

  it("keeps the row of squares inside the card it is measured against", async () => {
    await render(<Heatmap calendar={calendarOf(SHIPPED_WEEKS)} />);
    await layout(REAL_CARD_WIDTH);

    const cells = Array.from({ length: SHIPPED_WEEKS }, (_, week) =>
      Number(screen.getByTestId(`heatmap-cell-0-${week}`).props.style.width),
    );

    expect(new Set(cells).size).toBe(1);
    expect(widthUsedBy(SHIPPED_WEEKS, cells[0]!)).toBeGreaterThan(REAL_CARD_WIDTH * 0.9);
  });

  it("captions the window without an em dash", async () => {
    await render(<Heatmap calendar={calendarOf(SHIPPED_WEEKS)} />);

    expect(screen.getByText("JUL 19 TO TODAY")).toBeTruthy();
    expect(screen.queryByText(/—/)).toBeNull();
  });
});
