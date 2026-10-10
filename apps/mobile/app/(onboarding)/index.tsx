import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../components/Icon";
import { Button } from "../../components/Button";
import { Logo } from "../../components/Logo";
import { ApiError } from "../../lib/api";
import { setUsername, seedStarterTemplate, type StarterTemplateId } from "../../lib/onboarding";
import { useOnboarding } from "../../lib/OnboardingProvider";
import { colors, fonts } from "../../theme/tokens";

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

interface TemplateOption {
  id: StarterTemplateId | null;
  name: string;
  description: string;
  icon: IconName;
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: "tmpl-gym-starter",
    name: "Gym Starter",
    description: "Strength, cardio, and recovery quests.",
    icon: "dumbbell",
  },
  {
    id: "tmpl-student",
    name: "Student",
    description: "Study blocks and deep focus quests.",
    icon: "book",
  },
  {
    id: null,
    name: "Start from scratch",
    description: "No preset quests — build your own.",
    icon: "plus",
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useOnboarding();
  const [username, setUsernameInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<StarterTemplateId | null | undefined>(
    undefined,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameValid = USERNAME_PATTERN.test(username);
  const canSubmit = usernameValid && selectedTemplate !== undefined && !submitting;

  async function handleBegin() {
    if (!canSubmit || selectedTemplate === undefined) return;

    setSubmitting(true);
    setError(null);
    try {
      await setUsername(username);
      await seedStarterTemplate(selectedTemplate);
      completeOnboarding();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", gap: 8, marginTop: 12 }}>
          <Logo compact />
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>
            Let&apos;s set up your journey.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1.4 }}>
            WHAT SHOULD WE CALL YOU, HUNTER?
          </Text>
          <TextInput
            value={username}
            onChangeText={setUsernameInput}
            placeholder="hunter_name"
            placeholderTextColor={colors.disabled}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            style={{
              minHeight: 52,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: username.length > 0 && !usernameValid ? colors.danger : colors.border,
              backgroundColor: "rgba(18,18,31,0.75)",
              color: colors.text,
              paddingHorizontal: 16,
              fontSize: 15,
            }}
          />
          <Text style={{ color: colors.disabled, fontSize: 9 }}>
            3-20 characters: letters, numbers, or underscores.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1.4 }}>
            CHOOSE YOUR PATH
          </Text>
          <View style={{ gap: 10 }}>
            {TEMPLATE_OPTIONS.map((option) => {
              const selected = selectedTemplate === option.id;
              return (
                <Pressable
                  key={option.name}
                  onPress={() => setSelectedTemplate(option.id)}
                  style={{
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: selected ? "rgba(167,139,250,0.55)" : colors.border,
                    backgroundColor: selected ? "rgba(124,58,237,0.14)" : "rgba(27,27,47,0.62)",
                  }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 13,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(124,58,237,0.14)",
                    }}
                  >
                    <Icon name={option.icon} size={20} color={colors.violetLight} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{ color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 13 }}
                    >
                      {option.name}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>
                      {option.description}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 19,
                      height: 19,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: selected ? colors.violetLight : colors.disabled,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected ? (
                      <View
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 5,
                          backgroundColor: colors.violet,
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? (
          <Text style={{ color: colors.danger, fontSize: 12, textAlign: "center" }}>{error}</Text>
        ) : null}

        <Button onPress={() => void handleBegin()} disabled={!canSubmit} loading={submitting}>
          Begin my journey
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
