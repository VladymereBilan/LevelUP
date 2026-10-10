import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../theme/tokens";

export type IconName =
  | "arrow"
  | "bell"
  | "book"
  | "calendar"
  | "check"
  | "clock"
  | "code"
  | "dumbbell"
  | "edit"
  | "flame"
  | "focus"
  | "google"
  | "home"
  | "logout"
  | "minus"
  | "moon"
  | "plus"
  | "pause"
  | "play"
  | "profile"
  | "quest"
  | "shield"
  | "sparkles"
  | "stats"
  | "trophy";

type IconElement =
  { type: "path"; d: string } | { type: "circle"; cx: number; cy: number; r: number };

const ICON_ELEMENTS: Record<IconName, IconElement[]> = {
  arrow: [{ type: "path", d: "m9 18 6-6-6-6" }],
  bell: [
    { type: "path", d: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" },
    { type: "path", d: "M10 21h4" },
  ],
  book: [
    { type: "path", d: "M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 2V5Z" },
    { type: "path", d: "M20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 2V5Z" },
  ],
  calendar: [
    { type: "path", d: "M5 3v3M19 3v3M4 8h16M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z" },
  ],
  check: [{ type: "path", d: "m5 12 4 4L19 6" }],
  clock: [
    { type: "circle", cx: 12, cy: 12, r: 9 },
    { type: "path", d: "M12 7v5l3 2" },
  ],
  code: [{ type: "path", d: "m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" }],
  dumbbell: [{ type: "path", d: "M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" }],
  edit: [{ type: "path", d: "m14 4 6 6M4 20l3-1 12-12-3-3L4 16v4Z" }],
  flame: [
    {
      type: "path",
      d: "M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-2 4-3 5 0-4-2-7-4-9 0 5-3 7-3 12 0 5 3 8 8 8Z",
    },
  ],
  focus: [
    { type: "circle", cx: 12, cy: 12, r: 7 },
    { type: "circle", cx: 12, cy: 12, r: 2 },
    { type: "path", d: "M12 2v3M12 19v3M2 12h3M19 12h3" },
  ],
  google: [
    {
      type: "path",
      d: "M21 12.2c0-.7-.1-1.4-.2-2H12v3.7h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7Z",
    },
    {
      type: "path",
      d: "M12 21c2.6 0 4.8-.9 6.3-2.3l-3.1-2.4c-.9.6-2 1-3.2 1a5.5 5.5 0 0 1-5.2-3.8H3.6V16A9.5 9.5 0 0 0 12 21Z",
    },
    { type: "path", d: "M6.8 13.5a5.7 5.7 0 0 1 0-3.6V7.4H3.6a9.5 9.5 0 0 0 0 8.6l3.2-2.5Z" },
    {
      type: "path",
      d: "M12 6.1c1.4 0 2.7.5 3.7 1.5l2.8-2.7A9.4 9.4 0 0 0 3.6 7.4l3.2 2.5A5.5 5.5 0 0 1 12 6.1Z",
    },
  ],
  home: [
    { type: "path", d: "m3 10 9-7 9 7" },
    { type: "path", d: "M5 9v11h14V9M9 20v-6h6v6" },
  ],
  logout: [{ type: "path", d: "M10 5H5v14h5M14 8l4 4-4 4M8 12h10" }],
  minus: [{ type: "path", d: "M5 12h14" }],
  moon: [{ type: "path", d: "M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" }],
  plus: [{ type: "path", d: "M12 5v14M5 12h14" }],
  pause: [{ type: "path", d: "M9 5v14M15 5v14" }],
  play: [{ type: "path", d: "m8 5 11 7-11 7V5Z" }],
  profile: [
    { type: "circle", cx: 12, cy: 8, r: 4 },
    { type: "path", d: "M4 21a8 8 0 0 1 16 0" },
  ],
  quest: [
    { type: "path", d: "M7 3h10l3 4v13H4V7l3-4Z" },
    { type: "path", d: "M8 11h8M8 15h5M9 3v4h6V3" },
  ],
  shield: [
    { type: "path", d: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" },
    { type: "path", d: "m9 12 2 2 4-5" },
  ],
  sparkles: [
    { type: "path", d: "m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" },
    { type: "path", d: "m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" },
  ],
  stats: [
    { type: "path", d: "M5 20V10M12 20V4M19 20v-7" },
    { type: "path", d: "M2 20h20" },
  ],
  trophy: [
    { type: "path", d: "M8 4h8v3a4 4 0 0 1-8 0V4Z" },
    { type: "path", d: "M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 11v5M8 20h8M9 16h6" },
  ],
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/** A fixed set of hand-redrawn vector icons, shared across the app. */
export function Icon({ name, size = 20, color = colors.text }: IconProps) {
  const filled = name === "google";
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={filled ? "none" : color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_ELEMENTS[name].map((element, index) =>
        element.type === "circle" ? (
          <Circle key={index} cx={element.cx} cy={element.cy} r={element.r} />
        ) : (
          <Path key={index} d={element.d} />
        ),
      )}
    </Svg>
  );
}
