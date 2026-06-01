/**
 * MemphisIllustrations — motion-graphics illustrations for the onboarding carousel.
 *
 * Every illustration is a self-contained animated scene built with:
 *   • react-native-reanimated v4 (UI-thread worklets, 60 fps)
 *   • react-native-svg v15  (AnimatedG / AnimatedCircle etc.)
 *
 * Characters are full cartoon humans (not dolls) with skin tones, hair, clothes.
 * Animations are choreographed per-slide to tell a story.
 */

import React, { useEffect } from "react";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Circle, Ellipse, G, Line, Path, Polygon, Rect,
} from "react-native-svg";

// ── Animated SVG primitives ───────────────────────────────────────────────────
const AnimG       = Animated.createAnimatedComponent(G);
const AnimCircle  = Animated.createAnimatedComponent(Circle);
const AnimEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimRect    = Animated.createAnimatedComponent(Rect);
const AnimPath    = Animated.createAnimatedComponent(Path);
const AnimLine    = Animated.createAnimatedComponent(Line);

// ── Colour palette ────────────────────────────────────────────────────────────
const W      = "#FFFFFF";
const DARK   = "#1A1A2E";
const TEAL   = "#00BCD4";
const CORAL  = "#FF7043";
const GOLD   = "#FFB300";
const INDIGO = "#5C6BC0";
const GREEN  = "#66BB6A";
const PINK   = "#E91E63";
const PURPLE = "#AB47BC";

const SKIN_LIGHT = "#FFDBB4";
const SKIN_WARM  = "#E8A87C";
const SKIN_MED   = "#C68642";
const SKIN_DARK  = "#8D5524";
const HAIR_BLACK = "#1A0A00";
const HAIR_BROWN = "#5C3317";
const HAIR_DARK  = "#2C1810";

// ── Animation helpers ─────────────────────────────────────────────────────────

/** Infinite smooth ping-pong between `a` and `b`. */
function useBob(a: number, b: number, ms: number, delay = 0) {
  const v = useSharedValue(a);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withTiming(b, { duration: ms, easing: Easing.inOut(Easing.sin) }),
        -1, true
      )
    );
  }, []);
  return v;
}

/** Infinite smooth ping-pong that goes a→b→a (easeInOut), good for opacity. */
function usePulse(a: number, b: number, ms: number, delay = 0) {
  return useBob(a, b, ms, delay);
}

/** One-direction infinite spin: 0 → 2π over `ms`. */
function useSpin(ms: number, delay = 0) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(withTiming(2 * Math.PI, { duration: ms, easing: Easing.linear }), -1)
    );
  }, []);
  return v;
}

/** Bouncing dot for typing indicators: drops -amp and returns. */
function useDot(amp: number, ms: number, delay = 0) {
  return useBob(0, -amp, ms, delay);
}

// ── Star decorator ────────────────────────────────────────────────────────────
function Star({ cx, cy, r, fill, opacity = 1 }: {
  cx: number; cy: number; r: number; fill: string; opacity?: number;
}) {
  const ri  = r * 0.38;
  const pts = `${cx},${cy - r} ${cx + ri},${cy - ri} ${cx + r},${cy} ${cx + ri},${cy + ri} ${cx},${cy + r} ${cx - ri},${cy + ri} ${cx - r},${cy} ${cx - ri},${cy - ri}`;
  return <Polygon points={pts} fill={fill} opacity={opacity} />;
}

// ── CartoonHuman — full human cartoon character ───────────────────────────────
/**
 * All units are in the 200×200 SVG viewBox.
 * `cx`/`cy` = top-centre of the character.
 * `s`       = uniform scale factor (default 1 → ≈ 90px tall).
 */
function CartoonHuman({
  cx, cy,
  s   = 1,
  skin  = SKIN_LIGHT,
  hair  = HAIR_BLACK,
  shirt = TEAL,
  pants = DARK,
  hairStyle = "short" as "short" | "long" | "curly" | "bun",
  facing    = "front" as "front" | "right" | "left",
}: {
  cx: number; cy: number; s?: number;
  skin?: string; hair?: string; shirt?: string; pants?: string;
  hairStyle?: "short" | "long" | "curly" | "bun";
  facing?: "front" | "right" | "left";
}) {
  const HR  = 16 * s;
  const HCx = cx;
  const HCy = cy + HR;

  const nW = 9 * s, nH = 8 * s;
  const nX = cx - nW / 2, nY = HCy + HR - 2 * s;

  const tW = 34 * s, tH = 30 * s;
  const tX = cx - tW / 2, tY = nY + nH;

  const aW = 9 * s, aH = 26 * s, aY = tY + 4 * s;
  const aLX = tX - aW + 1 * s, aRX = tX + tW - 1 * s;
  const aLEx = facing === "right" ? aLX - 4 * s : aLX - 8 * s;
  const aLEy = aY + aH * 0.7;
  const aREx = facing === "left" ? aRX + aW + 4 * s : aRX + aW + 10 * s;
  const aREy = facing === "left" ? aY + aH * 0.4 : aY + aH * 0.7;

  const lW = 12 * s, lH = 28 * s, lG = 4 * s;
  const lY = tY + tH - 2 * s;
  const lLX = cx - lG / 2 - lW, lRX = cx + lG / 2;
  const shW = 15 * s, shH = 8 * s;

  const eX = 5.5 * s, eY = -1 * s, eR = 4.5 * s, pR = 2 * s;
  const bW = 7 * s, bY = HCy + eY - eR - 3 * s;
  const mY = HCy + HR * 0.38, mL = cx - 6 * s, mR = cx + 6 * s, mCY = mY + 4 * s;
  const blY = HCy + eY + eR + 2 * s;

  function Hair() {
    if (hairStyle === "long") {
      return (
        <G>
          <Path d={`M${cx - HR * 1.1},${HCy} Q${cx - HR * 1.3},${HCy + HR * 0.5} ${cx - HR * 1.1},${HCy + HR * 1.8}`}
            stroke={hair} strokeWidth={10 * s} fill="none" strokeLinecap="round" />
          <Path d={`M${cx + HR * 1.1},${HCy} Q${cx + HR * 1.3},${HCy + HR * 0.5} ${cx + HR * 1.1},${HCy + HR * 1.8}`}
            stroke={hair} strokeWidth={10 * s} fill="none" strokeLinecap="round" />
          <Path d={`M${cx - HR},${HCy - HR * 0.8} Q${cx},${HCy - HR * 1.5} ${cx + HR},${HCy - HR * 0.8} L${cx + HR},${HCy} Q${cx},${HCy - HR * 0.4} ${cx - HR},${HCy} Z`}
            fill={hair} />
        </G>
      );
    }
    if (hairStyle === "curly") {
      return (
        <G>
          <Ellipse cx={cx} cy={HCy - HR * 0.7} rx={HR * 1.15} ry={HR * 0.8} fill={hair} />
          <Ellipse cx={cx - HR * 0.9} cy={HCy - HR * 0.2} rx={HR * 0.45} ry={HR * 0.55} fill={hair} />
          <Ellipse cx={cx + HR * 0.9} cy={HCy - HR * 0.2} rx={HR * 0.45} ry={HR * 0.55} fill={hair} />
        </G>
      );
    }
    if (hairStyle === "bun") {
      return (
        <G>
          <Path d={`M${cx - HR},${HCy - HR * 0.6} Q${cx},${HCy - HR * 1.4} ${cx + HR},${HCy - HR * 0.6} L${cx + HR},${HCy} Q${cx},${HCy - HR * 0.3} ${cx - HR},${HCy} Z`}
            fill={hair} />
          <Circle cx={cx} cy={HCy - HR * 1.5} r={HR * 0.38} fill={hair} />
        </G>
      );
    }
    return (
      <Path
        d={`M${cx - HR},${HCy - HR * 0.5} Q${cx - HR * 0.2},${HCy - HR * 1.55} ${cx + HR * 0.2},${HCy - HR * 1.5} Q${cx + HR},${HCy - HR * 1.2} ${cx + HR},${HCy - HR * 0.5} Z`}
        fill={hair}
      />
    );
  }

  const noseFill = skin === SKIN_LIGHT ? "#E8A87C" : "#6B3E26";
  const mouthC   = hair === HAIR_BLACK ? "#5C3317" : HAIR_BROWN;

  return (
    <G>
      {/* legs */}
      <Rect x={lLX} y={lY} width={lW} height={lH} rx={5 * s} fill={pants} />
      <Rect x={lRX} y={lY} width={lW} height={lH} rx={5 * s} fill={pants} />
      {/* shoes */}
      <Rect x={lLX - 2 * s} y={lY + lH - 2 * s} width={shW} height={shH} rx={4 * s} fill={DARK} />
      <Rect x={lRX - 1 * s} y={lY + lH - 2 * s} width={shW} height={shH} rx={4 * s} fill={DARK} />
      {/* arm paths */}
      <Path d={`M${aLX + aW / 2},${aY} Q${aLX - 4 * s},${aY + aH * 0.5} ${aLEx + aW / 2},${aLEy}`}
        stroke={skin} strokeWidth={aW} fill="none" strokeLinecap="round" />
      <Path d={`M${aRX + aW / 2},${aY} Q${aRX + aW + 8 * s},${aY + aH * 0.5} ${aREx},${aREy}`}
        stroke={skin} strokeWidth={aW} fill="none" strokeLinecap="round" />
      {/* shirt sleeves */}
      <Path d={`M${aLX + aW / 2},${aY} Q${aLX - 4 * s},${aY + aH * 0.35} ${aLEx + aW / 2},${aY + aH * 0.44}`}
        stroke={shirt} strokeWidth={aW * 0.9} fill="none" strokeLinecap="round" />
      <Path d={`M${aRX + aW / 2},${aY} Q${aRX + aW + 8 * s},${aY + aH * 0.35} ${aREx},${aY + aH * 0.44}`}
        stroke={shirt} strokeWidth={aW * 0.9} fill="none" strokeLinecap="round" />
      {/* torso */}
      <Rect x={tX} y={tY} width={tW} height={tH} rx={7 * s} fill={shirt} />
      {/* neck */}
      <Rect x={nX} y={nY} width={nW} height={nH + 2 * s} rx={3 * s} fill={skin} />
      {/* head */}
      <Ellipse cx={HCx} cy={HCy} rx={HR} ry={HR * 1.05} fill={skin} />
      <Hair />
      {/* ears */}
      <Ellipse cx={cx - HR} cy={HCy + 1 * s} rx={3.5 * s} ry={4.5 * s} fill={skin} />
      <Ellipse cx={cx + HR} cy={HCy + 1 * s} rx={3.5 * s} ry={4.5 * s} fill={skin} />
      {/* eyebrows */}
      <Path d={`M${cx - eX - bW / 2},${bY} Q${cx - eX},${bY - 2.5 * s} ${cx - eX + bW / 2},${bY}`}
        stroke={hair} strokeWidth={2 * s} fill="none" strokeLinecap="round" />
      <Path d={`M${cx + eX - bW / 2},${bY} Q${cx + eX},${bY - 2.5 * s} ${cx + eX + bW / 2},${bY}`}
        stroke={hair} strokeWidth={2 * s} fill="none" strokeLinecap="round" />
      {/* eyes */}
      <Circle cx={cx - eX} cy={HCy + eY} r={eR} fill={W} />
      <Circle cx={cx + eX} cy={HCy + eY} r={eR} fill={W} />
      <Circle cx={cx - eX + 0.8 * s} cy={HCy + eY + 0.5 * s} r={pR + 0.8 * s} fill="#2C4A6E" />
      <Circle cx={cx + eX + 0.8 * s} cy={HCy + eY + 0.5 * s} r={pR + 0.8 * s} fill="#2C4A6E" />
      <Circle cx={cx - eX + 0.8 * s} cy={HCy + eY + 0.5 * s} r={pR} fill={DARK} />
      <Circle cx={cx + eX + 0.8 * s} cy={HCy + eY + 0.5 * s} r={pR} fill={DARK} />
      <Circle cx={cx - eX - 1.2 * s} cy={HCy + eY - 1.8 * s} r={1.2 * s} fill={W} />
      <Circle cx={cx + eX - 1.2 * s} cy={HCy + eY - 1.8 * s} r={1.2 * s} fill={W} />
      {/* blush */}
      <Ellipse cx={cx - eX - 2 * s} cy={blY} rx={4.5 * s} ry={2.5 * s} fill={CORAL} opacity={0.3} />
      <Ellipse cx={cx + eX + 2 * s} cy={blY} rx={4.5 * s} ry={2.5 * s} fill={CORAL} opacity={0.3} />
      {/* nose */}
      <Ellipse cx={cx} cy={HCy + HR * 0.18} rx={2 * s} ry={1.5 * s} fill={noseFill} opacity={0.5} />
      {/* smile */}
      <Path d={`M${mL},${mY} Q${cx},${mCY} ${mR},${mY}`}
        stroke={mouthC} strokeWidth={2 * s} fill="none" strokeLinecap="round" />
    </G>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Chat
// Scene: Two people face each other; speech bubbles with animated typing dots;
//         a heart emoji floats up between them.
// ─────────────────────────────────────────────────────────────────────────────
export function ChatIllustration({ size = 160 }: { size?: number }) {
  // Character bobs
  const bobL = useBob(0, -7, 2000, 0);
  const bobR = useBob(0, -7, 2000, 1000);

  // Typing dots in left bubble (staggered bounce)
  const d1 = useDot(5, 500, 0);
  const d2 = useDot(5, 500, 160);
  const d3 = useDot(5, 500, 320);

  // Right bubble scale pulse (message received)
  const bubR = usePulse(1, 1.06, 1200, 400);

  // Floating heart between them
  const heartY  = useBob(0, -22, 2200, 600);
  const heartOp = usePulse(0.9, 0.2, 2200, 600);

  // Star twinkle
  const tw1 = usePulse(0.3, 1, 900, 0);
  const tw2 = usePulse(0.3, 1, 700, 300);

  // Animated props
  const propsBobL   = useAnimatedProps(() => ({ transform: `translate(0, ${bobL.value})` }));
  const propsBobR   = useAnimatedProps(() => ({ transform: `translate(0, ${bobR.value})` }));
  const propsD1     = useAnimatedProps(() => ({ cy: 35 + d1.value }));
  const propsD2     = useAnimatedProps(() => ({ cy: 35 + d2.value }));
  const propsD3     = useAnimatedProps(() => ({ cy: 35 + d3.value }));
  const propsBubR   = useAnimatedProps(() => ({ transform: `scale(${bubR.value})`, transformOrigin: "142 28" } as any));
  const propsHrtY   = useAnimatedProps(() => ({ transform: `translate(0, ${heartY.value})` }));
  const propsHrtOp  = useAnimatedProps(() => ({ opacity: heartOp.value }));
  const propsTw1    = useAnimatedProps(() => ({ opacity: tw1.value }));
  const propsTw2    = useAnimatedProps(() => ({ opacity: tw2.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* ── Decorative bg ── */}
      <AnimCircle cx={22} cy={22} r={6} fill={GOLD} animatedProps={propsTw1} />
      <AnimCircle cx={178} cy={170} r={5} fill={TEAL} animatedProps={propsTw2} />
      <Circle cx={185} cy={90} r={5} fill={CORAL} opacity={0.35} />

      {/* ── Left person ── */}
      <AnimG animatedProps={propsBobL}>
        <CartoonHuman cx={58} cy={74} s={0.88}
          skin={SKIN_WARM} hair={HAIR_BLACK}
          shirt="#4FC3F7" pants="#37474F"
          hairStyle="long" facing="right"
        />
      </AnimG>

      {/* ── Right person ── */}
      <AnimG animatedProps={propsBobR}>
        <CartoonHuman cx={142} cy={74} s={0.88}
          skin={SKIN_MED} hair={HAIR_BROWN}
          shirt={GREEN} pants="#455A64"
          hairStyle="short" facing="left"
        />
      </AnimG>

      {/* ── Left speech bubble (typing) ── */}
      <Rect x={28} y={14} width={54} height={28} rx={12} fill={W} opacity={0.95} />
      <Path d="M52,42 L48,52 L62,42" fill={W} opacity={0.95} />
      <AnimCircle cx={42} animatedProps={propsD1} r={3.8} fill={TEAL} />
      <AnimCircle cx={55} animatedProps={propsD2} r={3.8} fill={TEAL} />
      <AnimCircle cx={68} animatedProps={propsD3} r={3.8} fill={TEAL} />

      {/* ── Right speech bubble (pulse) ── */}
      <AnimG animatedProps={propsBubR}>
        <Rect x={116} y={8} width={56} height={30} rx={12} fill={W} opacity={0.88} />
        <Path d="M132,38 L128,48 L142,38" fill={W} opacity={0.88} />
        <Circle cx={130} cy={23} r={3.5} fill={CORAL} />
        <Circle cx={144} cy={23} r={3.5} fill={CORAL} />
        <Circle cx={158} cy={23} r={3.5} fill={CORAL} />
      </AnimG>

      {/* ── Floating heart ── */}
      <AnimG animatedProps={propsHrtY}>
        <AnimPath
          d="M100,88 C100,88 106,82 110,86 C114,90 110,94 100,100 C90,94 86,90 90,86 C94,82 100,88 100,88 Z"
          fill={CORAL}
          animatedProps={propsHrtOp}
        />
      </AnimG>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Security
// Scene: Person gestures at a shield; shield emits sonar pulse rings;
//         lock clicks shut; checkmark glows.
// ─────────────────────────────────────────────────────────────────────────────
export function SecurityIllustration({ size = 160 }: { size?: number }) {
  const bobP = useBob(0, -6, 2100, 0);

  // Sonar ring 1 & 2 (staggered expand+fade)
  const ring1S = useBob(1, 1.5,  1400, 0);
  const ring1O = usePulse(0.7, 0,  1400, 0);
  const ring2S = useBob(1, 1.5,  1400, 700);
  const ring2O = usePulse(0.7, 0,  1400, 700);

  // Checkmark glow
  const ckOp = usePulse(0.6, 1, 1100, 200);

  // Lock subtle rock (settle animation)
  const lockR = useBob(-4, 4, 600, 0);

  const tw1 = usePulse(0.4, 1, 800, 0);

  const propsBob   = useAnimatedProps(() => ({ transform: `translate(0, ${bobP.value})` }));
  const propsR1    = useAnimatedProps(() => ({
    transform: `scale(${ring1S.value})`,
    transformOrigin: "152 90",
    opacity: ring1O.value,
  } as any));
  const propsR2    = useAnimatedProps(() => ({
    transform: `scale(${ring2S.value})`,
    transformOrigin: "152 90",
    opacity: ring2O.value,
  } as any));
  const propsCkOp  = useAnimatedProps(() => ({ opacity: ckOp.value }));
  const propsLockR = useAnimatedProps(() => ({
    transform: `rotate(${lockR.value}, 152, 90)`,
  }));
  const propsTw    = useAnimatedProps(() => ({ opacity: tw1.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <AnimCircle cx={24} cy={26} r={7} fill={GOLD} animatedProps={propsTw} />
      <Circle cx={18} cy={102} r={5} fill={W} opacity={0.3} />

      {/* ── Person ── */}
      <AnimG animatedProps={propsBob}>
        <CartoonHuman cx={66} cy={66} s={0.92}
          skin={SKIN_DARK} hair={HAIR_BLACK}
          shirt={INDIGO} pants="#263238"
          hairStyle="short" facing="right"
        />
      </AnimG>

      {/* ── Sonar rings behind shield ── */}
      <AnimG animatedProps={propsR2}>
        <Path d="M128,52 L176,52 L176,108 L152,130 L128,108 Z"
          fill="none" stroke={TEAL} strokeWidth={3} />
      </AnimG>
      <AnimG animatedProps={propsR1}>
        <Path d="M120,44 L184,44 L184,114 L152,138 L120,114 Z"
          fill="none" stroke={TEAL} strokeWidth={2} />
      </AnimG>

      {/* ── Shield ── */}
      <Path d="M130,54 L174,54 L174,108 L152,130 L130,108 Z" fill={W} opacity={0.93} />
      <Path d="M135,60 L169,60 L169,106 L152,124 L135,106 Z" fill={TEAL} opacity={0.22} />

      {/* ── Lock (rocks) ── */}
      <AnimG animatedProps={propsLockR}>
        <Rect x={140} y={84} width={24} height={18} rx={5} fill="#37474F" />
        <Path d="M143,84 Q143,72 152,72 Q161,72 161,84"
          stroke="#37474F" strokeWidth={4} fill="none" />
        <Circle cx={152} cy={93} r={4} fill={W} opacity={0.9} />
      </AnimG>

      {/* ── Checkmark glow ── */}
      <AnimPath
        d="M136,92 L147,103 L170,72"
        stroke={GREEN} strokeWidth={4.5} fill="none" strokeLinecap="round"
        animatedProps={propsCkOp}
      />

      <Star cx={180} cy={26} r={5} fill={GOLD} opacity={0.8} />
      <Star cx={24} cy={168} r={5} fill={CORAL} opacity={0.6} />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Discover
// Scene: Person explores; globe's longitude meridian rotates;
//         magnifier sweeps; location pin bounces.
// ─────────────────────────────────────────────────────────────────────────────
export function DiscoverIllustration({ size = 160 }: { size?: number }) {
  const bobP    = useBob(0, -6, 2200, 0);

  // Meridian rotation: rx oscillates 45 → 0 → -45 to fake 3-D spin
  const merRx   = useBob(46, -46, 3000, 0);

  // Magnifier sweep left-right
  const magTx   = useBob(-10, 10, 1800, 200);

  // Pin bounce
  const pinCy   = useBob(0, -6, 700, 0);

  // Star twinkle
  const tw1 = usePulse(0.3, 1, 900, 0);
  const tw2 = usePulse(0.3, 1, 1100, 400);

  const propsBob  = useAnimatedProps(() => ({ transform: `translate(0, ${bobP.value})` }));
  const propsMer  = useAnimatedProps(() => ({ rx: Math.abs(merRx.value) }));
  const propsMag  = useAnimatedProps(() => ({ transform: `translate(${magTx.value}, 0)` }));
  const propsPin  = useAnimatedProps(() => ({ transform: `translate(0, ${pinCy.value})` }));
  const propsTw1  = useAnimatedProps(() => ({ opacity: tw1.value }));
  const propsTw2  = useAnimatedProps(() => ({ opacity: tw2.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <AnimCircle cx={20} cy={32} r={6} fill={GOLD} animatedProps={propsTw1} />
      <AnimCircle cx={178} cy={22} r={5} fill={W}    animatedProps={propsTw2} />
      <Circle cx={186} cy={148} r={6} fill={CORAL} opacity={0.5} />

      {/* ── Globe ── */}
      <Circle cx={142} cy={106} r={46} fill={W} opacity={0.14} />
      <Circle cx={142} cy={106} r={46} fill="none" stroke={W} strokeWidth={2.5} />
      <Ellipse cx={142} cy={106} rx={46} ry={14} fill="none" stroke={W} strokeWidth={1.4} opacity={0.55} />
      {/* Animated meridian — rx oscillates to give rotation illusion */}
      <AnimEllipse cx={142} cy={106} ry={46} fill="none" stroke={W} strokeWidth={1.4} opacity={0.55}
        animatedProps={propsMer} />
      <Line x1={142} y1={60} x2={142} y2={152} stroke={W} strokeWidth={0.8} opacity={0.4} />
      <Line x1={96}  y1={106} x2={188} y2={106} stroke={W} strokeWidth={0.8} opacity={0.4} />

      {/* ── Bouncing location pin ── */}
      <AnimG animatedProps={propsPin}>
        <Circle cx={155} cy={86} r={7} fill={CORAL} />
        <Path d="M155,93 L152,104 L155,100 L158,104 Z" fill={CORAL} />
        <Circle cx={155} cy={86} r={3} fill={W} opacity={0.8} />
      </AnimG>

      {/* ── Person ── */}
      <AnimG animatedProps={propsBob}>
        <CartoonHuman cx={55} cy={68} s={0.88}
          skin={SKIN_LIGHT} hair={HAIR_DARK}
          shirt="#26A69A" pants="#37474F"
          hairStyle="bun" facing="right"
        />
      </AnimG>

      {/* ── Magnifier sweep ── */}
      <AnimG animatedProps={propsMag}>
        <Circle cx={107} cy={106} r={13} fill="none" stroke={W} strokeWidth={3.5} />
        <Line x1={116} y1={115} x2={124} y2={123} stroke={W} strokeWidth={3.5} strokeLinecap="round" />
      </AnimG>

      <Star cx={20} cy={172} r={5} fill={TEAL} opacity={0.7} />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — AfuAI
// Scene: Robot with bobbing antenna; eyes pulse with glow;
//         chest-panel lights cycle red→yellow→green;
//         a particle orbits the robot.
// ─────────────────────────────────────────────────────────────────────────────
export function AfuAIIllustration({ size = 160 }: { size?: number }) {
  // Antenna bob
  const antY = useBob(0, -6, 900, 0);

  // Eye glow pulse
  const eyeOp = usePulse(0.7, 1, 800, 0);

  // Chest light cycle (each light blinks in turn)
  const l1Op = usePulse(0.2, 1, 1500, 0);
  const l2Op = usePulse(0.2, 1, 1500, 500);
  const l3Op = usePulse(0.2, 1, 1500, 1000);

  // Orbiting particle (circular path around robot)
  const orb  = useSpin(3500, 0);

  // Human beside robot: gentle bob
  const bobH = useBob(0, -5, 2000, 600);

  // Thinking bubble float
  const thkY = useBob(0, -8, 1800, 200);
  const thkO = usePulse(0.5, 0.9, 1800, 200);

  const propsAnt  = useAnimatedProps(() => ({ transform: `translate(0, ${antY.value})` }));
  const propsEye  = useAnimatedProps(() => ({ opacity: eyeOp.value }));
  const propsL1   = useAnimatedProps(() => ({ opacity: l1Op.value }));
  const propsL2   = useAnimatedProps(() => ({ opacity: l2Op.value }));
  const propsL3   = useAnimatedProps(() => ({ opacity: l3Op.value }));
  const propsOrb  = useAnimatedProps(() => ({
    cx: 100 + Math.cos(orb.value) * 60,
    cy: 100 + Math.sin(orb.value) * 25,
  }));
  const propsBobH = useAnimatedProps(() => ({ transform: `translate(0, ${bobH.value})` }));
  const propsThk  = useAnimatedProps(() => ({
    transform: `translate(0, ${thkY.value})`,
    opacity: thkO.value,
  } as any));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={28} cy={42} r={8} fill={GOLD} opacity={0.9} />
      <Star cx={172} cy={38} r={6} fill={TEAL} opacity={0.9} />
      <Star cx={32} cy={155} r={5} fill={CORAL} opacity={0.7} />
      <Star cx={168} cy={158} r={7} fill={GOLD} opacity={0.8} />

      {/* ── Robot body ── */}
      <Rect x={56} y={30} width={88} height={66} rx={12} fill={W} opacity={0.95} />

      {/* ── Antenna (bobs) ── */}
      <AnimG animatedProps={propsAnt}>
        <Line x1={100} y1={30} x2={100} y2={14} stroke={W} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={100} cy={11} r={8} fill={TEAL} />
        <Circle cx={100} cy={11} r={4} fill={W} />
      </AnimG>

      {/* ── Eyes (glow) ── */}
      <Circle cx={78} cy={58} r={14} fill={TEAL} opacity={0.95} />
      <Circle cx={122} cy={58} r={14} fill={TEAL} opacity={0.95} />
      <AnimCircle cx={78} cy={58} r={16} fill={TEAL} animatedProps={propsEye} />
      <AnimCircle cx={122} cy={58} r={16} fill={TEAL} animatedProps={propsEye} />
      <Circle cx={78} cy={58} r={7} fill={W} />
      <Circle cx={122} cy={58} r={7} fill={W} />
      <Circle cx={78} cy={58} r={3.5} fill={DARK} />
      <Circle cx={122} cy={58} r={3.5} fill={DARK} />

      {/* ── Mouth ── */}
      <Rect x={74} y={78} width={52} height={10} rx={5} fill={TEAL} opacity={0.8} />

      {/* ── Ear bolts ── */}
      <Circle cx={56} cy={60} r={7} fill={W} opacity={0.8} />
      <Circle cx={144} cy={60} r={7} fill={W} opacity={0.8} />

      {/* ── Body ── */}
      <Rect x={64} y={98} width={72} height={62} rx={12} fill={W} opacity={0.9} />
      <Rect x={76} y={110} width={48} height={28} rx={7} fill={TEAL} opacity={0.25} />

      {/* ── Chest lights cycle ── */}
      <AnimCircle cx={88} cy={124} r={5.5} fill={CORAL} animatedProps={propsL1} />
      <AnimCircle cx={100} cy={124} r={5.5} fill={GOLD} animatedProps={propsL2} />
      <AnimCircle cx={112} cy={124} r={5.5} fill={GREEN} animatedProps={propsL3} />

      {/* ── Arms ── */}
      <Rect x={40} y={102} width={24} height={38} rx={10} fill={W} opacity={0.88} />
      <Rect x={136} y={102} width={24} height={38} rx={10} fill={W} opacity={0.88} />

      {/* ── Orbiting particle ── */}
      <AnimCircle r={5} fill={GOLD} opacity={0.85} animatedProps={propsOrb} />

      {/* ── Thinking bubbles ── */}
      <AnimG animatedProps={propsThk}>
        <Circle cx={56} cy={24} r={4} fill={W} opacity={0.6} />
        <Circle cx={48} cy={16} r={3} fill={W} opacity={0.5} />
        <Circle cx={42} cy={10} r={2} fill={W} opacity={0.4} />
      </AnimG>

      {/* ── Human user beside robot ── */}
      <AnimG animatedProps={propsBobH}>
        <CartoonHuman cx={170} cy={98} s={0.6}
          skin={SKIN_WARM} hair={HAIR_BROWN}
          shirt={PURPLE} pants="#4A148C"
          hairStyle="short" facing="left"
        />
      </AnimG>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Wallet / ACoins
// Scene: Coin flips (scaleX oscillates); sparkles float up and fade;
//         two people reach toward the coin from opposite sides.
// ─────────────────────────────────────────────────────────────────────────────
export function WalletIllustration({ size = 160 }: { size?: number }) {
  const bobL = useBob(0, -6, 2100, 0);
  const bobR = useBob(0, -6, 2100, 1050);

  // Coin flip: scaleX 1 → 0 → -1 → 0 → 1 (3-D flip)
  const flip = useBob(-1, 1, 1200, 0);

  // 3 sparkle particles: each floats up and fades
  const sp1Y = useBob(0, -18, 1600, 0);
  const sp1O = usePulse(1, 0,   1600, 0);
  const sp2Y = useBob(0, -18, 1600, 530);
  const sp2O = usePulse(1, 0,   1600, 530);
  const sp3Y = useBob(0, -18, 1600, 1060);
  const sp3O = usePulse(1, 0,   1600, 1060);

  // Coin face rotate (A symbol)
  const coinSpin = useSpin(3000, 0);

  const propsBobL = useAnimatedProps(() => ({ transform: `translate(0, ${bobL.value})` }));
  const propsBobR = useAnimatedProps(() => ({ transform: `translate(0, ${bobR.value})` }));
  const propsFlip = useAnimatedProps(() => ({
    transform: `scale(${flip.value}, 1)`,
    transformOrigin: "100 104",
  } as any));
  const propsSp1  = useAnimatedProps(() => ({
    transform: `translate(0, ${sp1Y.value})`,
    opacity: sp1O.value,
  } as any));
  const propsSp2  = useAnimatedProps(() => ({
    transform: `translate(0, ${sp2Y.value})`,
    opacity: sp2O.value,
  } as any));
  const propsSp3  = useAnimatedProps(() => ({
    transform: `translate(0, ${sp3Y.value})`,
    opacity: sp3O.value,
  } as any));
  const propsALetter = useAnimatedProps(() => ({
    transform: `rotate(${(coinSpin.value * 180) / Math.PI}, 100, 104)`,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={22} cy={30} r={7} fill={GOLD} />
      <Star cx={178} cy={165} r={6} fill={GOLD} opacity={0.8} />
      <Circle cx={18} cy={155} r={5} fill={CORAL} opacity={0.5} />

      {/* ── Left person ── */}
      <AnimG animatedProps={propsBobL}>
        <CartoonHuman cx={46} cy={70} s={0.84}
          skin={SKIN_DARK} hair={HAIR_BLACK}
          shirt={CORAL} pants="#BF360C"
          hairStyle="curly" facing="right"
        />
      </AnimG>

      {/* ── Right person ── */}
      <AnimG animatedProps={propsBobR}>
        <CartoonHuman cx={158} cy={70} s={0.84}
          skin={SKIN_LIGHT} hair={HAIR_DARK}
          shirt={GOLD} pants="#455A64"
          hairStyle="long" facing="left"
        />
      </AnimG>

      {/* ── Coin shadow ── */}
      <Ellipse cx={102} cy={114} rx={26} ry={7} fill={DARK} opacity={0.18} />

      {/* ── Flipping coin ── */}
      <AnimG animatedProps={propsFlip}>
        <Circle cx={100} cy={104} r={30} fill={GOLD} opacity={0.93} />
        <Circle cx={100} cy={104} r={30} fill="none" stroke={W} strokeWidth={2} opacity={0.55} />
        <AnimG animatedProps={propsALetter}>
          <Path d="M91,118 L100,89 L109,118"
            stroke={W} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1={94} y1={110} x2={106} y2={110} stroke={W} strokeWidth={3.2} strokeLinecap="round" />
        </AnimG>
      </AnimG>

      {/* ── Sparkles float up ── */}
      <AnimG animatedProps={propsSp1}>
        <Star cx={100} cy={70} r={5} fill={GOLD} />
      </AnimG>
      <AnimG animatedProps={propsSp2}>
        <Star cx={115} cy={74} r={4} fill={W} />
      </AnimG>
      <AnimG animatedProps={propsSp3}>
        <Star cx={85} cy={76} r={4} fill={CORAL} />
      </AnimG>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — Community
// Scene: Three diverse people bob at different rates; connection lines
//         pulse; heart above centre person beats; small hearts float up.
// ─────────────────────────────────────────────────────────────────────────────
export function CommunityIllustration({ size = 160 }: { size?: number }) {
  const bobC = useBob(0, -7, 2000, 0);
  const bobL = useBob(0, -7, 2200, 700);
  const bobR = useBob(0, -7, 1900, 1300);

  // Heart beat: quick compress then release
  const heartS = usePulse(1, 1.3, 700, 0);

  // Connection line pulse
  const lineO = usePulse(0.3, 0.8, 1500, 0);

  // Floating hearts from each person
  const fh1Y = useBob(0, -20, 2000, 0);
  const fh1O = usePulse(0.8, 0,  2000, 0);
  const fh2Y = useBob(0, -20, 2000, 660);
  const fh2O = usePulse(0.8, 0,  2000, 660);
  const fh3Y = useBob(0, -20, 2000, 1320);
  const fh3O = usePulse(0.8, 0,  2000, 1320);

  // Star twinkle
  const tw = usePulse(0.3, 1, 1000, 0);

  const propsBobC  = useAnimatedProps(() => ({ transform: `translate(0, ${bobC.value})` }));
  const propsBobL  = useAnimatedProps(() => ({ transform: `translate(0, ${bobL.value})` }));
  const propsBobR  = useAnimatedProps(() => ({ transform: `translate(0, ${bobR.value})` }));
  const propsHrtS  = useAnimatedProps(() => ({
    transform: `scale(${heartS.value})`,
    transformOrigin: "100 40",
  } as any));
  const propsLineO = useAnimatedProps(() => ({ opacity: lineO.value }));
  const propsFh1   = useAnimatedProps(() => ({
    transform: `translate(0, ${fh1Y.value})`,
    opacity: fh1O.value,
  } as any));
  const propsFh2   = useAnimatedProps(() => ({
    transform: `translate(0, ${fh2Y.value})`,
    opacity: fh2O.value,
  } as any));
  const propsFh3   = useAnimatedProps(() => ({
    transform: `translate(0, ${fh3Y.value})`,
    opacity: fh3O.value,
  } as any));
  const propsTw    = useAnimatedProps(() => ({ opacity: tw.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <AnimCircle cx={25} cy={28} r={7} fill={GOLD} animatedProps={propsTw} />
      <Circle cx={185} cy={68} r={5} fill={CORAL} opacity={0.4} />

      {/* ── Connection lines (pulsing) ── */}
      <AnimG animatedProps={propsLineO}>
        <Line x1={60} y1={128} x2={100} y2={84} stroke={W} strokeWidth={2.5} strokeDasharray="5,5" />
        <Line x1={140} y1={128} x2={100} y2={84} stroke={W} strokeWidth={2.5} strokeDasharray="5,5" />
        <Line x1={60}  y1={128} x2={140} y2={128} stroke={W} strokeWidth={2.5} strokeDasharray="5,5" />
      </AnimG>

      {/* ── Centre person ── */}
      <AnimG animatedProps={propsBobC}>
        <CartoonHuman cx={100} cy={56} s={0.82}
          skin={SKIN_WARM} hair={HAIR_BLACK}
          shirt={PINK} pants="#880E4F"
          hairStyle="bun" facing="front"
        />
      </AnimG>

      {/* ── Beating heart ── */}
      <AnimG animatedProps={propsHrtS}>
        <Path
          d="M100,42 C100,42 106,36 110,40 C114,44 110,48 100,54 C90,48 86,44 90,40 C94,36 100,42 100,42 Z"
          fill={CORAL} opacity={0.9}
        />
      </AnimG>

      {/* ── Bottom-left person ── */}
      <AnimG animatedProps={propsBobL}>
        <CartoonHuman cx={48} cy={112} s={0.76}
          skin={SKIN_DARK} hair={HAIR_BLACK}
          shirt={TEAL} pants="#006064"
          hairStyle="curly" facing="right"
        />
      </AnimG>

      {/* ── Bottom-right person ── */}
      <AnimG animatedProps={propsBobR}>
        <CartoonHuman cx={152} cy={112} s={0.76}
          skin={SKIN_MED} hair={HAIR_BROWN}
          shirt={GREEN} pants="#1B5E20"
          hairStyle="short" facing="left"
        />
      </AnimG>

      {/* ── Floating hearts from each person ── */}
      <AnimG animatedProps={propsFh1}>
        <Path d="M100,56 C100,56 103,53 105,55 C107,57 105,59 100,62 C95,59 93,57 95,55 C97,53 100,56 100,56 Z"
          fill={CORAL} />
      </AnimG>
      <AnimG animatedProps={propsFh2}>
        <Path d="M48,112 C48,112 51,109 53,111 C55,113 53,115 48,118 C43,115 41,113 43,111 C45,109 48,112 48,112 Z"
          fill={CORAL} />
      </AnimG>
      <AnimG animatedProps={propsFh3}>
        <Path d="M152,112 C152,112 155,109 157,111 C159,113 157,115 152,118 C147,115 145,113 147,111 C149,109 152,112 152,112 Z"
          fill={CORAL} />
      </AnimG>

      {/* Stars above side characters */}
      <Star cx={48}  cy={100} r={5} fill={GOLD}  opacity={0.8} />
      <Star cx={152} cy={100} r={5} fill={TEAL}  opacity={0.8} />
      <Star cx={175} cy={162} r={6} fill={TEAL}  opacity={0.7} />
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
