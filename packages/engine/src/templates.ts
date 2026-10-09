import type { ActivityTemplate, CategoryTemplate, QuestTemplate } from "./types";

const GYM_STARTER_ID = "tmpl-gym-starter";

const gymCategories: CategoryTemplate[] = [
  {
    id: "cat-gym-strength",
    templateId: GYM_STARTER_ID,
    name: "Strength",
    color: "#7C3AED",
    icon: "dumbbell",
    stat: "STR",
  },
  {
    id: "cat-gym-cardio",
    templateId: GYM_STARTER_ID,
    name: "Cardio",
    color: "#3B82F6",
    icon: "run",
    stat: "AGI",
  },
  {
    id: "cat-gym-recovery",
    templateId: GYM_STARTER_ID,
    name: "Recovery",
    color: "#22C55E",
    icon: "moon",
    stat: "VIT",
  },
];

const gymActivities: ActivityTemplate[] = [
  {
    id: "act-gym-workout-session",
    templateId: GYM_STARTER_ID,
    categoryId: "cat-gym-strength",
    name: "Workout Session",
    metricType: "minutes",
    target: { type: "minutes", minutes: 45 },
    schedule: { kind: "weekdays", weekdays: [1, 3, 5] },
    difficulty: "normal",
  },
  {
    id: "act-gym-leg-day",
    templateId: GYM_STARTER_ID,
    categoryId: "cat-gym-strength",
    name: "Leg Day",
    metricType: "sets_reps_weight",
    target: { type: "sets_reps_weight", sets: 4, reps: 10, weightKg: 40 },
    schedule: { kind: "weekdays", weekdays: [2, 4] },
    difficulty: "hard",
  },
  {
    id: "act-gym-cardio-run",
    templateId: GYM_STARTER_ID,
    categoryId: "cat-gym-cardio",
    name: "Cardio Run",
    metricType: "minutes",
    target: { type: "minutes", minutes: 20 },
    schedule: { kind: "daily" },
    difficulty: "normal",
  },
  {
    id: "act-gym-stretch",
    templateId: GYM_STARTER_ID,
    categoryId: "cat-gym-recovery",
    name: "Stretch & Recover",
    metricType: "minutes",
    target: { type: "minutes", minutes: 15 },
    schedule: { kind: "daily" },
    difficulty: "easy",
  },
];

export const GYM_STARTER_TEMPLATE: QuestTemplate = {
  id: GYM_STARTER_ID,
  name: "Gym Starter",
  description: "A balanced strength, cardio, and recovery routine to build the gym habit.",
  categories: gymCategories,
  activities: gymActivities,
};

const STUDENT_ID = "tmpl-student";

const studentCategories: CategoryTemplate[] = [
  {
    id: "cat-student-study",
    templateId: STUDENT_ID,
    name: "Study",
    color: "#7C3AED",
    icon: "book",
    stat: "INT",
  },
  {
    id: "cat-student-focus",
    templateId: STUDENT_ID,
    name: "Deep Work",
    color: "#3B82F6",
    icon: "target",
    stat: "FOCUS",
  },
  {
    id: "cat-student-wellness",
    templateId: STUDENT_ID,
    name: "Wellness",
    color: "#22C55E",
    icon: "heart",
    stat: "VIT",
  },
];

const studentActivities: ActivityTemplate[] = [
  {
    id: "act-student-study-session",
    templateId: STUDENT_ID,
    categoryId: "cat-student-study",
    name: "Study Session",
    metricType: "minutes",
    target: { type: "minutes", minutes: 45 },
    schedule: { kind: "weekdays", weekdays: [1, 2, 3, 4, 5] },
    difficulty: "normal",
  },
  {
    id: "act-student-deep-focus",
    templateId: STUDENT_ID,
    categoryId: "cat-student-focus",
    name: "Deep Focus Block",
    metricType: "minutes",
    target: { type: "minutes", minutes: 25 },
    schedule: { kind: "daily" },
    difficulty: "normal",
  },
  {
    id: "act-student-read-chapter",
    templateId: STUDENT_ID,
    categoryId: "cat-student-study",
    name: "Read a Chapter",
    metricType: "checkbox",
    target: { type: "checkbox" },
    schedule: { kind: "daily" },
    difficulty: "easy",
  },
  {
    id: "act-student-lights-out",
    templateId: STUDENT_ID,
    categoryId: "cat-student-wellness",
    name: "Lights Out On Time",
    metricType: "checkbox",
    target: { type: "checkbox" },
    schedule: { kind: "daily" },
    difficulty: "easy",
  },
];

export const STUDENT_TEMPLATE: QuestTemplate = {
  id: STUDENT_ID,
  name: "Student",
  description: "Study blocks, deep focus time, and a wellness habit to keep school sustainable.",
  categories: studentCategories,
  activities: studentActivities,
};

export const STARTER_TEMPLATES: readonly QuestTemplate[] = [GYM_STARTER_TEMPLATE, STUDENT_TEMPLATE];
