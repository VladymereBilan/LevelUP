import { describe, expect, it } from "vitest";
import { isSafeActivityTarget } from "../activityTargets";
import { GYM_STARTER_TEMPLATE, STARTER_TEMPLATES, STUDENT_TEMPLATE } from "../templates";

describe("starter templates", () => {
  it("ships exactly Gym Starter and Student", () => {
    expect(STARTER_TEMPLATES).toHaveLength(2);
    expect(STARTER_TEMPLATES.map((t) => t.name)).toEqual(["Gym Starter", "Student"]);
  });

  for (const template of [GYM_STARTER_TEMPLATE, STUDENT_TEMPLATE]) {
    describe(template.name, () => {
      it("has at least one category and one activity", () => {
        expect(template.categories.length).toBeGreaterThan(0);
        expect(template.activities.length).toBeGreaterThan(0);
      });

      it("every activity references a category that exists in the same template", () => {
        const categoryIds = new Set(template.categories.map((c) => c.id));
        for (const activity of template.activities) {
          expect(categoryIds.has(activity.categoryId)).toBe(true);
        }
      });

      it("every activity target is within the safe caps", () => {
        for (const activity of template.activities) {
          expect(isSafeActivityTarget(activity.target)).toBe(true);
        }
      });

      it("every id is unique within the template", () => {
        const ids = [
          ...template.categories.map((c) => c.id),
          ...template.activities.map((a) => a.id),
        ];
        expect(new Set(ids).size).toBe(ids.length);
      });
    });
  }
});
