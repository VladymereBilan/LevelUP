import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Icon } from "./Icon";
import { colors, fontSizes, fonts } from "../theme/tokens";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  testID?: string;
}

/** Two decimal places is as fine as any target here gets: distance is the only fractional
 * one, and it is entered in kilometres over a metre-resolution store. */
function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Turns what was typed into a value to keep, or falls back.
 *
 * Clamping belongs here, on commit, rather than on each keystroke: a steps target has a
 * minimum of 500, and clamping per character would rewrite "5" to "500" before "50" could
 * ever be reached. Same reason an empty field is the previous value and not the minimum.
 */
export function commitStepperText(
  text: string,
  options: { min: number; max: number; allowDecimal: boolean; fallback: number },
): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return options.fallback;
  if (!/^\d*\.?\d*$/.test(trimmed)) return options.fallback;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return options.fallback;

  const rounded = options.allowDecimal ? roundTo2(parsed) : Math.round(parsed);
  return Math.min(options.max, Math.max(options.min, rounded));
}

/**
 * A numeric control that can be typed into as well as nudged.
 *
 * It used to be +/- only, on the reasoning that a form should never need the system keyboard.
 * That holds for a nudge and breaks down for a target: reaching 10,000 steps at 500 a tap is
 * twenty taps, and the keyboard is the faster, more obvious tool. The buttons stay for small
 * adjustments.
 *
 * While the field has focus it shows exactly what was typed, so a half-finished "1." or a
 * briefly-empty field isn't fought by the clamp. The value is committed on blur.
 */
export function Stepper({ value, onChange, min, max, step = 1, suffix, testID }: StepperProps) {
  const allowDecimal = !Number.isInteger(step) || !Number.isInteger(min);
  // Null means "not being typed into", so an outside change (switching metric type resets
  // the target) shows immediately, while a half-typed entry is left alone.
  const [draft, setDraft] = useState<string | null>(null);

  const atMin = value <= min;
  const atMax = value >= max;
  const shown = draft ?? String(value);

  function nudge(delta: number) {
    const next = allowDecimal
      ? roundTo2(Math.min(max, Math.max(min, value + delta)))
      : Math.min(max, Math.max(min, value + delta));
    setDraft(null);
    onChange(next);
  }

  function commit() {
    const next = commitStepperText(shown, { min, max, allowDecimal, fallback: value });
    setDraft(null);
    if (next !== value) onChange(next);
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 }}>
      <Pressable
        testID={testID ? `${testID}-minus` : undefined}
        onPress={() => nudge(-step)}
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

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <TextInput
          {...(testID === undefined ? {} : { testID })}
          value={shown}
          onChangeText={setDraft}
          onBlur={commit}
          onEndEditing={commit}
          selectTextOnFocus
          keyboardType={allowDecimal ? "decimal-pad" : "number-pad"}
          returnKeyType="done"
          style={{
            minWidth: 56,
            flexShrink: 1,
            minHeight: 44,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            backgroundColor: "rgba(11,11,20,0.5)",
            color: colors.text,
            fontFamily: fonts.displaySemiBold,
            fontSize: 18,
            textAlign: "center",
          }}
        />
        {suffix ? (
          <Text style={{ color: colors.muted, fontSize: fontSizes.label }}>{suffix}</Text>
        ) : null}
      </View>

      <Pressable
        testID={testID ? `${testID}-plus` : undefined}
        onPress={() => nudge(step)}
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
