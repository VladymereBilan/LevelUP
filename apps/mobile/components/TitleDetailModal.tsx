import { Modal, Pressable, Text, View } from "react-native";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { describeTitleUnlockRule, titleIcon, type TitleDisplay } from "../lib/titles";
import { colors, fontSizes, fonts } from "../theme/tokens";

interface TitleDetailModalProps {
  title: TitleDisplay | null;
  isEquipped: boolean;
  submitting: boolean;
  onEquip: () => void;
  onUnequip: () => void;
  onClose: () => void;
}

/** Tap-to-detail for a Stats-tab title card: name, description, unlocked/locked state, and —
 * only once unlocked — an equip/unequip action. Matches QuestCompleteModal's dark-overlay +
 * elevated-card styling. */
export function TitleDetailModal({
  title,
  isEquipped,
  submitting,
  onEquip,
  onUnequip,
  onClose,
}: TitleDetailModalProps) {
  if (!title) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(7,7,13,0.88)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 320,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.elevated,
            padding: 22,
            gap: 12,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(124,58,237,0.14)",
            }}
          >
            <Icon name={titleIcon(title.unlockRule)} size={24} color={colors.violetLight} />
          </View>

          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.displaySemiBold,
              fontSize: fontSizes.heading,
              textAlign: "center",
            }}
          >
            {title.name}
          </Text>

          {title.description ? (
            <Text style={{ color: colors.muted, fontSize: fontSizes.caption, textAlign: "center" }}>
              {title.description}
            </Text>
          ) : null}

          <Text
            style={{
              color: title.unlocked ? colors.success : colors.disabled,
              fontSize: fontSizes.label,
              fontWeight: "700",
              letterSpacing: 1,
              marginTop: 2,
            }}
          >
            {title.unlocked ? "UNLOCKED" : "LOCKED"}
          </Text>
          {!title.unlocked ? (
            <Text style={{ color: colors.muted, fontSize: fontSizes.label, textAlign: "center" }}>
              {describeTitleUnlockRule(title.unlockRule)}
            </Text>
          ) : isEquipped ? (
            <Text
              style={{ color: colors.violetLight, fontSize: fontSizes.label, textAlign: "center" }}
            >
              Currently equipped
            </Text>
          ) : null}

          <View style={{ width: "100%", gap: 10, marginTop: 10 }}>
            {title.unlocked ? (
              isEquipped ? (
                <Button variant="secondary" onPress={onUnequip} loading={submitting}>
                  Unequip
                </Button>
              ) : (
                <Button onPress={onEquip} loading={submitting}>
                  Equip Title
                </Button>
              )
            ) : null}
            <Button variant="ghost" onPress={onClose}>
              Close
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
