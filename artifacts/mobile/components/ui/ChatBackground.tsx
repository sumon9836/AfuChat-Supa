import React, { memo } from "react";
import { useWindowDimensions, View } from "react-native";

let _svgMod: any = null;
function getSvgMod() {
  if (_svgMod !== null) return _svgMod;
  try { _svgMod = require("react-native-svg"); } catch { _svgMod = {}; }
  return _svgMod;
}
function hasSvg(): boolean {
  const M = getSvgMod();
  return !!(M.default ?? M.Svg);
}
function makeSvgComp(name: string) {
  return (props: any) => {
    const M = getSvgMod();
    const C = M[name] ?? M.default?.[name];
    if (!C) return null;
    return require("react").createElement(C, props);
  };
}
const Svg = (props: any) => {
  const M = getSvgMod();
  const C = M.default ?? M.Svg;
  if (!C) return null;
  return require("react").createElement(C, props);
};
const Circle   = makeSvgComp("Circle");
const Ellipse  = makeSvgComp("Ellipse");
const Line     = makeSvgComp("Line");
const Path     = makeSvgComp("Path");
const Rect     = makeSvgComp("Rect");

const Guitar = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size * 0.6} height={size} viewBox="0 0 22 36">
    <Rect x="7" y="0" width="8" height="5" rx="2" fill={color} />
    <Circle cx="5.5" cy="1.5" r="1.5" fill={color} />
    <Circle cx="16.5" cy="1.5" r="1.5" fill={color} />
    <Circle cx="5.5" cy="4.5" r="1.5" fill={color} />
    <Circle cx="16.5" cy="4.5" r="1.5" fill={color} />
    <Rect x="7.5" y="4.5" width="7" height="1.5" rx="0.5" fill={color} />
    <Rect x="9" y="5.5" width="4" height="15" fill={color} />
    <Ellipse cx="11" cy="24" rx="6.5" ry="6" fill={color} />
    <Ellipse cx="11" cy="31" rx="9" ry="6.5" fill={color} />
    <Rect x="8" y="33" width="6" height="2" rx="1" fill={color} />
  </Svg>
);

const PianoKeys = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size * 1.4} height={size} viewBox="0 0 42 24">
    {([0, 8, 16, 24, 32] as const).map((x) => (
      <Rect key={x} x={x + 0.5} y="0" width="7" height="24" rx="2" stroke={color} strokeWidth="1.2" fill={color} />
    ))}
    {([5, 13, 28] as const).map((x) => (
      <Rect key={x} x={x} y="0" width="5.5" height="15" rx="1.5" fill={color} />
    ))}
  </Svg>
);

const Microphone = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size * 0.6} height={size} viewBox="0 0 20 34">
    <Rect x="5" y="1" width="10" height="16" rx="5" fill={color} />
    <Line x1="5" y1="6" x2="15" y2="6" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    <Line x1="5" y1="10" x2="15" y2="10" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    <Line x1="5" y1="14" x2="15" y2="14" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    <Path d="M4 15 Q3 20 10 22 Q17 20 16 15" fill="none" stroke={color} strokeWidth="2.5" />
    <Rect x="9" y="22" width="2" height="9" rx="1" fill={color} />
    <Rect x="4" y="30" width="12" height="3" rx="1.5" fill={color} />
  </Svg>
);

const Headphone = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size * 0.85} viewBox="0 0 32 28">
    <Path d="M4 14 C4 6 9 1 16 1 C23 1 28 6 28 14" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <Rect x="1" y="13" width="6" height="11" rx="3" fill={color} />
    <Rect x="25" y="13" width="6" height="11" rx="3" fill={color} />
  </Svg>
);

const Speaker = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28">
    <Path d="M2 10 L8 10 L16 3 L16 25 L8 18 L2 18 Z" fill={color} />
    <Path d="M18 10 C21 12 21 16 18 18" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M20 7 C25 11 25 17 20 21" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M22.5 4 C29 9 29 19 22.5 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const Waveform = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size * 1.4} height={size} viewBox="0 0 42 24">
    {([
      { x: 1,  h: 8,  y: 8 },
      { x: 6,  h: 14, y: 5 },
      { x: 11, h: 22, y: 1 },
      { x: 16, h: 16, y: 4 },
      { x: 21, h: 10, y: 7 },
      { x: 26, h: 20, y: 2 },
      { x: 31, h: 14, y: 5 },
      { x: 36, h: 8,  y: 8 },
    ] as const).map(({ x, h, y }) => (
      <Rect key={x} x={x} y={y} width="3.5" height={h} rx="1.75" fill={color} />
    ))}
  </Svg>
);

const Vinyl = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28">
    <Circle cx="14" cy="14" r="13" fill={color} />
    <Circle cx="14" cy="14" r="6" fill="rgba(0,0,0,0.18)" />
    <Circle cx="14" cy="14" r="2" fill="rgba(0,0,0,0.32)" />
    <Circle cx="14" cy="14" r="9.5" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="1" />
    <Circle cx="14" cy="14" r="11" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
  </Svg>
);

const MusicNote = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size * 0.7} height={size} viewBox="0 0 18 28">
    <Ellipse cx="6" cy="23" rx="5.5" ry="4.5" fill={color} transform="rotate(-15 6 23)" />
    <Rect x="10.5" y="4" width="3" height="20" rx="1.5" fill={color} />
    <Path d="M13.5 4 Q22 9 14 16" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

const DoubleMusicNote = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size * 1.2} height={size} viewBox="0 0 32 28">
    <Ellipse cx="6"  cy="23" rx="5.5" ry="4.5" fill={color} transform="rotate(-15 6 23)" />
    <Ellipse cx="22" cy="20" rx="5.5" ry="4.5" fill={color} transform="rotate(-15 22 20)" />
    <Rect x="10.5" y="5"  width="3" height="19" rx="1.5" fill={color} />
    <Rect x="26.5" y="2"  width="3" height="19" rx="1.5" fill={color} />
    <Path d="M10.5 5 L29.5 2 L29.5 7.5 L10.5 10.5 Z" fill={color} />
    <Path d="M10.5 11 L29.5 8 L29.5 13.5 L10.5 16.5 Z" fill={color} />
  </Svg>
);

const Drum = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size * 1.3} height={size * 0.9} viewBox="0 0 36 28">
    <Ellipse cx="18" cy="6" rx="16" ry="5" fill={color} />
    <Path d="M2 6 L2 20 Q18 26 34 20 L34 6" fill={color} />
    <Ellipse cx="18" cy="6" rx="16" ry="5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <Path d="M4 1 L14 16" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <Circle cx="4" cy="1" r="2" fill={color} />
    <Path d="M32 1 L22 16" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <Circle cx="32" cy="1" r="2" fill={color} />
  </Svg>
);

const ElectricGuitar = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size * 0.55} height={size} viewBox="0 0 20 38">
    <Path d="M7 0 L13 0 L13 5 Q15 6 15 8 L5 8 Q5 6 7 5 Z" fill={color} />
    <Circle cx="4.5" cy="3" r="1.3" fill={color} />
    <Circle cx="4.5" cy="6" r="1.3" fill={color} />
    <Circle cx="15.5" cy="3" r="1.3" fill={color} />
    <Circle cx="15.5" cy="6" r="1.3" fill={color} />
    <Rect x="8.5" y="7.5" width="3" height="18" fill={color} />
    <Path d="M4 25 Q2 22 3 19 L8.5 19 L8.5 22 Q7 23 7 26 Q7 33 10 36 Q13 38 14 36 Q16 33 14 28 Q13 24 11.5 22 L11.5 19 L17 19 Q18 22 16 25 Q19 28 19 32 Q18 37 14 38 Q10 39 8 37 Q4 35 4 31 Q3 28 4 25 Z" fill={color} />
    <Rect x="8" y="27" width="7" height="3" rx="1" fill="rgba(0,0,0,0.15)" />
    <Rect x="8" y="33" width="7" height="2" rx="0.5" fill="rgba(0,0,0,0.15)" />
  </Svg>
);

type IconKind =
  | "guitar" | "piano" | "mic" | "headphone" | "speaker"
  | "waveform" | "vinyl" | "note" | "doublenote" | "drum" | "elguitar";

interface IconSpec { x: number; y: number; kind: IconKind; size: number; rot: number }

const SPECS: IconSpec[] = [
  { x: 2,  y: 3,  kind: "guitar",     size: 44, rot: -10 },
  { x: 3,  y: 22, kind: "note",       size: 30, rot:  20 },
  { x: 5,  y: 42, kind: "mic",        size: 36, rot:  -8 },
  { x: 2,  y: 63, kind: "waveform",   size: 22, rot:   0 },
  { x: 4,  y: 82, kind: "doublenote", size: 26, rot:  15 },
  { x: 22, y: 8,  kind: "headphone",  size: 32, rot:   8 },
  { x: 24, y: 28, kind: "vinyl",      size: 28, rot:  25 },
  { x: 20, y: 52, kind: "piano",      size: 18, rot:  -5 },
  { x: 18, y: 72, kind: "guitar",     size: 40, rot:  12 },
  { x: 25, y: 92, kind: "speaker",    size: 24, rot: -12 },
  { x: 43, y: 4,  kind: "drum",       size: 26, rot:   5 },
  { x: 40, y: 20, kind: "doublenote", size: 30, rot: -15 },
  { x: 44, y: 38, kind: "elguitar",   size: 38, rot:   8 },
  { x: 42, y: 60, kind: "waveform",   size: 24, rot:  10 },
  { x: 45, y: 80, kind: "note",       size: 26, rot: -20 },
  { x: 64, y: 6,  kind: "mic",        size: 34, rot: -12 },
  { x: 62, y: 25, kind: "piano",      size: 20, rot:   0 },
  { x: 65, y: 46, kind: "vinyl",      size: 30, rot: -18 },
  { x: 60, y: 66, kind: "headphone",  size: 28, rot:  10 },
  { x: 63, y: 86, kind: "drum",       size: 24, rot:  -5 },
  { x: 82, y: 2,  kind: "doublenote", size: 28, rot:  15 },
  { x: 84, y: 18, kind: "elguitar",   size: 36, rot: -10 },
  { x: 80, y: 38, kind: "speaker",    size: 26, rot:   5 },
  { x: 86, y: 57, kind: "guitar",     size: 42, rot:  18 },
  { x: 82, y: 76, kind: "note",       size: 24, rot: -25 },
  { x: 78, y: 94, kind: "waveform",   size: 20, rot:   8 },
];

const ChatBackground = memo(({ isDark }: { isDark: boolean }) => {
  const { width, height } = useWindowDimensions();

  if (!hasSvg()) return null;

  const iconColor = isDark
    ? "rgba(0,188,212,0.20)"
    : "rgba(0,100,120,0.10)";

  function renderIcon(s: IconSpec, i: number) {
    const left = (s.x / 100) * width;
    const top  = (s.y / 100) * height;

    const el = (() => {
      switch (s.kind) {
        case "guitar":     return <Guitar        color={iconColor} size={s.size} />;
        case "piano":      return <PianoKeys     color={iconColor} size={s.size} />;
        case "mic":        return <Microphone    color={iconColor} size={s.size} />;
        case "headphone":  return <Headphone     color={iconColor} size={s.size} />;
        case "speaker":    return <Speaker       color={iconColor} size={s.size} />;
        case "waveform":   return <Waveform      color={iconColor} size={s.size} />;
        case "vinyl":      return <Vinyl         color={iconColor} size={s.size} />;
        case "note":       return <MusicNote     color={iconColor} size={s.size} />;
        case "doublenote": return <DoubleMusicNote color={iconColor} size={s.size} />;
        case "drum":       return <Drum          color={iconColor} size={s.size} />;
        case "elguitar":   return <ElectricGuitar color={iconColor} size={s.size} />;
      }
    })();

    return (
      <View
        key={i}
        style={{
          position: "absolute",
          left,
          top,
          transform: [{ rotate: `${s.rot}deg` }],
          pointerEvents: "none",
        } as any}
      >
        {el}
      </View>
    );
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        overflow: "hidden",
        pointerEvents: "none",
      } as any}
    >
      {SPECS.map(renderIcon)}
    </View>
  );
});

export default ChatBackground;
