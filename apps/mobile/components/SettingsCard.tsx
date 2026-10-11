import type { ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { colors, fonts } from "../theme/tokens";

/** The rounded, bordered card every settings section sits in (Profile's Settings rows,
 * the Notifications sub-screen). */
export function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "rgba(27,27,47,0.62)",
        padding: 16,
        gap: 14,
      }}
    >
      {children}
    </View>
  );
}

interface SettingsToggleRowProps {
  icon?: IconName;
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}

/** A label (+ optional subtitle) with a trailing Switch — "Daily quest reminder", "Dark theme". */
export function SettingsToggleRow({
  icon,
  label,
  subtitle,
  value,
  onChange,
}: SettingsToggleRowProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {icon ? <Icon name={icon} size={17} color={colors.violetLight} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bodySemiBold }}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 1 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.disabled, true: colors.violet }}
        thumbColor={colors.text}
      />
    </View>
  );
}

interface SettingsNavRowProps {
  icon: IconName;
  label: string;
  subtitle?: string;
  onPress: () => void;
}

/** A label (+ optional subtitle) with a trailing chevron, navigating or opening a link —
 * "Notifications", "Health Connect sync", "Privacy Policy". */
export function SettingsNavRow({ icon, label, subtitle, onPress }: SettingsNavRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2 }}
    >
      <Icon name={icon} size={17} color={colors.violetLight} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bodySemiBold }}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 1 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Icon name="arrow" size={14} color={colors.muted} />
    </Pressable>
  );
}
