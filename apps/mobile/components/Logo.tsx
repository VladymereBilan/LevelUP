import { Text, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, gradient } from "../theme/tokens";

interface LogoProps {
  compact?: boolean;
}

/** The "LEVEL UP" wordmark, with "UP" masked by the brand gradient. */
export function Logo({ compact = false }: LogoProps) {
  const fontSize = compact ? 15 : 42;
  const textStyle = {
    fontFamily: fonts.displayBold,
    fontSize,
    letterSpacing: -fontSize * 0.055,
  };

  return (
    <View className="flex-row items-baseline">
      <Text style={[textStyle, { color: colors.text }]}>LEVEL </Text>
      <MaskedView maskElement={<Text style={textStyle}>UP</Text>}>
        <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end}>
          <Text style={[textStyle, { opacity: 0 }]}>UP</Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
}
