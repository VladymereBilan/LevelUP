import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { colors, fontSizes, fonts } from "../theme/tokens";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Overrides the selected-state tint (e.g. a category's own color, a stat's tone). */
  tint?: string;
}

/** A single selectable pill — used for category/metric/schedule/difficulty/icon pickers
 * across the Add/Edit Activity forms. Not a radio group itself; callers manage selection. */
export function Chip({ label, selected, onPress, icon, tint = colors.violet }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        minHeight: 40,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? `${tint}8C` : colors.border,
        backgroundColor: selected ? `${tint}24` : "rgba(27,27,47,0.62)",
      }}
    >
      {icon ? <Icon name={icon} size={14} color={selected ? tint : colors.muted} /> : null}
      <Text
        style={{
          color: selected ? colors.text : colors.muted,
          fontFamily: selected ? fonts.bodySemiBold : fonts.body,
          fontSize: fontSizes.caption,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface SwatchProps {
  color: string;
  selected: boolean;
  onPress: () => void;
}

/** A single color-swatch option for the new-category color picker. */
export function Swatch({ color, selected, onPress }: SwatchProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: color,
          borderWidth: selected ? 3 : 0,
          borderColor: colors.text,
        }}
      />
    </Pressable>
  );
}
