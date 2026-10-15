import { conflictingCategoryName, type CategoryRow } from "./categories";

function category(id: string, name: string): CategoryRow {
  return {
    id,
    user_id: "user-1",
    name,
    color: "#7C3AED",
    icon: "dumbbell",
    stat: "STR",
    created_at: "2026-01-01T00:00:00Z",
  };
}

const CATEGORIES = [category("a", "Gym"), category("b", "Gym"), category("c", "Study")];

describe("conflictingCategoryName", () => {
  it("lets a category keep its own name", () => {
    // The rename that has to work: two rows both called "Gym", and saving one unchanged
    // must not be blocked by the other, nor by itself.
    expect(conflictingCategoryName(CATEGORIES, "a", "Gym")?.id).toBe("b");
    expect(conflictingCategoryName([category("a", "Gym")], "a", "Gym")).toBeUndefined();
  });

  it("frees the name up once the duplicate is renamed", () => {
    const renamed = [category("a", "Gym"), category("b", "Calisthenics"), category("c", "Study")];

    expect(conflictingCategoryName(renamed, "a", "Gym")).toBeUndefined();
    expect(conflictingCategoryName(renamed, "b", "Calisthenics")).toBeUndefined();
  });

  it("reports which existing category holds the name", () => {
    expect(conflictingCategoryName(CATEGORIES, "a", "Study")?.id).toBe("c");
  });

  it("ignores case and surrounding whitespace", () => {
    expect(conflictingCategoryName(CATEGORIES, "a", "  sTuDy ")?.id).toBe("c");
  });

  it("allows a name nobody is using", () => {
    expect(conflictingCategoryName(CATEGORIES, "a", "Mobility")).toBeUndefined();
  });
});
