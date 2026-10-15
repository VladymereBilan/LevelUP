import { removalFor } from "./activities";

describe("removalFor", () => {
  it("offers delete for an activity that was never completed", () => {
    expect(removalFor(0)).toEqual({ kind: "delete" });
  });

  it("refuses delete as soon as there is history to lose", () => {
    // quests.activity_id is `on delete cascade`, so deleting here would take the completed
    // quests with it and retroactively shrink the streak calendar, the challenge counts and
    // the lifetime total, all of which are computed from the quests table.
    expect(removalFor(1)).toEqual({ kind: "archive-only", completedQuests: 1 });
    expect(removalFor(94)).toEqual({ kind: "archive-only", completedQuests: 94 });
  });

  it("reports the count back, so the UI can say what archiving protects", () => {
    const removal = removalFor(12);

    expect(removal.kind).toBe("archive-only");
    if (removal.kind === "archive-only") expect(removal.completedQuests).toBe(12);
  });
});
