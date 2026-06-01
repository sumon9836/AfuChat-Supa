import React from "react";
import Svg, {
  Circle, Rect, Line, Path, Polygon, G, Ellipse, Defs, RadialGradient, Stop,
} from "react-native-svg";

// ── Palette ───────────────────────────────────────────────────────────────────
const GOLD   = "#FFB300";
const TEAL   = "#00BCD4";
const CORAL  = "#FF7043";
const WHITE  = "#FFFFFF";
const DARK   = "#1A1A2E";

// Skin tones
const SKIN_LIGHT  = "#FFDBB4";
const SKIN_MED    = "#C68642";
const SKIN_DARK   = "#8D5524";
const SKIN_WARM   = "#E8A87C";

// Hair colors
const HAIR_BLACK  = "#1A0A00";
const HAIR_BROWN  = "#5C3317";
const HAIR_DARK   = "#2C1810";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Star({ cx, cy, r, fill, opacity = 1 }: {
  cx: number; cy: number; r: number; fill: string; opacity?: number;
}) {
  const ri = r * 0.38;
  const pts = `${cx},${cy - r} ${cx + ri},${cy - ri} ${cx + r},${cy} ${cx + ri},${cy + ri} ${cx},${cy + r} ${cx - ri},${cy + ri} ${cx - r},${cy} ${cx - ri},${cy - ri}`;
  return <Polygon points={pts} fill={fill} opacity={opacity} />;
}

/**
 * CartoonHuman — a toon-style human character rendered in SVG.
 *
 * @param cx      centre-x of the figure
 * @param cy      top-y of the figure
 * @param scale   overall scale (default 1 → body fits ≈ 95px tall in 200px canvas)
 * @param skin    skin tone hex
 * @param hair    hair colour hex
 * @param shirt   shirt / top colour hex
 * @param pants   trousers / skirt colour hex
 * @param hairStyle  "short" | "long" | "curly" | "bun"
 * @param facing  "right" | "left" | "front"  (arm/gaze direction)
 */
function CartoonHuman({
  cx, cy,
  scale = 1,
  skin  = SKIN_LIGHT,
  hair  = HAIR_BLACK,
  shirt = "#4FC3F7",
  pants = "#455A64",
  hairStyle = "short",
  facing = "front",
}: {
  cx: number; cy: number;
  scale?: number;
  skin?: string; hair?: string; shirt?: string; pants?: string;
  hairStyle?: "short" | "long" | "curly" | "bun";
  facing?: "right" | "left" | "front";
}) {
  const s = scale;

  // ── proportions ───────────────────────────────────────────
  const headR  = 16 * s;
  const headCx = cx;
  const headCy = cy + headR;

  // neck
  const neckW  = 9  * s;
  const neckH  = 8  * s;
  const neckX  = cx - neckW / 2;
  const neckY  = headCy + headR - 2 * s;

  // torso
  const torsoW = 34 * s;
  const torsoH = 30 * s;
  const torsoX = cx - torsoW / 2;
  const torsoY = neckY + neckH;

  // arms
  const armW   = 9  * s;
  const armH   = 26 * s;
  const armY   = torsoY + 4 * s;
  const armLX  = torsoX - armW + 1 * s;
  const armRX  = torsoX + torsoW - 1 * s;

  // forearm angle for pointing / waving
  const armLEndX = facing === "right" ? armLX - 4 * s  : armLX - 8 * s;
  const armLEndY = armY + armH * 0.7;
  const armREndX = facing === "left"  ? armRX + armW + 4 * s : armRX + armW + 10 * s;
  const armREndY = facing === "left"  ? armY + armH * 0.4    : armY + armH * 0.7;

  // legs
  const legW   = 12 * s;
  const legH   = 28 * s;
  const legGap = 4  * s;
  const legY   = torsoY + torsoH - 2 * s;
  const legLX  = cx - legGap / 2 - legW;
  const legRX  = cx + legGap / 2;

  // shoes
  const shoeH  = 8  * s;
  const shoeW  = 15 * s;

  // ── face details ──────────────────────────────────────────
  const eyeOffX = 5.5 * s;
  const eyeOffY = -1  * s;
  const eyeR    = 4.5 * s;
  const pupilR  = 2   * s;
  const browW   = 7   * s;
  const browY   = headCy + eyeOffY - eyeR - 3 * s;

  // mouth (happy curve)
  const mouthY  = headCy + headR * 0.38;
  const mouthL  = cx - 6 * s;
  const mouthR  = cx + 6 * s;
  const mouthCY = mouthY + 4 * s;

  // blush
  const blushY  = headCy + eyeOffY + eyeR + 2 * s;

  // ── hair paths ────────────────────────────────────────────
  function HairPath() {
    if (hairStyle === "long") {
      // shoulder-length
      return (
        <G>
          <Path
            d={`M${cx - headR * 1.1},${headCy} Q${cx - headR * 1.3},${headCy + headR * 0.5} ${cx - headR * 1.1},${headCy + headR * 1.8}`}
            stroke={hair} strokeWidth={10 * s} fill="none" strokeLinecap="round"
          />
          <Path
            d={`M${cx + headR * 1.1},${headCy} Q${cx + headR * 1.3},${headCy + headR * 0.5} ${cx + headR * 1.1},${headCy + headR * 1.8}`}
            stroke={hair} strokeWidth={10 * s} fill="none" strokeLinecap="round"
          />
          <Path
            d={`M${cx - headR},${headCy - headR * 0.8} Q${cx},${headCy - headR * 1.5} ${cx + headR},${headCy - headR * 0.8} L${cx + headR},${headCy} Q${cx},${headCy - headR * 0.4} ${cx - headR},${headCy} Z`}
            fill={hair}
          />
        </G>
      );
    }
    if (hairStyle === "curly") {
      return (
        <G>
          <Ellipse cx={cx} cy={headCy - headR * 0.7} rx={headR * 1.15} ry={headR * 0.8} fill={hair} />
          <Ellipse cx={cx - headR * 0.9} cy={headCy - headR * 0.2} rx={headR * 0.45} ry={headR * 0.55} fill={hair} />
          <Ellipse cx={cx + headR * 0.9} cy={headCy - headR * 0.2} rx={headR * 0.45} ry={headR * 0.55} fill={hair} />
        </G>
      );
    }
    if (hairStyle === "bun") {
      return (
        <G>
          <Path
            d={`M${cx - headR},${headCy - headR * 0.6} Q${cx},${headCy - headR * 1.4} ${cx + headR},${headCy - headR * 0.6} L${cx + headR},${headCy} Q${cx},${headCy - headR * 0.3} ${cx - headR},${headCy} Z`}
            fill={hair}
          />
          <Circle cx={cx} cy={headCy - headR * 1.5} r={headR * 0.38} fill={hair} />
        </G>
      );
    }
    // default: short
    return (
      <Path
        d={`M${cx - headR},${headCy - headR * 0.5} Q${cx - headR * 0.2},${headCy - headR * 1.55} ${cx + headR * 0.2},${headCy - headR * 1.5} Q${cx + headR},${headCy - headR * 1.2} ${cx + headR},${headCy - headR * 0.5} Z`}
        fill={hair}
      />
    );
  }

  return (
    <G>
      {/* ── legs ── */}
      <Rect x={legLX} y={legY} width={legW} height={legH} rx={5 * s} fill={pants} />
      <Rect x={legRX} y={legY} width={legW} height={legH} rx={5 * s} fill={pants} />
      {/* shoes */}
      <Rect x={legLX - 2 * s} y={legY + legH - 2 * s} width={shoeW} height={shoeH} rx={4 * s} fill={DARK} />
      <Rect x={legRX - 1 * s} y={legY + legH - 2 * s} width={shoeW} height={shoeH} rx={4 * s} fill={DARK} />

      {/* ── left arm ── */}
      <Path
        d={`M${armLX + armW / 2},${armY} Q${armLX - 4 * s},${armY + armH * 0.5} ${armLEndX + armW / 2},${armLEndY}`}
        stroke={skin} strokeWidth={armW} fill="none" strokeLinecap="round"
      />
      {/* ── right arm ── */}
      <Path
        d={`M${armRX + armW / 2},${armY} Q${armRX + armW + 8 * s},${armY + armH * 0.5} ${armREndX},${armREndY}`}
        stroke={skin} strokeWidth={armW} fill="none" strokeLinecap="round"
      />
      {/* ── shirt sleeves ── */}
      <Path
        d={`M${armLX + armW / 2},${armY} Q${armLX - 4 * s},${armY + armH * 0.35} ${armLEndX + armW / 2},${armY + armH * 0.45}`}
        stroke={shirt} strokeWidth={armW * 0.92} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M${armRX + armW / 2},${armY} Q${armRX + armW + 8 * s},${armY + armH * 0.35} ${armREndX},${armY + armH * 0.45}`}
        stroke={shirt} strokeWidth={armW * 0.92} fill="none" strokeLinecap="round"
      />

      {/* ── torso / shirt ── */}
      <Rect x={torsoX} y={torsoY} width={torsoW} height={torsoH} rx={7 * s} fill={shirt} />

      {/* ── neck ── */}
      <Rect x={neckX} y={neckY} width={neckW} height={neckH + 2 * s} rx={3 * s} fill={skin} />

      {/* ── head ── */}
      <Ellipse cx={headCx} cy={headCy} rx={headR} ry={headR * 1.05} fill={skin} />

      {/* ── hair ── */}
      <HairPath />

      {/* ── ear ── */}
      <Ellipse cx={cx - headR} cy={headCy + 1 * s} rx={3.5 * s} ry={4.5 * s} fill={skin} />
      <Ellipse cx={cx + headR} cy={headCy + 1 * s} rx={3.5 * s} ry={4.5 * s} fill={skin} />

      {/* ── eyebrows ── */}
      <Path
        d={`M${cx - eyeOffX - browW / 2},${browY} Q${cx - eyeOffX},${browY - 2.5 * s} ${cx - eyeOffX + browW / 2},${browY}`}
        stroke={hair} strokeWidth={2 * s} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M${cx + eyeOffX - browW / 2},${browY} Q${cx + eyeOffX},${browY - 2.5 * s} ${cx + eyeOffX + browW / 2},${browY}`}
        stroke={hair} strokeWidth={2 * s} fill="none" strokeLinecap="round"
      />

      {/* ── eyes (white + iris + pupil) ── */}
      <Circle cx={cx - eyeOffX} cy={headCy + eyeOffY} r={eyeR} fill={WHITE} />
      <Circle cx={cx + eyeOffX} cy={headCy + eyeOffY} r={eyeR} fill={WHITE} />
      <Circle cx={cx - eyeOffX + 0.8 * s} cy={headCy + eyeOffY + 0.5 * s} r={pupilR + 0.8 * s} fill={"#2C4A6E"} />
      <Circle cx={cx + eyeOffX + 0.8 * s} cy={headCy + eyeOffY + 0.5 * s} r={pupilR + 0.8 * s} fill={"#2C4A6E"} />
      <Circle cx={cx - eyeOffX + 0.8 * s} cy={headCy + eyeOffY + 0.5 * s} r={pupilR} fill={DARK} />
      <Circle cx={cx + eyeOffX + 0.8 * s} cy={headCy + eyeOffY + 0.5 * s} r={pupilR} fill={DARK} />
      {/* eye shine */}
      <Circle cx={cx - eyeOffX - 1.2 * s} cy={headCy + eyeOffY - 1.8 * s} r={1.2 * s} fill={WHITE} />
      <Circle cx={cx + eyeOffX - 1.2 * s} cy={headCy + eyeOffY - 1.8 * s} r={1.2 * s} fill={WHITE} />

      {/* ── blush ── */}
      <Ellipse cx={cx - eyeOffX - 2 * s} cy={blushY} rx={4.5 * s} ry={2.5 * s} fill={CORAL} opacity={0.3} />
      <Ellipse cx={cx + eyeOffX + 2 * s} cy={blushY} rx={4.5 * s} ry={2.5 * s} fill={CORAL} opacity={0.3} />

      {/* ── nose ── */}
      <Ellipse cx={cx} cy={headCy + headR * 0.18} rx={2 * s} ry={1.5 * s} fill={skin === SKIN_LIGHT ? "#E8A87C" : "#6B3E26"} opacity={0.5} />

      {/* ── smile ── */}
      <Path
        d={`M${mouthL},${mouthY} Q${cx},${mouthCY} ${mouthR},${mouthY}`}
        stroke={hair === HAIR_BLACK ? "#5C3317" : HAIR_BROWN}
        strokeWidth={2 * s}
        fill="none"
        strokeLinecap="round"
      />
    </G>
  );
}

// ── Slide 1 — Chat ─────────────────────────────────────────────────────────────
export function ChatIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={22} cy={30} r={7} fill={GOLD} />
      <Star cx={174} cy={18} r={5} fill={WHITE} opacity={0.7} />
      <Circle cx={185} cy={88} r={6} fill={CORAL} opacity={0.4} />
      <Star cx={178} cy={165} r={5} fill={TEAL} />

      {/* ── Left person — woman, long hair, blue shirt ── */}
      <CartoonHuman
        cx={60} cy={72}
        scale={0.88}
        skin={SKIN_WARM}
        hair={HAIR_BLACK}
        shirt="#4FC3F7"
        pants="#37474F"
        hairStyle="long"
        facing="right"
      />

      {/* ── Right person — man, short hair, green shirt ── */}
      <CartoonHuman
        cx={140} cy={72}
        scale={0.88}
        skin={SKIN_MED}
        hair={HAIR_BROWN}
        shirt="#66BB6A"
        pants="#455A64"
        hairStyle="short"
        facing="left"
      />

      {/* ── Speech bubbles ── */}
      <Rect x={32} y={14} width={52} height={28} rx={12} fill={WHITE} opacity={0.95} />
      <Path d="M55,42 L52,52 L64,42" fill={WHITE} opacity={0.95} />
      <Circle cx={46} cy={28} r={3.5} fill={TEAL} />
      <Circle cx={58} cy={28} r={3.5} fill={TEAL} />
      <Circle cx={70} cy={28} r={3.5} fill={TEAL} />

      <Rect x={116} y={8} width={52} height={28} rx={12} fill={WHITE} opacity={0.85} />
      <Path d="M130,36 L128,46 L140,36" fill={WHITE} opacity={0.85} />
      <Circle cx={130} cy={22} r={3.5} fill={CORAL} />
      <Circle cx={142} cy={22} r={3.5} fill={CORAL} />
      <Circle cx={154} cy={22} r={3.5} fill={CORAL} />
    </Svg>
  );
}

// ── Slide 2 — Security ────────────────────────────────────────────────────────
export function SecurityIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={24} cy={26} r={7} fill={GOLD} />
      <Star cx={174} cy={160} r={6} fill={TEAL} />
      <Circle cx={18} cy={102} r={5} fill={WHITE} opacity={0.3} />
      <Circle cx={182} cy={52} r={7} fill={WHITE} opacity={0.25} />

      {/* ── Person — holding / gesturing toward shield ── */}
      <CartoonHuman
        cx={68} cy={64}
        scale={0.92}
        skin={SKIN_DARK}
        hair={HAIR_BLACK}
        shirt="#5C6BC0"
        pants="#263238"
        hairStyle="short"
        facing="right"
      />

      {/* ── Shield ── */}
      <Path
        d="M130,54 L174,54 L174,108 L152,130 L130,108 Z"
        fill={WHITE} opacity={0.92}
      />
      <Path
        d="M135,60 L169,60 L169,106 L152,124 L135,106 Z"
        fill={TEAL} opacity={0.25}
      />
      {/* Lock */}
      <Rect x={140} y={84} width={24} height={18} rx={5} fill={"#37474F"} />
      <Path
        d="M143,84 Q143,72 152,72 Q161,72 161,84"
        stroke={"#37474F"} strokeWidth={4} fill="none"
      />
      <Circle cx={152} cy={93} r={4} fill={WHITE} opacity={0.9} />

      <Star cx={180} cy={26} r={5} fill={GOLD} />
      <Star cx={24} cy={168} r={5} fill={CORAL} />
    </Svg>
  );
}

// ── Slide 3 — Discover ────────────────────────────────────────────────────────
export function DiscoverIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={20} cy={32} r={6} fill={GOLD} />
      <Star cx={178} cy={22} r={5} fill={WHITE} opacity={0.7} />
      <Circle cx={186} cy={148} r={6} fill={CORAL} opacity={0.5} />

      {/* ── Globe ── */}
      <Circle cx={142} cy={106} r={46} fill={WHITE} opacity={0.15} />
      <Circle cx={142} cy={106} r={46} fill="none" stroke={WHITE} strokeWidth={2.5} />
      <Ellipse cx={142} cy={106} rx={46} ry={15} fill="none" stroke={WHITE} strokeWidth={1.5} opacity={0.55} />
      <Ellipse cx={142} cy={106} rx={28} ry={46} fill="none" stroke={WHITE} strokeWidth={1.5} opacity={0.55} />
      <Line x1={142} y1={60} x2={142} y2={152} stroke={WHITE} strokeWidth={1} opacity={0.4} />
      <Line x1={96} y1={106} x2={188} y2={106} stroke={WHITE} strokeWidth={1} opacity={0.4} />

      {/* ── Person — looking toward globe ── */}
      <CartoonHuman
        cx={55} cy={68}
        scale={0.88}
        skin={SKIN_LIGHT}
        hair={HAIR_DARK}
        shirt="#26A69A"
        pants="#37474F"
        hairStyle="bun"
        facing="right"
      />

      {/* ── Magnifier ── */}
      <Circle cx={107} cy={106} r={13} fill="none" stroke={WHITE} strokeWidth={3.5} />
      <Line x1={116} y1={115} x2={124} y2={123} stroke={WHITE} strokeWidth={3.5} strokeLinecap="round" />

      <Star cx={20} cy={172} r={5} fill={TEAL} />
    </Svg>
  );
}

// ── Slide 4 — AfuAI (robot stays — it's intentionally AI-themed) ───────────────
export function AfuAIIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={28} cy={42} r={8} fill={GOLD} />
      <Star cx={172} cy={38} r={6} fill={TEAL} />
      <Star cx={32} cy={155} r={5} fill={CORAL} />
      <Star cx={168} cy={158} r={7} fill={GOLD} />
      <Circle cx={185} cy={100} r={5} fill={WHITE} opacity={0.4} />
      <Circle cx={15} cy={100} r={5} fill={WHITE} opacity={0.4} />

      {/* Robot head */}
      <Rect x={56} y={30} width={88} height={66} rx={12} fill={WHITE} opacity={0.95} />
      <Line x1={100} y1={30} x2={100} y2={14} stroke={WHITE} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={100} cy={11} r={8} fill={TEAL} />
      <Circle cx={100} cy={11} r={4} fill={WHITE} />
      {/* Glowing eyes */}
      <Circle cx={78} cy={58} r={14} fill={TEAL} opacity={0.95} />
      <Circle cx={122} cy={58} r={14} fill={TEAL} opacity={0.95} />
      <Circle cx={78} cy={58} r={7} fill={WHITE} />
      <Circle cx={122} cy={58} r={7} fill={WHITE} />
      <Circle cx={78} cy={58} r={3.5} fill={DARK} />
      <Circle cx={122} cy={58} r={3.5} fill={DARK} />
      {/* Mouth */}
      <Rect x={74} y={78} width={52} height={10} rx={5} fill={TEAL} opacity={0.8} />
      {/* Ear bolts */}
      <Circle cx={56} cy={60} r={7} fill={WHITE} opacity={0.8} />
      <Circle cx={144} cy={60} r={7} fill={WHITE} opacity={0.8} />
      {/* Body */}
      <Rect x={64} y={98} width={72} height={62} rx={12} fill={WHITE} opacity={0.9} />
      <Rect x={76} y={110} width={48} height={28} rx={7} fill={TEAL} opacity={0.3} />
      <Circle cx={88} cy={120} r={5} fill={TEAL} opacity={0.8} />
      <Circle cx={100} cy={120} r={5} fill={GOLD} opacity={0.8} />
      <Circle cx={112} cy={120} r={5} fill={CORAL} opacity={0.8} />
      <Rect x={40} y={102} width={24} height={38} rx={10} fill={WHITE} opacity={0.88} />
      <Rect x={136} y={102} width={24} height={38} rx={10} fill={WHITE} opacity={0.88} />

      {/* Human user beside robot */}
      <CartoonHuman
        cx={168} cy={100}
        scale={0.62}
        skin={SKIN_WARM}
        hair={HAIR_BROWN}
        shirt="#AB47BC"
        pants="#4A148C"
        hairStyle="short"
        facing="left"
      />
    </Svg>
  );
}

// ── Slide 5 — Wallet / ACoins ─────────────────────────────────────────────────
export function WalletIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={22} cy={30} r={7} fill={GOLD} />
      <Star cx={176} cy={25} r={5} fill={WHITE} opacity={0.7} />
      <Star cx={178} cy={165} r={6} fill={GOLD} />
      <Circle cx={18} cy={155} r={5} fill={CORAL} opacity={0.5} />

      {/* ── Left person — reaching out ── */}
      <CartoonHuman
        cx={48} cy={68}
        scale={0.84}
        skin={SKIN_DARK}
        hair={HAIR_BLACK}
        shirt="#FF7043"
        pants="#BF360C"
        hairStyle="curly"
        facing="right"
      />

      {/* ── Big gold coin (ACoin) ── */}
      <Ellipse cx={108} cy={104} rx={30} ry={10} fill={GOLD} opacity={0.4} />
      <Ellipse cx={105} cy={98} rx={30} ry={10} fill={GOLD} opacity={0.5} />
      <Circle cx={100} cy={104} r={30} fill={GOLD} opacity={0.92} />
      <Circle cx={100} cy={104} r={30} fill="none" stroke={WHITE} strokeWidth={2} opacity={0.6} />
      {/* "A" on coin */}
      <Path
        d="M91,118 L100,89 L109,118"
        stroke={WHITE} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <Line x1={94} y1={110} x2={106} y2={110} stroke={WHITE} strokeWidth={3.2} strokeLinecap="round" />
      {/* sparkles */}
      <Line x1={100} y1={70} x2={100} y2={63} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={117} y1={74} x2={121} y2={68} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={83}  y1={74} x2={79}  y2={68} stroke={GOLD} strokeWidth={2.5} strokeLinecap="round" />

      {/* ── Right person — receiving ── */}
      <CartoonHuman
        cx={158} cy={68}
        scale={0.84}
        skin={SKIN_LIGHT}
        hair={HAIR_DARK}
        shirt="#FFB300"
        pants="#455A64"
        hairStyle="long"
        facing="left"
      />
    </Svg>
  );
}

// ── Slide 6 — Community ───────────────────────────────────────────────────────
export function CommunityIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={25} cy={28} r={7} fill={GOLD} />
      <Star cx={175} cy={162} r={6} fill={TEAL} />
      <Circle cx={185} cy={68} r={5} fill={CORAL} opacity={0.5} />

      {/* ── Connection lines ── */}
      <Line x1={60} y1={128} x2={100} y2={84} stroke={WHITE} strokeWidth={2} strokeDasharray="5,5" opacity={0.5} />
      <Line x1={140} y1={128} x2={100} y2={84} stroke={WHITE} strokeWidth={2} strokeDasharray="5,5" opacity={0.5} />
      <Line x1={60} y1={128} x2={140} y2={128} stroke={WHITE} strokeWidth={2} strokeDasharray="5,5" opacity={0.4} />

      {/* ── Centre person (top) — woman, bun ── */}
      <CartoonHuman
        cx={100} cy={56}
        scale={0.82}
        skin={SKIN_WARM}
        hair={HAIR_BLACK}
        shirt="#E91E63"
        pants="#880E4F"
        hairStyle="bun"
        facing="front"
      />
      {/* heart above */}
      <Path
        d="M100,42 C100,42 106,36 110,40 C114,44 110,48 100,54 C90,48 86,44 90,40 C94,36 100,42 100,42 Z"
        fill={CORAL} opacity={0.88}
      />

      {/* ── Bottom-left person — curly hair ── */}
      <CartoonHuman
        cx={48} cy={112}
        scale={0.76}
        skin={SKIN_DARK}
        hair={HAIR_BLACK}
        shirt="#00BCD4"
        pants="#006064"
        hairStyle="curly"
        facing="right"
      />
      <Star cx={48} cy={98} r={6} fill={GOLD} />

      {/* ── Bottom-right person — man ── */}
      <CartoonHuman
        cx={152} cy={112}
        scale={0.76}
        skin={SKIN_MED}
        hair={HAIR_BROWN}
        shirt="#4CAF50"
        pants="#1B5E20"
        hairStyle="short"
        facing="left"
      />
      <Star cx={152} cy={98} r={6} fill={TEAL} />
    </Svg>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export const SLIDE_ILLUSTRATIONS = [
  ChatIllustration,
  SecurityIllustration,
  DiscoverIllustration,
  AfuAIIllustration,
  WalletIllustration,
  CommunityIllustration,
] as const;
