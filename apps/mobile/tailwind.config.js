/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#07070D",
        background: "#0B0B14",
        surface: "#12121F",
        elevated: "#1B1B2F",
        violet: "#7C3AED",
        "violet-light": "#A78BFA",
        blue: "#3B82F6",
        "blue-light": "#60A5FA",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        text: "#F8FAFC",
        muted: "#94A3B8",
        disabled: "#475569",
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
        display: ["SpaceGrotesk_500Medium"],
        "display-semibold": ["SpaceGrotesk_600SemiBold"],
        "display-bold": ["SpaceGrotesk_700Bold"],
      },
    },
  },
  plugins: [],
};
