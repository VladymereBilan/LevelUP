import { Pressable, Text, View } from "react-native";
import { Icon } from "./Icon";
import { colors, fontSizes, fonts } from "../theme/tokens";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

/** A +/- numeric control, matching the detail screen's reps/sets stepper (quests/[id].tsx) —
 * reused here for target/weekday-offset inputs so a form never needs the system keyboard. */
export function Stepper({ value, onChange, min, max, step = 1, suffix }: StepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={atMin}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          opacity: atMin ? 0.4 : 1,
        }}
      >
        <Icon name="minus" size={16} color={colors.muted} />
      </Pressable>
      <Text
        style={{
          color: colors.text,
          fontFamily: fonts.displaySemiBold,
          fontSize: 18,
          minWidth: 56,
          textAlign: "center",
        }}
      >
        {value}
        {suffix ? (
          <Text style={{ color: colors.muted, fontSize: fontSizes.label }}> {suffix}</Text>
        ) : null}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={atMax}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          opacity: atMax ? 0.4 : 1,
        }}
      >
        <Icon name="plus" size={16} color={colors.violetLight} />
      </Pressable>
    </View>
  );
}
