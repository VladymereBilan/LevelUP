import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  calcQuestXp,
  isSafeActivityTarget,
  MAX_DISTANCE_METERS,
  MAX_MINUTES_TARGET,
  MAX_REPS_TARGET,
  MAX_SETS_TARGET,
  MAX_STEPS_TARGET,
  MAX_WEIGHT_KG,
  STATS,
  getLocalDateString,
  type ActivityTarget,
  type Difficulty,
  type MetricType,
  type Schedule,
  type Stat,
} from "@levelup/engine";
import { Chip, Swatch } from "./Chip";
import type { IconName } from "./Icon";
import { Stepper } from "./Stepper";
import { Button } from "./Button";
import type { CategoryRow, CreateCategoryInput } from "../lib/categories";
import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  getCategoryIcon,
  bestCaseSourceForMetric,
} from "../lib/questFormat";
import { colors, fontSizes, fonts, statLabels } from "../theme/tokens";

const METRIC_OPTIONS: { value: MetricType; label: string }[] = [
  { value: "checkbox", label: "Checkbox" },
  { value: "minutes", label: "Minutes" },
  { value: "reps", label: "Reps" },
  { value: "sets_reps_weight", label: "Sets x Reps" },
  { value: "distance", label: "Distance" },
  { value: "steps", label: "Steps" },
];

const SCHEDULE_OPTIONS: { value: Schedule["kind"]; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "one_off", label: "One-time" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Hard" },
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function defaultTargetFor(metricType: MetricType): ActivityTarget {
  switch (metricType) {
    case "checkbox":
      return { type: "checkbox" };
    case "minutes":
      return { type: "minutes", minutes: 20 };
    case "reps":
      return { type: "reps", reps: 10 };
    case "sets_reps_weight":
      return { type: "sets_reps_weight", sets: 3, reps: 10 };
    case "distance":
      return { type: "distance", meters: 2000 };
    case "steps":
      return { type: "steps", steps: 5000 };
  }
}

/** Whole-day difference between two YYYY-MM-DD strings, computed at UTC noon so DST
 * transitions in between never shift the result by a day. */
function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T12:00:00Z`).getTime();
  const to = new Date(`${toIso}T12:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

const DEVICE_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

function todayLocalDate(): string {
  return getLocalDateString(new Date(), DEVICE_TIMEZONE);
}

function offsetFromToday(days: number): string {
  return getLocalDateString(new Date(Date.now() + days * 86_400_000), DEVICE_TIMEZONE);
}

export interface ActivityFormInitialValues {
  categoryId: string;
  name: string;
  metricType: MetricType;
  target: ActivityTarget;
  schedule: Schedule;
  difficulty: Difficulty;
}

export type ActivityFormCategorySelection =
  { kind: "existing"; categoryId: string } | { kind: "new"; input: CreateCategoryInput };

export interface ActivityFormValues {
  category: ActivityFormCategorySelection;
  name: string;
  metricType: MetricType;
  target: ActivityTarget;
  schedule: Schedule;
  difficulty: Difficulty;
}

interface ActivityFormProps {
  categories: CategoryRow[];
  /** Create-mode offers "or create a new category"; edit mode only lets the user re-pick
   * among their existing categories, to keep editing a single activity's scope tight. */
  allowNewCategory: boolean;
  initialValues?: ActivityFormInitialValues;
  /** The signed-in user's current streak, for the difficulty XP preview — fed through the
   * same difficulty/source/streak math the Quests tab previews with and the completion
   * route awards by, so the number here is what the quest will actually pay out. */
  streakDays: number;
  submitting: boolean;
  submitLabel: string;
  error: string | null;
  onSubmit: (values: ActivityFormValues) => void;
}

const SCHEDULE_SUMMARY: Record<Schedule["kind"], string> = {
  daily: "Every day",
  weekdays: "Chosen weekdays",
  one_off: "One-off",
};

/** One short phrase for the collapsed summary: what the player will actually do, rather than
 * the metric type's internal name. */
function summarizeTarget(target: ActivityTarget): string {
  switch (target.type) {
    case "checkbox":
      return "Tick when done";
    case "minutes":
      return `${target.minutes} min`;
    case "reps":
      return `${target.reps} reps`;
    case "sets_reps_weight":
      return `${target.sets} x ${target.reps}`;
    case "distance":
      return `${(target.meters / 1000).toFixed(target.meters % 1000 === 0 ? 0 : 1)} km`;
    case "steps":
      return `${target.steps} steps`;
  }
}

function label(text: string) {
  return (
    <Text
      style={{
        color: colors.muted,
        fontSize: fontSizes.label,
        fontWeight: "700",
        letterSpacing: 1.2,
      }}
    >
      {text}
    </Text>
  );
}

function fieldError(text: string | null) {
  if (!text) return null;
  return <Text style={{ color: colors.danger, fontSize: fontSizes.label }}>{text}</Text>;
}

export function ActivityForm({
  categories,
  allowNewCategory,
  initialValues,
  streakDays,
  submitting,
  submitLabel,
  error,
  onSubmit,
}: ActivityFormProps) {
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">(
    initialValues || categories.length > 0 ? "existing" : "new",
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialValues?.categoryId ?? categories[0]?.id ?? null,
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<IconName>(
    CATEGORY_ICON_OPTIONS[0] ?? "sparkles",
  );
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLOR_OPTIONS[0] ?? "#7C3AED");
  const [newCategoryStat, setNewCategoryStat] = useState<Stat>("STR");

  const [name, setName] = useState(initialValues?.name ?? "");
  const [metricType, setMetricType] = useState<MetricType>(initialValues?.metricType ?? "checkbox");
  const [target, setTarget] = useState<ActivityTarget>(
    initialValues?.target ?? defaultTargetFor("checkbox"),
  );
  const [scheduleKind, setScheduleKind] = useState<Schedule["kind"]>(
    initialValues?.schedule.kind ?? "daily",
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    initialValues?.schedule.kind === "weekdays" ? [...(initialValues.schedule.weekdays ?? [])] : [],
  );
  const [oneOffOffset, setOneOffOffset] = useState(
    initialValues?.schedule.kind === "one_off" && initialValues.schedule.date
      ? Math.max(0, daysBetween(todayLocalDate(), initialValues.schedule.date))
      : 0,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(initialValues?.difficulty ?? "normal");
  // Creating an activity asks two questions and defaults the other four. Metric type, target,
  // schedule and difficulty are the difference between "I want to track running" and filling in
  // a form, and each has a defensible default. Editing opens expanded: someone who came here to
  // change a detail should not have to go looking for it first.
  const [showAdvanced, setShowAdvanced] = useState(initialValues !== undefined);

  function changeMetricType(next: MetricType) {
    setMetricType(next);
    setTarget(defaultTargetFor(next));
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  }

  const nameError = name.trim().length === 0 ? "Activity name is required." : null;

  const categoryError =
    categoryMode === "existing"
      ? selectedCategoryId === null
        ? "Choose a category."
        : null
      : newCategoryName.trim().length === 0
        ? "Category name is required."
        : null;

  const targetValid = isSafeActivityTarget(target);
  const targetError = targetValid
    ? null
    : target.type === "minutes"
      ? `Minutes must be between 1 and ${MAX_MINUTES_TARGET}.`
      : target.type === "reps"
        ? `Reps must be between 1 and ${MAX_REPS_TARGET}.`
        : target.type === "sets_reps_weight"
          ? `Sets (1-${MAX_SETS_TARGET}), reps (1-${MAX_REPS_TARGET}), and weight (0-${MAX_WEIGHT_KG}kg) must be in range.`
          : target.type === "distance"
            ? `Distance must be between 1 and ${MAX_DISTANCE_METERS / 1000} km.`
            : target.type === "steps"
              ? `Steps must be between 1 and ${MAX_STEPS_TARGET}.`
              : null;

  const scheduleError =
    scheduleKind === "weekdays" && weekdays.length === 0 ? "Pick at least one day." : null;

  const canSubmit = !submitting && !nameError && !categoryError && targetValid && !scheduleError;

  const xpPreview = useMemo(
    () => calcQuestXp({ difficulty, source: bestCaseSourceForMetric(metricType), streakDays }),
    [difficulty, metricType, streakDays],
  );

  const defaultsSummary = [
    SCHEDULE_SUMMARY[scheduleKind],
    DIFFICULTY_OPTIONS.find((option) => option.value === difficulty)?.label ?? difficulty,
    summarizeTarget(target),
  ].join("  ·  ");

  function buildSchedule(): Schedule {
    if (scheduleKind === "daily") return { kind: "daily" };
    if (scheduleKind === "weekdays") return { kind: "weekdays", weekdays };
    return { kind: "one_off", date: offsetFromToday(oneOffOffset) };
  }

  function handleSubmit() {
    if (!canSubmit) return;

    const category: ActivityFormCategorySelection =
      categoryMode === "existing"
        ? { kind: "existing", categoryId: selectedCategoryId as string }
        : {
            kind: "new",
            input: {
              name: newCategoryName.trim(),
              color: newCategoryColor,
              icon: newCategoryIcon,
              stat: newCategoryStat,
            },
          };

    onSubmit({
      category,
      name: name.trim(),
      metricType,
      target,
      schedule: buildSchedule(),
      difficulty,
    });
  }

  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 10 }}>
        {label("CATEGORY")}
        {allowNewCategory && categories.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip
              label="Existing"
              selected={categoryMode === "existing"}
              onPress={() => setCategoryMode("existing")}
            />
            <Chip
              label="New category"
              selected={categoryMode === "new"}
              onPress={() => setCategoryMode("new")}
            />
          </View>
        ) : null}

        {categoryMode === "existing" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                icon={getCategoryIcon(category.icon)}
                tint={category.color}
                selected={selectedCategoryId === category.id}
                onPress={() => setSelectedCategoryId(category.id)}
              />
            ))}
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="e.g. Strength"
              placeholderTextColor={colors.disabled}
              maxLength={40}
              style={{
                minHeight: 48,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "rgba(18,18,31,0.75)",
                color: colors.text,
                paddingHorizontal: 14,
                fontSize: 14,
              }}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CATEGORY_ICON_OPTIONS.map((icon) => (
                <Chip
                  key={icon}
                  label={icon}
                  icon={icon}
                  selected={newCategoryIcon === icon}
                  onPress={() => setNewCategoryIcon(icon)}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {CATEGORY_COLOR_OPTIONS.map((color) => (
                <Swatch
                  key={color}
                  color={color}
                  selected={newCategoryColor === color}
                  onPress={() => setNewCategoryColor(color)}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {STATS.map((stat) => (
                <Chip
                  key={stat}
                  label={statLabels[stat]}
                  selected={newCategoryStat === stat}
                  onPress={() => setNewCategoryStat(stat)}
                />
              ))}
            </View>
          </View>
        )}
        {fieldError(categoryError)}
      </View>

      <View style={{ gap: 10 }}>
        {label("ACTIVITY NAME")}
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Morning Run"
          placeholderTextColor={colors.disabled}
          maxLength={60}
          style={{
            minHeight: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "rgba(18,18,31,0.75)",
            color: colors.text,
            paddingHorizontal: 14,
            fontSize: 14,
          }}
        />
        {fieldError(nameError)}
      </View>

      {showAdvanced ? (
        <>
          <View style={{ gap: 10 }}>
            {label("METRIC TYPE")}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {METRIC_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={metricType === option.value}
                  onPress={() => changeMetricType(option.value)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {label("TARGET")}
            {target.type === "checkbox" ? (
              <Text style={{ color: colors.muted, fontSize: fontSizes.caption }}>
                Just mark it done — no target.
              </Text>
            ) : target.type === "minutes" ? (
              <Stepper
                value={target.minutes}
                min={1}
                max={MAX_MINUTES_TARGET}
                suffix="min"
                onChange={(minutes) => setTarget({ type: "minutes", minutes })}
              />
            ) : target.type === "reps" ? (
              <Stepper
                value={target.reps}
                min={1}
                max={MAX_REPS_TARGET}
                suffix="reps"
                onChange={(reps) => setTarget({ type: "reps", reps })}
              />
            ) : target.type === "distance" ? (
              <Stepper
                value={target.meters / 1000}
                min={0.5}
                max={MAX_DISTANCE_METERS / 1000}
                step={0.5}
                suffix="km"
                onChange={(km) => setTarget({ type: "distance", meters: Math.round(km * 1000) })}
              />
            ) : target.type === "steps" ? (
              <Stepper
                value={target.steps}
                min={500}
                max={MAX_STEPS_TARGET}
                step={500}
                suffix="steps"
                onChange={(steps) => setTarget({ type: "steps", steps })}
              />
            ) : (
              <View style={{ gap: 16 }}>
                <View style={{ gap: 6 }}>
                  <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>Sets</Text>
                  <Stepper
                    value={target.sets}
                    min={1}
                    max={MAX_SETS_TARGET}
                    onChange={(sets) => setTarget({ ...target, sets })}
                  />
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
                    Reps per set
                  </Text>
                  <Stepper
                    value={target.reps}
                    min={1}
                    max={MAX_REPS_TARGET}
                    onChange={(reps) => setTarget({ ...target, reps })}
                  />
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
                    Weight (kg, optional)
                  </Text>
                  <Stepper
                    value={target.weightKg ?? 0}
                    min={0}
                    max={MAX_WEIGHT_KG}
                    step={5}
                    suffix="kg"
                    onChange={(weightKg) =>
                      setTarget({
                        type: "sets_reps_weight",
                        sets: target.sets,
                        reps: target.reps,
                        ...(weightKg === 0 ? {} : { weightKg }),
                      })
                    }
                  />
                </View>
              </View>
            )}
            {fieldError(targetError)}
          </View>

          <View style={{ gap: 10 }}>
            {label("SCHEDULE")}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SCHEDULE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={scheduleKind === option.value}
                  onPress={() => setScheduleKind(option.value)}
                />
              ))}
            </View>
            {scheduleKind === "weekdays" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {WEEKDAY_LABELS.map((dayLabel, day) => (
                  <Chip
                    key={day}
                    label={dayLabel}
                    selected={weekdays.includes(day)}
                    onPress={() => toggleWeekday(day)}
                  />
                ))}
              </View>
            ) : null}
            {scheduleKind === "one_off" ? (
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
                  Days from today
                </Text>
                <Stepper value={oneOffOffset} min={0} max={365} onChange={setOneOffOffset} />
                <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
                  {offsetFromToday(oneOffOffset)}
                </Text>
              </View>
            ) : null}
            {fieldError(scheduleError)}
          </View>

          <View style={{ gap: 10 }}>
            {label("DIFFICULTY")}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {DIFFICULTY_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={difficulty === option.value}
                  onPress={() => setDifficulty(option.value)}
                />
              ))}
            </View>
            <Text
              style={{
                color: colors.violetLight,
                fontFamily: fonts.displaySemiBold,
                fontSize: fontSizes.body,
              }}
            >
              +{xpPreview} XP per completion
            </Text>
          </View>
        </>
      ) : (
        <Pressable
          onPress={() => setShowAdvanced(true)}
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: "rgba(18,18,31,0.6)",
          }}
        >
          <View style={{ flex: 1, gap: 3 }}>
            {label("SET UP AS")}
            <Text style={{ color: colors.text, fontSize: fontSizes.body }}>{defaultsSummary}</Text>
            <Text style={{ color: colors.violetLight, fontSize: fontSizes.label, marginTop: 2 }}>
              +{xpPreview} XP per completion
            </Text>
          </View>
          <Text
            style={{
              color: colors.violetLight,
              fontFamily: fonts.bodySemiBold,
              fontSize: fontSizes.caption,
            }}
          >
            Change
          </Text>
        </Pressable>
      )}

      {error ? (
        <Text style={{ color: colors.danger, fontSize: fontSizes.caption }}>{error}</Text>
      ) : null}

      <Button icon="check" onPress={handleSubmit} disabled={!canSubmit} loading={submitting}>
        {submitLabel}
      </Button>
    </View>
  );
}
