import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { deleteAccount, DELETE_ACCOUNT_CONFIRMATION_PHRASE } from "../lib/account";
import { colors, fonts } from "../theme/tokens";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface DeleteAccountSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** The confirmation sheet behind Profile's "Delete my account" — requires typing DELETE
 * before the destructive button becomes pressable. Signing out and local cleanup (scheduled
 * notifications, cached preferences) happen inside deleteAccount() itself, after the server
 * confirms deletion; the root navigator's session guard then swaps to the auth stack on its
 * own, the same way the existing "Sign out" button already works. */
export function DeleteAccountSheet({ visible, onClose }: DeleteAccountSheetProps) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmText === DELETE_ACCOUNT_CONFIRMATION_PHRASE && !deleting;

  function handleClose() {
    if (deleting) return;
    setConfirmText("");
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount(confirmText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete your account.");
      setDeleting(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={{ gap: 16, paddingBottom: 8 }}>
        <View style={{ alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(239,68,68,0.12)",
            }}
          >
            <Icon name="warning" size={22} color={colors.danger} />
          </View>
          <Text style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 17 }}>
            Delete your account?
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
            This permanently deletes your account and everything in it — level, XP, stats, streaks,
            categories, activities, quests, and titles. This cannot be undone.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1.2 }}>
            TYPE {DELETE_ACCOUNT_CONFIRMATION_PHRASE} TO CONFIRM
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={DELETE_ACCOUNT_CONFIRMATION_PHRASE}
            placeholderTextColor={colors.disabled}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
            style={{
              minHeight: 52,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "rgba(18,18,31,0.75)",
              color: colors.text,
              paddingHorizontal: 16,
              fontSize: 15,
            }}
          />
        </View>

        {error ? (
          <Text style={{ color: colors.danger, fontSize: 12, textAlign: "center" }}>{error}</Text>
        ) : null}

        <Button
          variant="danger"
          icon="trash"
          disabled={!canConfirm}
          loading={deleting}
          onPress={() => void handleConfirm()}
        >
          Permanently delete my account
        </Button>
        <Button variant="ghost" disabled={deleting} onPress={handleClose}>
          Cancel
        </Button>
      </View>
    </BottomSheet>
  );
}
