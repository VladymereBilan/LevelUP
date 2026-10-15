import { render, screen, fireEvent } from "@testing-library/react-native";
import { ActivityForm, type ActivityFormValues } from "./ActivityForm";
import { MAX_MINUTES_TARGET } from "@levelup/engine";
import type { CategoryRow } from "../lib/categories";

const SATURDAY = 6;
const SUNDAY = 0;

const CATEGORY: CategoryRow = {
  id: "cat-1",
  user_id: "user-1",
  name: "Training",
  color: "#F97316",
  icon: "dumbbell",
  stat: "STR",
  created_at: "2026-01-01T00:00:00Z",
};

async function renderForm(initialValues?: Parameters<typeof ActivityForm>[0]["initialValues"]) {
  const onSubmit = jest.fn<void, [ActivityFormValues]>();
  await render(
    <ActivityForm
      categories={[CATEGORY]}
      allowNewCategory
      {...(initialValues === undefined ? {} : { initialValues })}
      streakDays={0}
      submitting={false}
      submitLabel="Save"
      error={null}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

/** The advanced section holds the schedule picker and starts collapsed in create mode. */
async function openAdvanced() {
  if (screen.queryByTestId("schedule-preset-daily")) return;
  await fireEvent.press(screen.getByText("Change"));
}

async function pick(preset: string) {
  await fireEvent.press(screen.getByTestId(`schedule-preset-${preset}`));
}

async function submit(name = "Bench press") {
  await fireEvent.changeText(screen.getByPlaceholderText("e.g. Morning Run"), name);
  await fireEvent.press(screen.getByText("Save"));
}

describe("ActivityForm target", () => {
  it("lets a minutes target be typed instead of tapped", async () => {
    const onSubmit = await renderForm();
    await openAdvanced();
    await fireEvent.press(screen.getByText("Minutes"));

    await fireEvent.changeText(screen.getByTestId("target-minutes"), "45");
    await fireEvent(screen.getByTestId("target-minutes"), "blur");
    await submit();

    expect(onSubmit.mock.calls[0]![0].target).toEqual({ type: "minutes", minutes: 45 });
  });

  it("reaches a big steps target in one entry rather than twenty taps", async () => {
    const onSubmit = await renderForm();
    await openAdvanced();
    await fireEvent.press(screen.getByText("Steps"));

    await fireEvent.changeText(screen.getByTestId("target-steps"), "10000");
    await fireEvent(screen.getByTestId("target-steps"), "blur");
    await submit();

    expect(onSubmit.mock.calls[0]![0].target).toEqual({ type: "steps", steps: 10000 });
  });

  it("takes a fractional distance in km and stores metres", async () => {
    const onSubmit = await renderForm();
    await openAdvanced();
    await fireEvent.press(screen.getByText("Distance"));

    await fireEvent.changeText(screen.getByTestId("target-distance"), "7.5");
    await fireEvent(screen.getByTestId("target-distance"), "blur");
    await submit();

    expect(onSubmit.mock.calls[0]![0].target).toEqual({ type: "distance", meters: 7500 });
  });

  it("types each part of a sets x reps target", async () => {
    const onSubmit = await renderForm();
    await openAdvanced();
    await fireEvent.press(screen.getByText("Sets x Reps"));

    await fireEvent.changeText(screen.getByTestId("target-sets"), "5");
    await fireEvent(screen.getByTestId("target-sets"), "blur");
    await fireEvent.changeText(screen.getByTestId("target-reps-per-set"), "12");
    await fireEvent(screen.getByTestId("target-reps-per-set"), "blur");
    await fireEvent.changeText(screen.getByTestId("target-weight"), "60");
    await fireEvent(screen.getByTestId("target-weight"), "blur");
    await submit();

    expect(onSubmit.mock.calls[0]![0].target).toEqual({
      type: "sets_reps_weight",
      sets: 5,
      reps: 12,
      weightKg: 60,
    });
  });

  it("refuses a target above the engine's safe ceiling", async () => {
    const onSubmit = await renderForm();
    await openAdvanced();
    await fireEvent.press(screen.getByText("Minutes"));

    await fireEvent.changeText(screen.getByTestId("target-minutes"), "99999");
    await fireEvent(screen.getByTestId("target-minutes"), "blur");
    await submit();

    const { minutes } = onSubmit.mock.calls[0]![0].target as { minutes: number };
    expect(minutes).toBeLessThanOrEqual(MAX_MINUTES_TARGET);
  });
});

describe("ActivityForm schedule", () => {
  it("offers Weekdays and Weekends as separate choices", async () => {
    await renderForm();
    await openAdvanced();

    expect(screen.getByTestId("schedule-preset-weekdays")).toBeTruthy();
    expect(screen.getByTestId("schedule-preset-weekends")).toBeTruthy();
    expect(screen.getByTestId("schedule-preset-custom")).toBeTruthy();
  });

  it("does not offer day chips under Weekdays, so Sat and Sun cannot be added to it", async () => {
    await renderForm();
    await openAdvanced();
    await pick("weekdays");

    // The reported bug: picking "Weekdays" presented all seven day chips, Saturday and
    // Sunday included, because the stored kind named "weekdays" really meant "chosen days".
    expect(screen.queryByTestId(`schedule-day-${SATURDAY}`)).toBeNull();
    expect(screen.queryByTestId(`schedule-day-${SUNDAY}`)).toBeNull();
  });

  it("submits Monday to Friday for Weekdays", async () => {
    const onSubmit = await renderForm();
    await openAdvanced();
    await pick("weekdays");
    await submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const { schedule } = onSubmit.mock.calls[0]![0];
    expect(schedule).toEqual({ kind: "weekdays", weekdays: [1, 2, 3, 4, 5] });
    expect(schedule.weekdays).not.toContain(SATURDAY);
    expect(schedule.weekdays).not.toContain(SUNDAY);
  });

  it("submits only Sat and Sun for Weekends", async () => {
    const onSubmit = await renderForm();
    await openAdvanced();
    await pick("weekends");
    await submit();

    expect(onSubmit.mock.calls[0]![0].schedule).toEqual({ kind: "weekdays", weekdays: [0, 6] });
  });

  it("still lets any combination be chosen deliberately, under Pick days", async () => {
    const onSubmit = await renderForm();
    await openAdvanced();
    await pick("custom");

    await fireEvent.press(screen.getByTestId(`schedule-day-${SATURDAY}`));
    await fireEvent.press(screen.getByTestId("schedule-day-3"));
    await submit();

    expect(onSubmit.mock.calls[0]![0].schedule).toEqual({ kind: "weekdays", weekdays: [3, 6] });
  });

  it("blocks submitting Pick days with nothing picked", async () => {
    const onSubmit = await renderForm();
    await openAdvanced();
    await pick("custom");
    await submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Pick at least one day.")).toBeTruthy();
  });

  it("reopens a saved Mon-to-Fri activity as Weekdays", async () => {
    await renderForm({
      categoryId: CATEGORY.id,
      name: "Bench press",
      metricType: "reps",
      target: { type: "reps", reps: 10 },
      schedule: { kind: "weekdays", weekdays: [1, 2, 3, 4, 5] },
      difficulty: "normal",
      notes: null,
    });

    expect(screen.getByTestId("schedule-preset-weekdays").props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.queryByTestId(`schedule-day-${SATURDAY}`)).toBeNull();
  });
});
