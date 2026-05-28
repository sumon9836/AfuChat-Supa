import React from "react";
import Svg, { Circle, Rect, Line, Path, Polygon, G, Ellipse } from "react-native-svg";

const W = "#FFFFFF";
const DARK = "#0D1B2A";
const TEAL = "#00BCD4";
const CORAL = "#FF7043";
const GOLD = "#FFB300";
const PURPLE = "#AB47BC";
const GREEN = "#34C759";
const INDIGO = "#5C6BC0";
const AMBER = "#FF9500";

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const ri = r * 0.38;
  const pts = `${cx},${cy - r} ${cx + ri},${cy - ri} ${cx + r},${cy} ${cx + ri},${cy + ri} ${cx},${cy + r} ${cx - ri},${cy + ri} ${cx - r},${cy} ${cx - ri},${cy - ri}`;
  return <Polygon points={pts} fill={fill} />;
}

function Face({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={W} />
      <Circle cx={cx - r * 0.33} cy={cy - r * 0.08} r={r * 0.16} fill={DARK} />
      <Circle cx={cx + r * 0.33} cy={cy - r * 0.08} r={r * 0.16} fill={DARK} />
      <Path
        d={`M${cx - r * 0.28},${cy + r * 0.28} Q${cx},${cy + r * 0.5} ${cx + r * 0.28},${cy + r * 0.28}`}
        stroke={DARK} strokeWidth={r * 0.1} fill="none" strokeLinecap="round"
      />
    </G>
  );
}

function Char({
  cx, cy, r = 19, armL, armR,
}: {
  cx: number; cy: number; r?: number;
  armL?: [number, number]; armR?: [number, number];
}) {
  const bw = r * 1.7, bh = r * 1.9, bx = cx - bw / 2, by = cy + r + 3;
  const defaultArmL: [number, number] = [cx - bw / 2 - r * 1.1, cy + r + bh * 0.4];
  const defaultArmR: [number, number] = [cx + bw / 2 + r * 1.1, cy + r + bh * 0.4];
  const [alx, aly] = armL ?? defaultArmL;
  const [arx, ary] = armR ?? defaultArmR;
  return (
    <G>
      <Face cx={cx} cy={cy} r={r} />
      <Rect x={bx} y={by} width={bw} height={bh} rx={r * 0.55} fill={W} />
      <Line x1={bx} y1={by + bh * 0.28} x2={alx} y2={aly} stroke={W} strokeWidth={r * 0.26} strokeLinecap="round" />
      <Line x1={bx + bw} y1={by + bh * 0.28} x2={arx} y2={ary} stroke={W} strokeWidth={r * 0.26} strokeLinecap="round" />
      <Line x1={cx - r * 0.42} y1={by + bh + 2} x2={cx - r * 0.52} y2={by + bh + r * 0.9} stroke={W} strokeWidth={r * 0.26} strokeLinecap="round" />
      <Line x1={cx + r * 0.42} y1={by + bh + 2} x2={cx + r * 0.52} y2={by + bh + r * 0.9} stroke={W} strokeWidth={r * 0.26} strokeLinecap="round" />
    </G>
  );
}

export function ChatIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={22} cy={32} r={7} fill={GOLD} />
      <Star cx={170} cy={20} r={5} fill={TEAL} />
      <Circle cx={182} cy={82} r={6} fill={CORAL} opacity={0.5} />
      <Circle cx={18} cy={152} r={5} fill={TEAL} opacity={0.45} />
      <Star cx={178} cy={162} r={6} fill={GOLD} />

      {/* Left character */}
      <Char cx={62} cy={92} r={19} armR={[98, 108]} />
      {/* Right character */}
      <Char cx={138} cy={92} r={19} armL={[102, 108]} />

      {/* Left speech bubble */}
      <Rect x={48} y={20} width={46} height={30} rx={12} fill={W} />
      <Path d="M66,50 L62,60 L76,50" fill={W} />
      <Circle cx={62} cy={35} r={3.5} fill={TEAL} />
      <Circle cx={75} cy={35} r={3.5} fill={TEAL} />
      <Circle cx={88} cy={35} r={3.5} fill={TEAL} />

      {/* Right speech bubble */}
      <Rect x={104} y={12} width={46} height={30} rx={12} fill={W} opacity={0.85} />
      <Path d="M122,42 L118,52 L132,42" fill={W} opacity={0.85} />
      <Circle cx={118} cy={27} r={3.5} fill={CORAL} />
      <Circle cx={130} cy={27} r={3.5} fill={CORAL} />
      <Circle cx={142} cy={27} r={3.5} fill={CORAL} />
    </Svg>
  );
}

export function SecurityIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={24} cy={28} r={7} fill={GOLD} />
      <Star cx={172} cy={158} r={6} fill={TEAL} />
      <Circle cx={18} cy={100} r={5} fill={W} opacity={0.3} />
      <Circle cx={182} cy={55} r={7} fill={W} opacity={0.25} />

      {/* Character on left */}
      <Char cx={66} cy={90} r={18} armR={[108, 112]} />

      {/* Shield on right */}
      <Path d="M125,62 L168,62 L168,112 L146.5,132 L125,112 Z" fill={W} opacity={0.95} />
      <Path d="M130,67 L163,67 L163,110 L146.5,126 L130,110 Z" fill={TEAL} opacity={0.3} />
      {/* Lock icon on shield */}
      <Rect x={137} y={88} width={19} height={15} rx={4} fill={DARK} />
      <Path d="M140,88 Q140,78 146.5,78 Q153,78 153,88" stroke={DARK} strokeWidth={3.5} fill="none" />

      <Star cx={180} cy={28} r={5} fill={GOLD} />
      <Star cx={25} cy={168} r={5} fill={CORAL} />
    </Svg>
  );
}

export function DiscoverIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={20} cy={35} r={6} fill={GOLD} />
      <Star cx={175} cy={25} r={5} fill={W} opacity={0.7} />
      <Circle cx={185} cy={145} r={6} fill={CORAL} opacity={0.5} />

      {/* Globe on right */}
      <Circle cx={140} cy={105} r={45} fill={W} opacity={0.18} />
      <Circle cx={140} cy={105} r={45} fill="none" stroke={W} strokeWidth={2.5} />
      {/* Latitude lines */}
      <Ellipse cx={140} cy={105} rx={45} ry={15} fill="none" stroke={W} strokeWidth={1.5} opacity={0.6} />
      <Ellipse cx={140} cy={105} rx={30} ry={45} fill="none" stroke={W} strokeWidth={1.5} opacity={0.6} />
      <Line x1={140} y1={60} x2={140} y2={150} stroke={W} strokeWidth={1} opacity={0.4} />
      <Line x1={95} y1={105} x2={185} y2={105} stroke={W} strokeWidth={1} opacity={0.4} />

      {/* Character on left looking at globe */}
      <Char cx={56} cy={88} r={17} armR={[96, 100]} />

      {/* Magnifying glass */}
      <Circle cx={104} cy={104} r={12} fill="none" stroke={W} strokeWidth={3.5} />
      <Line x1={112} y1={112} x2={120} y2={120} stroke={W} strokeWidth={3.5} strokeLinecap="round" />

      <Star cx={22} cy={170} r={5} fill={TEAL} />
    </Svg>
  );
}

export function AfuAIIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* Sparkles */}
      <Star cx={28} cy={42} r={8} fill={GOLD} />
      <Star cx={172} cy={38} r={6} fill={TEAL} />
      <Star cx={32} cy={155} r={5} fill={CORAL} />
      <Star cx={168} cy={158} r={7} fill={GOLD} />
      <Circle cx={185} cy={100} r={5} fill={W} opacity={0.4} />
      <Circle cx={15} cy={100} r={5} fill={W} opacity={0.4} />

      {/* Robot head */}
      <Rect x={56} y={30} width={88} height={66} rx={12} fill={W} opacity={0.95} />
      {/* Antenna */}
      <Line x1={100} y1={30} x2={100} y2={14} stroke={W} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={100} cy={11} r={8} fill={TEAL} />
      <Circle cx={100} cy={11} r={4} fill={W} />

      {/* Eyes (glowing) */}
      <Circle cx={78} cy={58} r={14} fill={TEAL} opacity={0.95} />
      <Circle cx={122} cy={58} r={14} fill={TEAL} opacity={0.95} />
      <Circle cx={78} cy={58} r={7} fill={W} />
      <Circle cx={122} cy={58} r={7} fill={W} />
      <Circle cx={78} cy={58} r={3.5} fill={DARK} />
      <Circle cx={122} cy={58} r={3.5} fill={DARK} />

      {/* Mouth */}
      <Rect x={74} y={78} width={52} height={10} rx={5} fill={TEAL} opacity={0.8} />

      {/* Ear bolts */}
      <Circle cx={56} cy={60} r={7} fill={W} opacity={0.8} />
      <Circle cx={144} cy={60} r={7} fill={W} opacity={0.8} />

      {/* Body */}
      <Rect x={64} y={98} width={72} height={62} rx={12} fill={W} opacity={0.9} />
      {/* Chest panel */}
      <Rect x={76} y={110} width={48} height={28} rx={7} fill={TEAL} opacity={0.3} />
      <Circle cx={88} cy={120} r={5} fill={TEAL} opacity={0.8} />
      <Circle cx={100} cy={120} r={5} fill={GOLD} opacity={0.8} />
      <Circle cx={112} cy={120} r={5} fill={CORAL} opacity={0.8} />

      {/* Arms */}
      <Rect x={40} y={102} width={24} height={38} rx={10} fill={W} opacity={0.88} />
      <Rect x={136} y={102} width={24} height={38} rx={10} fill={W} opacity={0.88} />
    </Svg>
  );
}

export function WalletIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={22} cy={30} r={7} fill={GOLD} />
      <Star cx={176} cy={25} r={5} fill={W} opacity={0.7} />
      <Star cx={178} cy={165} r={6} fill={GOLD} />
      <Circle cx={18} cy={155} r={5} fill={CORAL} opacity={0.5} />

      {/* Left character reaching out */}
      <Char cx={50} cy={92} r={17} armR={[95, 105]} />

      {/* Coin stack in center */}
      {/* Back coins */}
      <Ellipse cx={106} cy={102} rx={28} ry={9} fill={W} opacity={0.45} />
      <Ellipse cx={103} cy={96} rx={28} ry={9} fill={W} opacity={0.55} />
      {/* Front coin */}
      <Circle cx={100} cy={105} r={28} fill={GOLD} opacity={0.9} />
      <Circle cx={100} cy={105} r={28} fill="none" stroke={W} strokeWidth={2} opacity={0.6} />
      {/* 'A' letter on coin */}
      <Path d="M92,118 L100,90 L108,118" stroke={W} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={95} y1={110} x2={105} y2={110} stroke={W} strokeWidth={3} strokeLinecap="round" />

      {/* Sparkle lines from coin */}
      <Line x1={100} y1={72} x2={100} y2={65} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={116} y1={76} x2={120} y2={70} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={84} y1={76} x2={80} y2={70} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" />

      {/* Right character */}
      <Char cx={155} cy={92} r={17} armL={[112, 105]} />
    </Svg>
  );
}

export function CommunityIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={25} cy={30} r={7} fill={GOLD} />
      <Star cx={175} cy={165} r={6} fill={TEAL} />
      <Circle cx={185} cy={68} r={5} fill={CORAL} opacity={0.5} />
      <Circle cx={15} cy={145} r={5} fill={W} opacity={0.35} />

      {/* Connection lines (dashed) */}
      <Line x1={62} y1={118} x2={100} y2={80} stroke={W} strokeWidth={2} strokeDasharray="5,5" opacity={0.55} />
      <Line x1={138} y1={118} x2={100} y2={80} stroke={W} strokeWidth={2} strokeDasharray="5,5" opacity={0.55} />
      <Line x1={62} y1={118} x2={138} y2={118} stroke={W} strokeWidth={2} strokeDasharray="5,5" opacity={0.45} />

      {/* Top center character */}
      <Char cx={100} cy={72} r={18} />
      {/* Heart above center */}
      <Path d="M100,48 C100,48 106,42 110,46 C114,50 110,54 100,60 C90,54 86,50 90,46 C94,42 100,48 100,48 Z" fill={CORAL} opacity={0.85} />

      {/* Bottom-left character */}
      <Char cx={48} cy={118} r={15} />
      {/* Star above left */}
      <Star cx={48} cy={95} r={6} fill={GOLD} />

      {/* Bottom-right character */}
      <Char cx={152} cy={118} r={15} />
      {/* Star above right */}
      <Star cx={152} cy={95} r={6} fill={TEAL} />
    </Svg>
  );
}

export const SLIDE_ILLUSTRATIONS = [
  ChatIllustration,
  SecurityIllustration,
  DiscoverIllustration,
  AfuAIIllustration,
  WalletIllustration,
  CommunityIllustration,
] as const;
