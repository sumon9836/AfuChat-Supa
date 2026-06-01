/**
 * AfuChat Owl Mascot — motion-graphics illustrations for the onboarding carousel.
 *
 * The owl IS the platform identity.
 *
 * Built with:
 *   • Reanimated v4  — UI-thread worklets, 60 fps, zero JS thread
 *   • react-native-svg v15
 *
 * ⚠  transformOrigin is intentionally avoided throughout.
 *    Scaling around a pivot (px,py) uses the standard SVG trick:
 *      translate(px,py) scale(s) translate(-px,-py)
 */

import React, { useEffect } from "react";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Circle, Ellipse, G, Line, Path, Polygon, Rect,
} from "react-native-svg";

// ── Animated SVG primitives ───────────────────────────────────────────────────
const AnimG       = Animated.createAnimatedComponent(G);
const AnimCircle  = Animated.createAnimatedComponent(Circle);
const AnimEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimPath    = Animated.createAnimatedComponent(Path);
const AnimLine    = Animated.createAnimatedComponent(Line);

// ── Palette ───────────────────────────────────────────────────────────────────
const W      = "#FFFFFF";
const DARK   = "#0D1321";
const TEAL   = "#00BCD4";
const CORAL  = "#FF7043";
const GOLD   = "#FFB300";
const GREEN  = "#66BB6A";
const PINK   = "#E91E63";
const INDIGO = "#5C6BC0";
const PURPLE = "#AB47BC";

// Owl feather palettes
const OWL_BLUE   = { feathers: "#1565C0", belly: "#BBDEFB", eye: TEAL,   beak: GOLD  };
const OWL_TEAL   = { feathers: "#00838F", belly: "#B2EBF2", eye: "#FFEB3B", beak: GOLD };
const OWL_BROWN  = { feathers: "#5D4037", belly: "#FFCCBC", eye: TEAL,   beak: GOLD  };
const OWL_GREY   = { feathers: "#546E7A", belly: "#ECEFF1", eye: CORAL,  beak: GOLD  };
const OWL_PURPLE = { feathers: "#6A1B9A", belly: "#E1BEE7", eye: GOLD,   beak: CORAL };
const OWL_GREEN  = { feathers: "#2E7D32", belly: "#C8E6C9", eye: GOLD,   beak: CORAL };

// ── Animation helpers ─────────────────────────────────────────────────────────

/** Smooth infinite ping-pong between `a` and `b`. */
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

/** Same as useBob but semantically for opacity/scale pulses. */
const usePulse = useBob;

/** Infinite linear spin from 0 → 2π. */
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

// ── Decorative star ───────────────────────────────────────────────────────────
function Star({ cx, cy, r, fill, opacity = 1 }: {
  cx: number; cy: number; r: number; fill: string; opacity?: number;
}) {
  const ri  = r * 0.38;
  const pts = `${cx},${cy - r} ${cx + ri},${cy - ri} ${cx + r},${cy} ${cx + ri},${cy + ri} ${cx},${cy + r} ${cx - ri},${cy + ri} ${cx - r},${cy} ${cx - ri},${cy - ri}`;
  return <Polygon points={pts} fill={fill} opacity={opacity} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// AfuChat Owl Mascot
//
//  cx, cy = top-centre of the character in SVG units
//  s      = uniform scale (default 1 → ≈ 88px tall in 200×200 viewBox)
// ─────────────────────────────────────────────────────────────────────────────
function Owl({
  cx, cy, s = 1,
  feathers = OWL_BLUE.feathers,
  belly    = OWL_BLUE.belly,
  eye      = OWL_BLUE.eye,
  beak     = GOLD,
}: {
  cx: number; cy: number; s?: number;
  feathers?: string; belly?: string; eye?: string; beak?: string;
}) {
  // ── Geometry ──────────────────────────────────────────────
  const hr  = 22 * s;   // head radius
  const hcy = cy + hr;  // head centre y

  const brx = 18 * s, bry = 25 * s;
  const bcy = hcy + hr + bry - 6 * s;  // body centre y

  const er  = 9.5 * s;  // eye radius (big — owl!)
  const eo  = 8.5 * s;  // eye x-offset
  const eyY = hcy - 1 * s;
  const pr  = 4.8 * s;  // pupil radius

  const footY = bcy + bry - 2 * s;

  return (
    <G>
      {/* ── Body ── */}
      <Ellipse cx={cx} cy={bcy} rx={brx} ry={bry} fill={feathers} />

      {/* ── Belly (lighter oval) ── */}
      <Ellipse cx={cx} cy={bcy + 4 * s} rx={brx * 0.58} ry={bry * 0.72} fill={belly} opacity={0.88} />

      {/* ── Feather-stripe details on belly ── */}
      <Path
        d={`M${cx - 7 * s},${bcy - 4 * s} Q${cx},${bcy - 8 * s} ${cx + 7 * s},${bcy - 4 * s}`}
        stroke={feathers} strokeWidth={1.5 * s} fill="none" opacity={0.4}
      />
      <Path
        d={`M${cx - 6 * s},${bcy + 4 * s} Q${cx},${bcy} ${cx + 6 * s},${bcy + 4 * s}`}
        stroke={feathers} strokeWidth={1.5 * s} fill="none" opacity={0.4}
      />

      {/* ── Wings ── */}
      <Path
        d={`M${cx - brx + 2 * s},${bcy - bry * 0.35} Q${cx - brx * 2.1},${bcy + 2 * s} ${cx - brx * 1.3},${bcy + bry * 0.75}`}
        stroke={feathers} strokeWidth={10 * s} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M${cx + brx - 2 * s},${bcy - bry * 0.35} Q${cx + brx * 2.1},${bcy + 2 * s} ${cx + brx * 1.3},${bcy + bry * 0.75}`}
        stroke={feathers} strokeWidth={10 * s} fill="none" strokeLinecap="round"
      />
      {/* Wing highlights */}
      <Path
        d={`M${cx - brx + 2 * s},${bcy - bry * 0.35} Q${cx - brx * 1.8},${bcy} ${cx - brx * 1.2},${bcy + bry * 0.5}`}
        stroke={belly} strokeWidth={3 * s} fill="none" strokeLinecap="round" opacity={0.4}
      />
      <Path
        d={`M${cx + brx - 2 * s},${bcy - bry * 0.35} Q${cx + brx * 1.8},${bcy} ${cx + brx * 1.2},${bcy + bry * 0.5}`}
        stroke={belly} strokeWidth={3 * s} fill="none" strokeLinecap="round" opacity={0.4}
      />

      {/* ── Head ── */}
      <Circle cx={cx} cy={hcy} r={hr} fill={feathers} />

      {/* ── Facial disc (lighter ring on face) ── */}
      <Ellipse cx={cx} cy={hcy + 2 * s} rx={hr * 0.78} ry={hr * 0.82}
        fill={belly} opacity={0.42} />

      {/* ── Ear tufts ── */}
      <Path
        d={`M${cx - 12 * s},${cy + 2 * s} L${cx - 7 * s},${cy - 10 * s} L${cx - 2 * s},${cy + 2 * s}`}
        fill={feathers}
      />
      <Path
        d={`M${cx + 2 * s},${cy + 2 * s} L${cx + 7 * s},${cy - 10 * s} L${cx + 12 * s},${cy + 2 * s}`}
        fill={feathers}
      />

      {/* ── Eyes: sclera ── */}
      <Circle cx={cx - eo} cy={eyY} r={er + 1.5 * s} fill={W} />
      <Circle cx={cx + eo} cy={eyY} r={er + 1.5 * s} fill={W} />

      {/* ── Eyes: iris ── */}
      <Circle cx={cx - eo} cy={eyY} r={er} fill={eye} />
      <Circle cx={cx + eo} cy={eyY} r={er} fill={eye} />

      {/* ── Eyes: pupil ── */}
      <Circle cx={cx - eo + 1.2 * s} cy={eyY + 1 * s} r={pr} fill={DARK} />
      <Circle cx={cx + eo + 1.2 * s} cy={eyY + 1 * s} r={pr} fill={DARK} />

      {/* ── Eyes: shine ── */}
      <Circle cx={cx - eo - 2.5 * s} cy={eyY - 3 * s} r={2.2 * s} fill={W} />
      <Circle cx={cx + eo - 2.5 * s} cy={eyY - 3 * s} r={2.2 * s} fill={W} />

      {/* ── Beak ── */}
      <Path
        d={`M${cx},${eyY + er * 0.6} L${cx - 5.5 * s},${eyY + er * 1.6} L${cx + 5.5 * s},${eyY + er * 1.6} Z`}
        fill={beak}
      />
      {/* beak ridge */}
      <Line
        x1={cx} y1={eyY + er * 0.6}
        x2={cx} y2={eyY + er * 1.6}
        stroke={DARK} strokeWidth={0.8 * s} opacity={0.3}
      />

      {/* ── Feet / talons ── */}
      <Path
        d={`M${cx - 7 * s},${footY} L${cx - 12 * s},${footY + 9 * s} M${cx - 7 * s},${footY} L${cx - 7 * s},${footY + 9 * s} M${cx - 7 * s},${footY} L${cx - 2 * s},${footY + 9 * s}`}
        stroke={beak} strokeWidth={2.2 * s} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M${cx + 7 * s},${footY} L${cx + 2 * s},${footY + 9 * s} M${cx + 7 * s},${footY} L${cx + 7 * s},${footY + 9 * s} M${cx + 7 * s},${footY} L${cx + 12 * s},${footY + 9 * s}`}
        stroke={beak} strokeWidth={2.2 * s} fill="none" strokeLinecap="round"
      />
    </G>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Chat
// Two owls facing each other; left has animated typing dots; right bubble
// pulses; a heart floats up between them.
// ─────────────────────────────────────────────────────────────────────────────
export function ChatIllustration({ size = 160 }: { size?: number }) {
  const bobL  = useBob(0, -7, 2000, 0);
  const bobR  = useBob(0, -7, 2000, 1000);

  // Typing dots (staggered bounce)
  const d1 = useBob(0, -5.5, 500, 0);
  const d2 = useBob(0, -5.5, 500, 160);
  const d3 = useBob(0, -5.5, 500, 320);

  // Right bubble heartbeat
  const bubS = usePulse(1, 1.07, 1200, 400);

  // Floating heart
  const htY = useBob(0, -22, 2200, 600);
  const htO = usePulse(0.9, 0.1, 2200, 600);

  // Twinkle stars
  const tw1 = usePulse(0.2, 1, 900, 0);
  const tw2 = usePulse(0.2, 1, 700, 300);

  const pL   = useAnimatedProps(() => ({ transform: `translate(0,${bobL.value})` }));
  const pR   = useAnimatedProps(() => ({ transform: `translate(0,${bobR.value})` }));
  const pD1  = useAnimatedProps(() => ({ cy: 35 + d1.value }));
  const pD2  = useAnimatedProps(() => ({ cy: 35 + d2.value }));
  const pD3  = useAnimatedProps(() => ({ cy: 35 + d3.value }));
  // bubble scale around its centre (55, 28)
  const pBub = useAnimatedProps(() => ({
    transform: `translate(55,28) scale(${bubS.value}) translate(-55,-28)`,
  }));
  const pHtY = useAnimatedProps(() => ({ transform: `translate(0,${htY.value})` }));
  const pHtO = useAnimatedProps(() => ({ opacity: htO.value }));
  const pTw1 = useAnimatedProps(() => ({ opacity: tw1.value }));
  const pTw2 = useAnimatedProps(() => ({ opacity: tw2.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <AnimCircle cx={22} cy={22} r={6} fill={GOLD}  animatedProps={pTw1} />
      <AnimCircle cx={178} cy={170} r={5} fill={TEAL} animatedProps={pTw2} />
      <Circle cx={185} cy={90} r={5} fill={CORAL} opacity={0.3} />

      {/* ── Left owl (blue) ── */}
      <AnimG animatedProps={pL}>
        <Owl cx={58} cy={70} s={0.85}
          feathers={OWL_BLUE.feathers} belly={OWL_BLUE.belly}
          eye={OWL_BLUE.eye} beak={OWL_BLUE.beak} />
      </AnimG>

      {/* ── Right owl (green) ── */}
      <AnimG animatedProps={pR}>
        <Owl cx={142} cy={70} s={0.85}
          feathers={OWL_GREEN.feathers} belly={OWL_GREEN.belly}
          eye={OWL_GREEN.eye} beak={OWL_GREEN.beak} />
      </AnimG>

      {/* ── Left bubble — typing ── */}
      <Rect x={26} y={14} width={58} height={30} rx={13} fill={W} opacity={0.95} />
      <Path d="M50,44 L46,54 L60,44" fill={W} opacity={0.95} />
      <AnimCircle cx={40} animatedProps={pD1} r={4} fill={TEAL} />
      <AnimCircle cx={55} animatedProps={pD2} r={4} fill={TEAL} />
      <AnimCircle cx={70} animatedProps={pD3} r={4} fill={TEAL} />

      {/* ── Right bubble — pulse ── */}
      <AnimG animatedProps={pBub}>
        <Rect x={116} y={8} width={58} height={30} rx={13} fill={W} opacity={0.88} />
        <Path d="M136,38 L132,48 L146,38" fill={W} opacity={0.88} />
        <Circle cx={130} cy={23} r={4} fill={CORAL} />
        <Circle cx={145} cy={23} r={4} fill={CORAL} />
        <Circle cx={160} cy={23} r={4} fill={CORAL} />
      </AnimG>

      {/* ── Floating heart ── */}
      <AnimG animatedProps={pHtY}>
        <AnimPath
          d="M100,88 C100,88 106,82 110,86 C114,90 110,94 100,100 C90,94 86,90 90,86 C94,82 100,88 100,88 Z"
          fill={CORAL} animatedProps={pHtO}
        />
      </AnimG>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Security
// Owl beside a shield; sonar rings expand from shield centre;
// checkmark pulses; lock gently rocks.
// ─────────────────────────────────────────────────────────────────────────────
export function SecurityIllustration({ size = 160 }: { size?: number }) {
  const bobP  = useBob(0, -6, 2100, 0);

  // Sonar rings expanding from shield centre (152, 90)
  const r1S = usePulse(1, 1.55, 1400, 0);
  const r1O = usePulse(0.65, 0,  1400, 0);
  const r2S = usePulse(1, 1.55, 1400, 700);
  const r2O = usePulse(0.65, 0,  1400, 700);

  // Checkmark opacity glow
  const ckO = usePulse(0.55, 1, 1100, 200);

  // Lock rock
  const lkR = useBob(-4, 4, 650, 0);

  const tw = usePulse(0.3, 1, 800, 0);

  const pBob = useAnimatedProps(() => ({ transform: `translate(0,${bobP.value})` }));
  // sonar rings scaled around shield centre (152, 90)
  const pR1  = useAnimatedProps(() => ({
    transform: `translate(152,90) scale(${r1S.value}) translate(-152,-90)`,
    opacity: r1O.value,
  } as any));
  const pR2  = useAnimatedProps(() => ({
    transform: `translate(152,90) scale(${r2S.value}) translate(-152,-90)`,
    opacity: r2O.value,
  } as any));
  const pCk  = useAnimatedProps(() => ({ opacity: ckO.value }));
  // lock rocked around its centre (152, 92)
  const pLk  = useAnimatedProps(() => ({
    transform: `translate(152,92) rotate(${lkR.value}) translate(-152,-92)`,
  }));
  const pTw  = useAnimatedProps(() => ({ opacity: tw.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <AnimCircle cx={24} cy={26} r={7} fill={GOLD} animatedProps={pTw} />
      <Circle cx={18} cy={102} r={5} fill={W} opacity={0.3} />

      {/* ── Owl (dark indigo) ── */}
      <AnimG animatedProps={pBob}>
        <Owl cx={64} cy={64} s={0.9}
          feathers={OWL_GREY.feathers} belly={OWL_GREY.belly}
          eye={OWL_GREY.eye} beak={OWL_GREY.beak} />
      </AnimG>

      {/* ── Sonar rings behind shield ── */}
      <AnimG animatedProps={pR2}>
        <Path d="M128,52 L176,52 L176,108 L152,130 L128,108 Z"
          fill="none" stroke={TEAL} strokeWidth={3} />
      </AnimG>
      <AnimG animatedProps={pR1}>
        <Path d="M120,44 L184,44 L184,116 L152,140 L120,116 Z"
          fill="none" stroke={TEAL} strokeWidth={2} />
      </AnimG>

      {/* ── Shield ── */}
      <Path d="M130,54 L174,54 L174,108 L152,130 L130,108 Z" fill={W} opacity={0.93} />
      <Path d="M135,60 L169,60 L169,106 L152,124 L135,106 Z" fill={TEAL} opacity={0.2} />

      {/* ── Lock (rocks around its centre) ── */}
      <AnimG animatedProps={pLk}>
        <Rect x={140} y={84} width={24} height={18} rx={5} fill="#37474F" />
        <Path d="M143,84 Q143,72 152,72 Q161,72 161,84"
          stroke="#37474F" strokeWidth={4} fill="none" />
        <Circle cx={152} cy={93} r={4} fill={W} opacity={0.9} />
      </AnimG>

      {/* ── Animated checkmark ── */}
      <AnimPath
        d="M136,92 L147,103 L170,72"
        stroke={GREEN} strokeWidth={4.5} fill="none" strokeLinecap="round"
        animatedProps={pCk}
      />

      <Star cx={180} cy={26} r={5} fill={GOLD} opacity={0.8} />
      <Star cx={24}  cy={168} r={5} fill={CORAL} opacity={0.6} />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Discover
// Owl on a branch; globe spins (meridian rx oscillates); magnifier sweeps;
// pin bounces on the globe.
// ─────────────────────────────────────────────────────────────────────────────
export function DiscoverIllustration({ size = 160 }: { size?: number }) {
  const bobP   = useBob(0, -6, 2200, 0);
  // Meridian rx: 46 → -46 gives a 3-D rotation illusion
  const merRx  = useBob(46, -46, 3000, 0);
  // Magnifier left-right sweep
  const magTx  = useBob(-10, 10, 1800, 200);
  // Pin bounce
  const pinCy  = useBob(0, -7, 700, 0);

  const tw1 = usePulse(0.3, 1, 900, 0);
  const tw2 = usePulse(0.3, 1, 1100, 400);

  const pBob = useAnimatedProps(() => ({ transform: `translate(0,${bobP.value})` }));
  const pMer = useAnimatedProps(() => ({ rx: Math.abs(merRx.value) }));
  const pMag = useAnimatedProps(() => ({ transform: `translate(${magTx.value},0)` }));
  const pPin = useAnimatedProps(() => ({ transform: `translate(0,${pinCy.value})` }));
  const pTw1 = useAnimatedProps(() => ({ opacity: tw1.value }));
  const pTw2 = useAnimatedProps(() => ({ opacity: tw2.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <AnimCircle cx={20} cy={32} r={6} fill={GOLD} animatedProps={pTw1} />
      <AnimCircle cx={178} cy={22} r={5} fill={W}   animatedProps={pTw2} />
      <Circle cx={186} cy={148} r={6} fill={CORAL} opacity={0.5} />

      {/* ── Globe ── */}
      <Circle cx={142} cy={106} r={46} fill={W} opacity={0.13} />
      <Circle cx={142} cy={106} r={46} fill="none" stroke={W} strokeWidth={2.5} />
      <Ellipse cx={142} cy={106} rx={46} ry={14}
        fill="none" stroke={W} strokeWidth={1.4} opacity={0.55} />
      {/* Animated meridian — rx oscillates to fake 3-D spin */}
      <AnimEllipse cx={142} cy={106} ry={46}
        fill="none" stroke={W} strokeWidth={1.4} opacity={0.55}
        animatedProps={pMer} />
      <Line x1={142} y1={60}  x2={142} y2={152} stroke={W} strokeWidth={0.8} opacity={0.4} />
      <Line x1={96}  y1={106} x2={188} y2={106} stroke={W} strokeWidth={0.8} opacity={0.4} />

      {/* ── Bouncing location pin ── */}
      <AnimG animatedProps={pPin}>
        <Circle cx={155} cy={86} r={7} fill={CORAL} />
        <Path d="M155,93 L151,104 L155,100 L159,104 Z" fill={CORAL} />
        <Circle cx={155} cy={86} r={3} fill={W} opacity={0.85} />
      </AnimG>

      {/* ── Branch for owl to perch on ── */}
      <Path d="M14,138 Q40,128 70,134" stroke="#5D4037" strokeWidth={6} fill="none"
        strokeLinecap="round" opacity={0.7} />

      {/* ── Owl (brown) ── */}
      <AnimG animatedProps={pBob}>
        <Owl cx={46} cy={62} s={0.88}
          feathers={OWL_BROWN.feathers} belly={OWL_BROWN.belly}
          eye={OWL_BROWN.eye} beak={OWL_BROWN.beak} />
      </AnimG>

      {/* ── Sweeping magnifier ── */}
      <AnimG animatedProps={pMag}>
        <Circle cx={107} cy={106} r={13} fill="none" stroke={W} strokeWidth={3.5} />
        <Line x1={116} y1={115} x2={124} y2={123} stroke={W} strokeWidth={3.5}
          strokeLinecap="round" />
      </AnimG>

      <Star cx={20} cy={172} r={5} fill={TEAL} opacity={0.7} />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — AfuAI
// Tech-owl: antenna bobs, eyes glow-pulse, chest lights cycle R→Y→G,
// a particle orbits the owl, thinking bubbles drift upward.
// ─────────────────────────────────────────────────────────────────────────────
export function AfuAIIllustration({ size = 160 }: { size?: number }) {
  const antY  = useBob(0, -7, 900, 0);
  const eyeOp = usePulse(0.6, 1, 800, 0);
  const l1Op  = usePulse(0.2, 1, 1500, 0);
  const l2Op  = usePulse(0.2, 1, 1500, 500);
  const l3Op  = usePulse(0.2, 1, 1500, 1000);
  const orb   = useSpin(3500, 0);
  const thkY  = useBob(0, -10, 1800, 200);
  const thkO  = usePulse(0.5, 0.9, 1800, 200);
  const bobH  = useBob(0, -5, 2000, 600);

  const pAnt  = useAnimatedProps(() => ({ transform: `translate(0,${antY.value})` }));
  const pEye  = useAnimatedProps(() => ({ opacity: eyeOp.value }));
  const pL1   = useAnimatedProps(() => ({ opacity: l1Op.value }));
  const pL2   = useAnimatedProps(() => ({ opacity: l2Op.value }));
  const pL3   = useAnimatedProps(() => ({ opacity: l3Op.value }));
  const pOrb  = useAnimatedProps(() => ({
    cx: 100 + Math.cos(orb.value) * 62,
    cy: 108 + Math.sin(orb.value) * 28,
  }));
  const pThk  = useAnimatedProps(() => ({
    transform: `translate(0,${thkY.value})`,
    opacity: thkO.value,
  } as any));
  const pBobH = useAnimatedProps(() => ({ transform: `translate(0,${bobH.value})` }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={28} cy={42} r={8} fill={GOLD} opacity={0.9} />
      <Star cx={172} cy={38} r={6} fill={TEAL} opacity={0.9} />
      <Star cx={32} cy={155} r={5} fill={CORAL} opacity={0.7} />
      <Star cx={168} cy={158} r={7} fill={GOLD} opacity={0.8} />

      {/* ── Central tech-owl ── */}
      <Owl cx={100} cy={44} s={0.92}
        feathers="#263238" belly="#B2EBF2"
        eye={TEAL} beak={GOLD} />

      {/* ── Extra glowing eye rings (pulse) ── */}
      <AnimCircle cx={86}  cy={63} r={12} fill={TEAL} animatedProps={pEye} />
      <AnimCircle cx={114} cy={63} r={12} fill={TEAL} animatedProps={pEye} />

      {/* ── Animated antenna above ear tuft ── */}
      <AnimG animatedProps={pAnt}>
        <Line x1={100} y1={44} x2={100} y2={28}
          stroke={TEAL} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={100} cy={26} r={6} fill={TEAL} />
        <Circle cx={100} cy={26} r={3} fill={W} />
      </AnimG>

      {/* ── Chest panel lights (on belly) ── */}
      <AnimCircle cx={88}  cy={118} r={5.5} fill={CORAL} animatedProps={pL1} />
      <AnimCircle cx={100} cy={118} r={5.5} fill={GOLD}  animatedProps={pL2} />
      <AnimCircle cx={112} cy={118} r={5.5} fill={GREEN} animatedProps={pL3} />

      {/* ── Orbiting particle ── */}
      <AnimCircle r={5} fill={GOLD} opacity={0.88} animatedProps={pOrb} />

      {/* ── Thinking bubbles ── */}
      <AnimG animatedProps={pThk}>
        <Circle cx={56} cy={36} r={4} fill={W} opacity={0.6} />
        <Circle cx={48} cy={26} r={3} fill={W} opacity={0.5} />
        <Circle cx={42} cy={18} r={2} fill={W} opacity={0.4} />
      </AnimG>

      {/* ── Small helper owl beside ── */}
      <AnimG animatedProps={pBobH}>
        <Owl cx={168} cy={100} s={0.6}
          feathers={OWL_PURPLE.feathers} belly={OWL_PURPLE.belly}
          eye={OWL_PURPLE.eye} beak={OWL_PURPLE.beak} />
      </AnimG>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Wallet / ACoins
// Two owls; coin flips (no transformOrigin — translate-scale-translate);
// sparkles drift upward.
// ─────────────────────────────────────────────────────────────────────────────
export function WalletIllustration({ size = 160 }: { size?: number }) {
  const bobL = useBob(0, -6, 2100, 0);
  const bobR = useBob(0, -6, 2100, 1050);
  // Coin flip: scaleX −1 → +1 → −1 (3-D spin)
  const flip = useBob(-1, 1, 1200, 0);
  // Sparkles
  const s1Y = useBob(0, -20, 1600, 0);
  const s1O = usePulse(1, 0,   1600, 0);
  const s2Y = useBob(0, -20, 1600, 530);
  const s2O = usePulse(1, 0,   1600, 530);
  const s3Y = useBob(0, -20, 1600, 1060);
  const s3O = usePulse(1, 0,   1600, 1060);

  const pBobL = useAnimatedProps(() => ({ transform: `translate(0,${bobL.value})` }));
  const pBobR = useAnimatedProps(() => ({ transform: `translate(0,${bobR.value})` }));
  // Coin flip: scale around coin centre (100, 104)
  const pFlip = useAnimatedProps(() => ({
    transform: `translate(100,104) scale(${flip.value},1) translate(-100,-104)`,
  }));
  const pS1 = useAnimatedProps(() => ({
    transform: `translate(0,${s1Y.value})`, opacity: s1O.value,
  } as any));
  const pS2 = useAnimatedProps(() => ({
    transform: `translate(0,${s2Y.value})`, opacity: s2O.value,
  } as any));
  const pS3 = useAnimatedProps(() => ({
    transform: `translate(0,${s3Y.value})`, opacity: s3O.value,
  } as any));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Star cx={22}  cy={30}  r={7} fill={GOLD} />
      <Star cx={178} cy={165} r={6} fill={GOLD} opacity={0.8} />
      <Circle cx={18} cy={155} r={5} fill={CORAL} opacity={0.5} />

      {/* ── Left owl (teal) ── */}
      <AnimG animatedProps={pBobL}>
        <Owl cx={44} cy={68} s={0.82}
          feathers={OWL_TEAL.feathers} belly={OWL_TEAL.belly}
          eye={OWL_TEAL.eye} beak={OWL_TEAL.beak} />
      </AnimG>

      {/* ── Right owl (purple) ── */}
      <AnimG animatedProps={pBobR}>
        <Owl cx={158} cy={68} s={0.82}
          feathers={OWL_PURPLE.feathers} belly={OWL_PURPLE.belly}
          eye={OWL_PURPLE.eye} beak={OWL_PURPLE.beak} />
      </AnimG>

      {/* ── Coin shadow ── */}
      <Ellipse cx={102} cy={114} rx={26} ry={7} fill={DARK} opacity={0.18} />

      {/* ── Flipping coin ── */}
      <AnimG animatedProps={pFlip}>
        <Circle cx={100} cy={104} r={30} fill={GOLD} opacity={0.93} />
        <Circle cx={100} cy={104} r={30} fill="none" stroke={W} strokeWidth={2} opacity={0.55} />
        <Path d="M91,118 L100,89 L109,118"
          stroke={W} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={94} y1={110} x2={106} y2={110}
          stroke={W} strokeWidth={3.2} strokeLinecap="round" />
      </AnimG>

      {/* ── Sparkles ── */}
      <AnimG animatedProps={pS1}>
        <Star cx={100} cy={70} r={5} fill={GOLD} />
      </AnimG>
      <AnimG animatedProps={pS2}>
        <Star cx={116} cy={74} r={4} fill={W} />
      </AnimG>
      <AnimG animatedProps={pS3}>
        <Star cx={84} cy={76} r={4} fill={CORAL} />
      </AnimG>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — Community
// Three owls bob at different rates; connection lines pulse; heart above
// centre owl beats (translate-scale-translate, no transformOrigin);
// small hearts float up from each owl.
// ─────────────────────────────────────────────────────────────────────────────
export function CommunityIllustration({ size = 160 }: { size?: number }) {
  const bobC = useBob(0, -7, 2000, 0);
  const bobL = useBob(0, -7, 2200, 700);
  const bobR = useBob(0, -7, 1900, 1300);
  // Heart beat scaled around its centre (100, 40)
  const htS  = usePulse(1, 1.35, 680, 0);
  // Connection line pulse
  const lnO  = usePulse(0.25, 0.85, 1500, 0);
  // Floating hearts from each owl
  const fh1Y = useBob(0, -22, 2000, 0);
  const fh1O = usePulse(0.85, 0, 2000, 0);
  const fh2Y = useBob(0, -22, 2000, 660);
  const fh2O = usePulse(0.85, 0, 2000, 660);
  const fh3Y = useBob(0, -22, 2000, 1320);
  const fh3O = usePulse(0.85, 0, 2000, 1320);

  const tw = usePulse(0.3, 1, 1000, 0);

  const pBobC = useAnimatedProps(() => ({ transform: `translate(0,${bobC.value})` }));
  const pBobL = useAnimatedProps(() => ({ transform: `translate(0,${bobL.value})` }));
  const pBobR = useAnimatedProps(() => ({ transform: `translate(0,${bobR.value})` }));
  // Heart scaled around (100,42)
  const pHtS  = useAnimatedProps(() => ({
    transform: `translate(100,42) scale(${htS.value}) translate(-100,-42)`,
  }));
  const pLnO  = useAnimatedProps(() => ({ opacity: lnO.value }));
  const pFh1  = useAnimatedProps(() => ({
    transform: `translate(0,${fh1Y.value})`, opacity: fh1O.value,
  } as any));
  const pFh2  = useAnimatedProps(() => ({
    transform: `translate(0,${fh2Y.value})`, opacity: fh2O.value,
  } as any));
  const pFh3  = useAnimatedProps(() => ({
    transform: `translate(0,${fh3Y.value})`, opacity: fh3O.value,
  } as any));
  const pTw   = useAnimatedProps(() => ({ opacity: tw.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <AnimCircle cx={25} cy={28} r={7} fill={GOLD} animatedProps={pTw} />
      <Circle cx={185} cy={68} r={5} fill={CORAL} opacity={0.4} />

      {/* ── Pulsing connection lines ── */}
      <AnimG animatedProps={pLnO}>
        <Line x1={60}  y1={128} x2={100} y2={86}  stroke={W} strokeWidth={2.5} strokeDasharray="5,5" />
        <Line x1={140} y1={128} x2={100} y2={86}  stroke={W} strokeWidth={2.5} strokeDasharray="5,5" />
        <Line x1={60}  y1={128} x2={140} y2={128} stroke={W} strokeWidth={2.5} strokeDasharray="5,5" />
      </AnimG>

      {/* ── Centre owl (pink) ── */}
      <AnimG animatedProps={pBobC}>
        <Owl cx={100} cy={54} s={0.82}
          feathers="#AD1457" belly="#FCE4EC"
          eye={GOLD} beak={GOLD} />
      </AnimG>

      {/* ── Beating heart above centre owl ── */}
      <AnimG animatedProps={pHtS}>
        <Path
          d="M100,42 C100,42 106,36 110,40 C114,44 110,48 100,54 C90,48 86,44 90,40 C94,36 100,42 100,42 Z"
          fill={CORAL} opacity={0.9}
        />
      </AnimG>

      {/* ── Left owl (blue) ── */}
      <AnimG animatedProps={pBobL}>
        <Owl cx={48} cy={110} s={0.76}
          feathers={OWL_BLUE.feathers} belly={OWL_BLUE.belly}
          eye={OWL_BLUE.eye} beak={OWL_BLUE.beak} />
      </AnimG>

      {/* ── Right owl (teal) ── */}
      <AnimG animatedProps={pBobR}>
        <Owl cx={152} cy={110} s={0.76}
          feathers={OWL_TEAL.feathers} belly={OWL_TEAL.belly}
          eye={OWL_TEAL.eye} beak={OWL_TEAL.beak} />
      </AnimG>

      {/* ── Floating hearts ── */}
      <AnimG animatedProps={pFh1}>
        <Path d="M100,56 C100,56 103,53 105,55 C107,57 105,59 100,62 C95,59 93,57 95,55 C97,53 100,56 100,56 Z"
          fill={CORAL} />
      </AnimG>
      <AnimG animatedProps={pFh2}>
        <Path d="M48,112 C48,112 51,109 53,111 C55,113 53,115 48,118 C43,115 41,113 43,111 C45,109 48,112 48,112 Z"
          fill={CORAL} />
      </AnimG>
      <AnimG animatedProps={pFh3}>
        <Path d="M152,112 C152,112 155,109 157,111 C159,113 157,115 152,118 C147,115 145,113 147,111 C149,109 152,112 152,112 Z"
          fill={CORAL} />
      </AnimG>

      <Star cx={48}  cy={98}  r={5} fill={GOLD} opacity={0.8} />
      <Star cx={152} cy={98}  r={5} fill={TEAL} opacity={0.8} />
      <Star cx={175} cy={162} r={6} fill={TEAL} opacity={0.7} />
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
