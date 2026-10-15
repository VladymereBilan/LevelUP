import { render, screen } from "@testing-library/react-native";
import { QuestCard } from "./QuestCard";
import { colors } from "../theme/tokens";

const ORANGE = "#F97316";

const BASE = {
  title: "Bench press",
  progressLabel: "0 / 10 reps",
  percent: 0,
  xp: 45,
  difficulty: "normal" as const,
  icon: "dumbbell" as const,
};

describe("QuestCard tint", () => {
  it("colours the icon and spine with the category's own colour", async () => {
    await render(<QuestCard {...BASE} tint={ORANGE} />);

    // The reported bug: a category is created with a colour the user picks, and the board
    // tinted every quest the same violet, so the choice only showed in the picker.
    expect(screen.getByTestId("quest-card-icon").props.stroke).toBe(ORANGE);
    expect(screen.getByTestId("quest-card-spine").props.style.backgroundColor).toBe(ORANGE);
  });

  it("washes the icon well with the same colour rather than a fixed violet", async () => {
    await render(<QuestCard {...BASE} tint={ORANGE} />);

    expect(screen.getByTestId("quest-card-icon-well").props.style.backgroundColor).toBe(
      `${ORANGE}22`,
    );
  });

  it("gives two categories two different colours", async () => {
    const view = await render(<QuestCard {...BASE} tint={ORANGE} />);
    const first = screen.getByTestId("quest-card-icon").props.stroke;

    await view.rerender(<QuestCard {...BASE} tint="#3B82F6" />);
    const second = screen.getByTestId("quest-card-icon").props.stroke;

    expect(first).not.toBe(second);
  });

  it("falls back to the theme violet when a category has no colour", async () => {
    await render(<QuestCard {...BASE} />);

    expect(screen.getByTestId("quest-card-icon").props.stroke).toBe(colors.violetLight);
  });

  it("keeps the completed state green, whatever the category colour is", async () => {
    await render(<QuestCard {...BASE} tint={ORANGE} complete />);

    expect(screen.getByTestId("quest-card-icon").props.stroke).toBe(colors.success);
    expect(screen.getByTestId("quest-card-spine").props.style.backgroundColor).toBe(colors.success);
  });

  it("does not try to build a wash from a non-hex colour", async () => {
    await render(<QuestCard {...BASE} tint="rebeccapurple" />);

    const well = screen.getByTestId("quest-card-icon-well").props.style.backgroundColor;
    expect(well).not.toContain("rebeccapurple22");
  });
});
