import { Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { colors, fontSizes, fonts } from "../theme/tokens";

interface NotificationBannerProps {
  icon: IconName;
  iconColor: string;
  title: string;
  message: string;
  timestamp: string;
  unread?: boolean;
}

/** A single notification row: icon chip, title, message, relative timestamp, and an unread dot. */
export function NotificationBanner({
  icon,
  iconColor,
  title,
  message,
  timestamp,
  unread,
}: NotificationBannerProps) {
  return (
    <View
      className="mb-2.5 min-h-[44px] flex-row items-start gap-3 rounded-2xl border p-3.5"
      style={{ borderColor: colors.border, backgroundColor: "rgba(27,27,47,0.75)" }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${iconColor}22` }}
      >
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-center justify-between">
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.bodySemiBold,
              fontSize: fontSizes.caption,
            }}
          >
            {title}
          </Text>
          {unread ? (
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: colors.violetLight }}
            />
          ) : null}
        </View>
        <Text style={{ color: colors.muted, fontSize: fontSizes.label, lineHeight: 15 }}>
          {message}
        </Text>
        <Text style={{ color: colors.disabled, fontSize: fontSizes.label }}>{timestamp}</Text>
      </View>
    </View>
  );
}
