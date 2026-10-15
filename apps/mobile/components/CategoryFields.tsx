import { Text, TextInput, View } from "react-native";
import { STATS, type Stat } from "@levelup/engine";
import { Chip, Swatch } from "./Chip";
import type { IconName } from "./Icon";
import { CATEGORY_COLOR_OPTIONS, CATEGORY_ICON_OPTIONS } from "../lib/questFormat";
import { colors, fontSizes, statLabels } from "../theme/tokens";

export interface CategoryFieldValues {
  name: string;
  icon: IconName;
  color: string;
  stat: Stat;
}

interface CategoryFieldsProps {
  values: CategoryFieldValues;
  onChange: (values: CategoryFieldValues) => void;
  /** Editing an existing category says so, because changing the stat only moves where future
   * completions are credited; nothing already earned is reassigned. */
  showStatWarning?: boolean;
}

/**
 * The four fields a category has, shared by the inline create flow in `ActivityForm` and the
 * edit screen. Extracted rather than duplicated so the two cannot drift: a colour or icon
 * offered in one place and missing in the other would look like data loss on save.
 */
export function CategoryFields({ values, onChange, showStatWarning }: CategoryFieldsProps) {
  function set<K extends keyof CategoryFieldValues>(key: K, value: CategoryFieldValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <View style={{ gap: 14 }}>
      <TextInput
        testID="category-name"
        value={values.name}
        onChangeText={(name) => set("name", name)}
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
          fontSize: fontSizes.body,
        }}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {CATEGORY_ICON_OPTIONS.map((icon) => (
          <Chip
            key={icon}
            testID={`category-icon-${icon}`}
            label={icon}
            icon={icon}
            selected={values.icon === icon}
            onPress={() => set("icon", icon)}
          />
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {CATEGORY_COLOR_OPTIONS.map((color) => (
          <Swatch
            key={color}
            color={color}
            selected={values.color === color}
            onPress={() => set("color", color)}
          />
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {STATS.map((stat) => (
          <Chip
            key={stat}
            testID={`category-stat-${stat}`}
            label={statLabels[stat]}
            selected={values.stat === stat}
            onPress={() => set("stat", stat)}
          />
        ))}
      </View>

      {showStatWarning ? (
        <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>
          Changing the stat only affects quests you complete from now on. XP and stats you have
          already earned stay where they are.
        </Text>
      ) : null}
    </View>
  );
}
