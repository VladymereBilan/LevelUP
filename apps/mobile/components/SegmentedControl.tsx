import { Pressable, Text, View } from "react-native";
import { colors, fontSizes, fonts } from "../theme/tokens";

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Sits one level above the filter pills a panel may have of its own (Challenges'
 * Active/Upcoming/Completed), so it reads as a filled track rather than a row of
 * outlined chips — the two controls have to be distinguishable at a glance when
 * they stack.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View
      style={{
        flexDirection: "row",
        padding: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "rgba(11,11,20,0.7)",
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 9,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? "rgba(124,58,237,0.22)" : "transparent",
              borderWidth: 1,
              borderColor: selected ? "rgba(167,139,250,0.45)" : "transparent",
            }}
          >
            <Text
              style={{
                color: selected ? colors.text : colors.muted,
                fontSize: fontSizes.caption,
                fontFamily: selected ? fonts.bodySemiBold : fonts.body,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
