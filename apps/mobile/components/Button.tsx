import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon, type IconName } from "./Icon";
import { colors, fonts, gradient } from "../theme/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost" | "google" | "danger";

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
}

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: colors.text,
  secondary: colors.violetLight,
  ghost: colors.muted,
  google: "#13131E",
  danger: colors.danger,
};

/** Primary (gradient), secondary (tinted outline), ghost (text-only), and google (OAuth pill) button styles. */
export function Button({
  children,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;
  const textColor = TEXT_COLOR[variant];

  const content = (
    <View
      className="min-h-[52px] w-full flex-row items-center justify-center gap-2.5 rounded-2xl px-5"
      style={pressed ? { opacity: 0.88, transform: [{ scale: 0.975 }] } : undefined}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? (
            <Icon name={icon} size={18} color={variant === "google" ? "#4285F4" : textColor} />
          ) : null}
          <Text style={{ color: textColor, fontFamily: fonts.bodyBold, fontSize: 13 }}>
            {children}
          </Text>
          {variant === "primary" ? <Icon name="arrow" size={17} color={textColor} /> : null}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      style={{ opacity: isDisabled ? 0.6 : 1, width: "100%" }}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={{
            borderRadius: 16,
            shadowColor: colors.violet,
            shadowOpacity: 0.27,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }}
        >
          {content}
        </LinearGradient>
      ) : variant === "secondary" ? (
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(167,139,250,0.35)",
            backgroundColor: "rgba(124,58,237,0.08)",
          }}
        >
          {content}
        </View>
      ) : variant === "google" ? (
        <View
          style={{
            borderRadius: 16,
            backgroundColor: colors.text,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 12 },
            elevation: 4,
          }}
        >
          {content}
        </View>
      ) : variant === "danger" ? (
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.4)",
            backgroundColor: "rgba(239,68,68,0.08)",
          }}
        >
          {content}
        </View>
      ) : (
        <View style={{ borderRadius: 16, backgroundColor: "transparent" }}>{content}</View>
      )}
    </Pressable>
  );
}
