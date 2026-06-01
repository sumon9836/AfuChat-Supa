/**
 * AfuChat Owl Mascot — onboarding carousel illustrations.
 *
 * Each slide has a unique pose/accessory:
 *   1. Chat       — two owls typing to each other
 *   2. Security   — owl + animated shield
 *   3. Discover   — owl + spinning globe + magnifier
 *   4. AfuAI      — tech owl with antenna & orbiting particle
 *   5. Wallet     — owls + flipping ACoin
 *   6. Community  — three owls + connection lines
 *
 * Visual quality:
 *   • SVG RadialGradient depth-shading on every owl (3-D sphere look)
 *   • Blinking eyelids (scaleY worklet — no transform strings)
 *   • Animated eye look-around (translateX/Y worklet on pupil group)
 *
 * ⚠  All animated transforms use individual SVG props only.
 *    Passing transform as a string via useAnimatedProps crashes on
 *    Android new arch ("ReadableArray cast" error).
 */

import React, { useEffect } from "react";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import Svg, {
  Circle, Defs, Ellipse, G, Line, Path, Polygon, Rect,
  RadialGradient, LinearGradient, Stop,
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

type OwlPal = {
  f: string;   // feathers (mid)
  fL: string;  // feathers light (highlight)
  fD: string;  // feathers dark (shadow)
  v: string;   // belly (mid)
  vL: string;  // belly light
  e: string;   // eye iris
  eL: string;  // eye iris light
  bk: string;  // beak
};

const BLUE:   OwlPal = { f:"#1565C0", fL:"#42A5F5", fD:"#0A2845", v:"#BBDEFB", vL:"#E3F2FD", e:"#00ACC1", eL:"#00E5FF", bk:GOLD  };
const TEALP:  OwlPal = { f:"#00838F", fL:"#26C6DA", fD:"#003B41", v:"#B2EBF2", vL:"#E0F7FA", e:"#F9A825", eL:"#FFF176", bk:GOLD  };
const BROWN:  OwlPal = { f:"#5D4037", fL:"#8D6E63", fD:"#2B1A14", v:"#FFCCBC", vL:"#FBE9E7", e:"#00ACC1", eL:"#00E5FF", bk:GOLD  };
const GREY:   OwlPal = { f:"#546E7A", fL:"#90A4AE", fD:"#1C2F38", v:"#ECEFF1", vL:"#FFFFFF", e:"#FF7043", eL:"#FFAB91", bk:GOLD  };
const PURP:   OwlPal = { f:"#6A1B9A", fL:"#AB47BC", fD:"#29004B", v:"#E1BEE7", vL:"#F3E5F5", e:"#FFB300", eL:"#FFE082", bk:CORAL };
const GRNP:   OwlPal = { f:"#2E7D32", fL:"#66BB6A", fD:"#0A2F0C", v:"#C8E6C9", vL:"#E8F5E9", e:"#FFB300", eL:"#FFE082", bk:CORAL };
const TECH:   OwlPal = { f:"#263238", fL:"#455A64", fD:"#060E11", v:"#B2EBF2", vL:"#E0F7FA", e:"#00ACC1", eL:"#00E5FF", bk:GOLD  };
const PINK:   OwlPal = { f:"#AD1457", fL:"#E91E63", fD:"#490019", v:"#FCE4EC", vL:"#FFFFFF", e:"#FFB300", eL:"#FFE082", bk:CORAL };

// ── Animation helpers ─────────────────────────────────────────────────────────
function useBob(a: number, b: number, ms: number, delay = 0) {
  const v = useSharedValue(a);
  useEffect(() => {
    v.value = withDelay(delay,
      withRepeat(withTiming(b, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, []);
  return v;
}
const usePulse = useBob;

function useSpin(ms: number, delay = 0) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay,
      withRepeat(withTiming(2 * Math.PI, { duration: ms, easing: Easing.linear }), -1)
    );
  }, []);
  return v;
}

/** Discrete blink worklet — eyelid closes (scaleY 0→1→0) on a random timer. */
function useBlink(initialDelay = 0) {
  const v = useSharedValue(0);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    function schedule() {
      t = setTimeout(() => {
        v.value = withSequence(
          withTiming(1, { duration: 75,  easing: Easing.in(Easing.quad)  }),
          withTiming(0, { duration: 100, easing: Easing.out(Easing.quad) })
        );
        schedule();
      }, initialDelay + 2200 + Math.random() * 4000);
    }
    schedule();
    return () => clearTimeout(t);
  }, []);
  return v;
}

// ── Gradient helper — inline per-SVG defs ────────────────────────────────────
/**
 * Defines one owl's radial-gradient set. `pfx` is the ID prefix (e.g. "L","R","C").
 * Fill references in the Owl component: `feathers={\`url(#\${pfx}f)\`}` etc.
 */
function OwlGrad({ pfx, pal }: { pfx: string; pal: OwlPal }) {
  return (
    <>
      {/* Feathers: bright top-left → dark bottom-right */}
      <RadialGradient id={`${pfx}f`} cx="32%" cy="24%" fx="32%" fy="24%" r="70%">
        <Stop offset="0%"   stopColor={pal.fL} />
        <Stop offset="45%"  stopColor={pal.f}  />
        <Stop offset="100%" stopColor={pal.fD} />
      </RadialGradient>
      {/* Belly: soft light centre */}
      <RadialGradient id={`${pfx}v`} cx="38%" cy="28%" r="62%">
        <Stop offset="0%"   stopColor={pal.vL} />
        <Stop offset="60%"  stopColor={pal.v}  />
        <Stop offset="100%" stopColor={pal.f}  stopOpacity={0.3} />
      </RadialGradient>
      {/* Eye iris: glowing bright centre */}
      <RadialGradient id={`${pfx}e`} cx="30%" cy="26%" fx="30%" fy="26%" r="68%">
        <Stop offset="0%"   stopColor={pal.eL} />
        <Stop offset="55%"  stopColor={pal.e}  />
        <Stop offset="100%" stopColor={DARK}   />
      </RadialGradient>
      {/* Beak: gold-to-amber gradient */}
      <LinearGradient id={`${pfx}bk`} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%"   stopColor="#FFD54F" />
        <Stop offset="100%" stopColor={pal.bk}  />
      </LinearGradient>
    </>
  );
}

// ── Owl body (geometry only — no animation) ───────────────────────────────────
// feathers/belly/eye/beak accept either hex colors or "url(#id)" gradient refs.
function Owl({
  cx, cy, s = 1, feathers, belly, eye, beak,
}: {
  cx: number; cy: number; s?: number;
  feathers: string; belly: string; eye: string; beak: string;
}) {
  const hr   = 22 * s;   // head radius
  const hcy  = cy + hr;  // head centre y
  const brx  = 18 * s;   // body rx
  const bry  = 25 * s;   // body ry
  const bcy  = hcy + hr + bry - 6 * s; // body centre y
  const er   = 9.5 * s;  // eye radius
  const eo   = 8.5 * s;  // eye x-offset
  const eyY  = hcy - 1 * s;
  const pr   = 4.8 * s;  // pupil radius
  const footY = bcy + bry - 2 * s;

  return (
    <G>
      {/* Body */}
      <Ellipse cx={cx} cy={bcy} rx={brx} ry={bry} fill={feathers} />
      {/* Belly */}
      <Ellipse cx={cx} cy={bcy + 4*s} rx={brx*0.58} ry={bry*0.72} fill={belly} opacity={0.9} />
      {/* Belly stripe details */}
      <Path d={`M${cx-7*s},${bcy-4*s} Q${cx},${bcy-8*s} ${cx+7*s},${bcy-4*s}`}
        stroke={feathers} strokeWidth={1.5*s} fill="none" opacity={0.35} />
      <Path d={`M${cx-6*s},${bcy+4*s} Q${cx},${bcy} ${cx+6*s},${bcy+4*s}`}
        stroke={feathers} strokeWidth={1.2*s} fill="none" opacity={0.28} />
      {/* Wings */}
      <Path d={`M${cx-brx+2*s},${bcy-bry*0.35} Q${cx-brx*2.1},${bcy+2*s} ${cx-brx*1.3},${bcy+bry*0.75}`}
        stroke={feathers} strokeWidth={10*s} fill="none" strokeLinecap="round" />
      <Path d={`M${cx+brx-2*s},${bcy-bry*0.35} Q${cx+brx*2.1},${bcy+2*s} ${cx+brx*1.3},${bcy+bry*0.75}`}
        stroke={feathers} strokeWidth={10*s} fill="none" strokeLinecap="round" />
      {/* Wing highlights */}
      <Path d={`M${cx-brx+2*s},${bcy-bry*0.35} Q${cx-brx*1.8},${bcy} ${cx-brx*1.2},${bcy+bry*0.5}`}
        stroke={belly} strokeWidth={3*s} fill="none" strokeLinecap="round" opacity={0.35} />
      <Path d={`M${cx+brx-2*s},${bcy-bry*0.35} Q${cx+brx*1.8},${bcy} ${cx+brx*1.2},${bcy+bry*0.5}`}
        stroke={belly} strokeWidth={3*s} fill="none" strokeLinecap="round" opacity={0.35} />
      {/* Head */}
      <Circle cx={cx} cy={hcy} r={hr} fill={feathers} />
      {/* Facial disc */}
      <Ellipse cx={cx} cy={hcy+2*s} rx={hr*0.78} ry={hr*0.82} fill={belly} opacity={0.2} />
      {/* Rim light */}
      <Circle cx={cx} cy={hcy} r={hr} fill="none" stroke={belly} strokeWidth={1.2*s} opacity={0.12} />
      {/* Ear tufts */}
      <Path d={`M${cx-12*s},${cy+2*s} L${cx-7*s},${cy-10*s} L${cx-2*s},${cy+2*s}`} fill={feathers} />
      <Path d={`M${cx+2*s},${cy+2*s} L${cx+7*s},${cy-10*s} L${cx+12*s},${cy+2*s}`} fill={feathers} />
      {/* Tuft highlights */}
      <Path d={`M${cx-10*s},${cy+1*s} L${cx-7*s},${cy-6*s} L${cx-4*s},${cy+1*s}`} fill={belly} opacity={0.25} />
      <Path d={`M${cx+4*s},${cy+1*s} L${cx+7*s},${cy-6*s} L${cx+10*s},${cy+1*s}`} fill={belly} opacity={0.25} />
      {/* Eye whites */}
      <Circle cx={cx-eo} cy={eyY} r={er+1.5*s} fill={W} />
      <Circle cx={cx+eo} cy={eyY} r={er+1.5*s} fill={W} />
      {/* Irises */}
      <Circle cx={cx-eo} cy={eyY} r={er} fill={eye} />
      <Circle cx={cx+eo} cy={eyY} r={er} fill={eye} />
      {/* Static pupils (covered by OwlEyes overlay) */}
      <Circle cx={cx-eo+1.2*s} cy={eyY+1*s} r={pr} fill={DARK} />
      <Circle cx={cx+eo+1.2*s} cy={eyY+1*s} r={pr} fill={DARK} />
      {/* Shine */}
      <Circle cx={cx-eo-2.5*s} cy={eyY-3*s} r={2.2*s} fill={W} />
      <Circle cx={cx+eo-2.5*s} cy={eyY-3*s} r={2.2*s} fill={W} />
      {/* Beak */}
      <Path d={`M${cx},${eyY+er*0.6} L${cx-5.5*s},${eyY+er*1.65} L${cx+5.5*s},${eyY+er*1.65} Z`} fill={beak} />
      <Line x1={cx} y1={eyY+er*0.6} x2={cx} y2={eyY+er*1.65}
        stroke={DARK} strokeWidth={0.8*s} opacity={0.35} />
      {/* Feet */}
      <Path d={`M${cx-7*s},${footY} L${cx-12*s},${footY+9*s} M${cx-7*s},${footY} L${cx-7*s},${footY+9*s} M${cx-7*s},${footY} L${cx-2*s},${footY+9*s}`}
        stroke={beak} strokeWidth={2.2*s} fill="none" strokeLinecap="round" />
      <Path d={`M${cx+7*s},${footY} L${cx+2*s},${footY+9*s} M${cx+7*s},${footY} L${cx+7*s},${footY+9*s} M${cx+7*s},${footY} L${cx+12*s},${footY+9*s}`}
        stroke={beak} strokeWidth={2.2*s} fill="none" strokeLinecap="round" />
    </G>
  );
}

/**
 * Animated eye overlay — renders on top of an Owl to add:
 *   • Blinking eyelids (scaleY from eye centre-top)
 *   • Pupil look-around (translateX/Y)
 *
 * @param flipX  Negate lookX so this owl looks the opposite direction
 */
function OwlEyes({
  cx, cy, s, featherFill, blinkV, lookX, lookY, flipX = false,
}: {
  cx: number; cy: number; s: number; featherFill: string;
  blinkV: SharedValue<number>;
  lookX: SharedValue<number>;
  lookY: SharedValue<number>;
  flipX?: boolean;
}) {
  const hr  = 22 * s;
  const hcy = cy + hr;
  const er  = 9.5 * s;
  const eo  = 8.5 * s;
  const eyY = hcy - 1 * s;
  const pr  = 4.8 * s;

  // Pupils follow look direction; optional horizontal flip for facing owls
  const pLook = useAnimatedProps(() => ({
    translateX: (flipX ? -1 : 1) * lookX.value,
    translateY: lookY.value,
  } as any));

  // Eyelid drops from top of eye (originY = top edge of eye circle)
  const lidTop = eyY - (er + 1.5 * s);
  const pLidL  = useAnimatedProps(() => ({ scaleY: blinkV.value }));
  const pLidR  = useAnimatedProps(() => ({ scaleY: blinkV.value }));

  return (
    <>
      {/* Animated pupils + shine on top of static ones */}
      <AnimG animatedProps={pLook}>
        <Circle cx={cx - eo + 1.2 * s} cy={eyY + 1 * s} r={pr}      fill={DARK} />
        <Circle cx={cx + eo + 1.2 * s} cy={eyY + 1 * s} r={pr}      fill={DARK} />
        <Circle cx={cx - eo - 2.5 * s} cy={eyY - 3 * s} r={2.2 * s} fill={W}    />
        <Circle cx={cx + eo - 2.5 * s} cy={eyY - 3 * s} r={2.2 * s} fill={W}    />
      </AnimG>
      {/* Eyelids — feather-coloured ellipses scale down from eye-top */}
      <AnimEllipse
        cx={cx - eo} cy={eyY} rx={er + 2 * s} ry={er + 2 * s}
        fill={featherFill}
        originX={cx - eo} originY={lidTop}
        animatedProps={pLidL}
      />
      <AnimEllipse
        cx={cx + eo} cy={eyY} rx={er + 2 * s} ry={er + 2 * s}
        fill={featherFill}
        originX={cx + eo} originY={lidTop}
        animatedProps={pLidR}
      />
    </>
  );
}

// ── Star decorator ────────────────────────────────────────────────────────────
function Star({ cx, cy, r, fill, opacity = 1 }: {
  cx: number; cy: number; r: number; fill: string; opacity?: number;
}) {
  const ri  = r * 0.38;
  const pts = `${cx},${cy-r} ${cx+ri},${cy-ri} ${cx+r},${cy} ${cx+ri},${cy+ri} ${cx},${cy+r} ${cx-ri},${cy+ri} ${cx-r},${cy} ${cx-ri},${cy-ri}`;
  return <Polygon points={pts} fill={fill} opacity={opacity} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Chat
// Two owls typing; left has animated dots; right bubble pulses; heart floats.
// ─────────────────────────────────────────────────────────────────────────────
export function ChatIllustration({ size = 160 }: { size?: number }) {
  const bobL  = useBob(0, -7, 2000, 0);
  const bobR  = useBob(0, -7, 2000, 1000);
  const d1    = useBob(0, -5.5, 500, 0);
  const d2    = useBob(0, -5.5, 500, 160);
  const d3    = useBob(0, -5.5, 500, 320);
  const bubS  = usePulse(1, 1.07, 1200, 400);
  const htY   = useBob(0, -22, 2200, 600);
  const htO   = usePulse(0.9, 0.1, 2200, 600);
  const tw1   = usePulse(0.2, 1, 900, 0);
  const tw2   = usePulse(0.2, 1, 700, 300);
  const blinkV = useBlink(0);
  const lookX  = useBob(-2, 3, 3800, 200);   // both owls look slightly toward each other
  const lookY  = useBob(-2, 2, 4600, 800);

  const pL   = useAnimatedProps(() => ({ translateY: bobL.value }));
  const pR   = useAnimatedProps(() => ({ translateY: bobR.value }));
  const pD1  = useAnimatedProps(() => ({ cy: 35 + d1.value }));
  const pD2  = useAnimatedProps(() => ({ cy: 35 + d2.value }));
  const pD3  = useAnimatedProps(() => ({ cy: 35 + d3.value }));
  const pBub = useAnimatedProps(() => ({ scale: bubS.value }));
  const pHtY = useAnimatedProps(() => ({ translateY: htY.value }));
  const pHtO = useAnimatedProps(() => ({ opacity: htO.value }));
  const pTw1 = useAnimatedProps(() => ({ opacity: tw1.value }));
  const pTw2 = useAnimatedProps(() => ({ opacity: tw2.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <OwlGrad pfx="L" pal={BLUE}  />
        <OwlGrad pfx="R" pal={GRNP} />
      </Defs>

      <AnimCircle cx={22}  cy={22}  r={6} fill={GOLD}  animatedProps={pTw1} />
      <AnimCircle cx={178} cy={170} r={5} fill={TEAL}  animatedProps={pTw2} />
      <Circle    cx={185} cy={90}  r={5} fill={CORAL} opacity={0.3} />

      {/* Left owl (blue) */}
      <AnimG animatedProps={pL}>
        <Owl cx={58} cy={70} s={0.85} feathers="url(#Lf)" belly="url(#Lv)" eye="url(#Le)" beak={BLUE.bk} />
        <OwlEyes cx={58} cy={70} s={0.85} featherFill={BLUE.f} blinkV={blinkV} lookX={lookX} lookY={lookY} />
      </AnimG>

      {/* Right owl (green) */}
      <AnimG animatedProps={pR}>
        <Owl cx={142} cy={70} s={0.85} feathers="url(#Rf)" belly="url(#Rv)" eye="url(#Re)" beak={GRNP.bk} />
        <OwlEyes cx={142} cy={70} s={0.85} featherFill={GRNP.f} blinkV={blinkV} lookX={lookX} lookY={lookY} flipX />
      </AnimG>

      {/* Left typing bubble */}
      <Rect x={26} y={14} width={58} height={30} rx={13} fill={W} opacity={0.95} />
      <Path d="M50,44 L46,54 L60,44" fill={W} opacity={0.95} />
      <AnimCircle cx={40} animatedProps={pD1} r={4} fill={TEAL} />
      <AnimCircle cx={55} animatedProps={pD2} r={4} fill={TEAL} />
      <AnimCircle cx={70} animatedProps={pD3} r={4} fill={TEAL} />

      {/* Right bubble (pulsing) — scale around bubble centre (145, 28) */}
      <AnimG originX={145} originY={28} animatedProps={pBub}>
        <Rect x={116} y={8} width={58} height={30} rx={13} fill={W} opacity={0.88} />
        <Path d="M136,38 L132,48 L146,38" fill={W} opacity={0.88} />
        <Circle cx={130} cy={23} r={4} fill={CORAL} />
        <Circle cx={145} cy={23} r={4} fill={CORAL} />
        <Circle cx={160} cy={23} r={4} fill={CORAL} />
      </AnimG>

      {/* Floating heart */}
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
// Owl + shield; sonar rings expand; lock rocks; checkmark glows.
// ─────────────────────────────────────────────────────────────────────────────
export function SecurityIllustration({ size = 160 }: { size?: number }) {
  const bobP  = useBob(0, -6, 2100, 0);
  const r1S   = usePulse(1, 1.55, 1400, 0);
  const r1O   = usePulse(0.65, 0, 1400, 0);
  const r2S   = usePulse(1, 1.55, 1400, 700);
  const r2O   = usePulse(0.65, 0, 1400, 700);
  const ckO   = usePulse(0.55, 1, 1100, 200);
  const lkR   = useBob(-4, 4, 650, 0);
  const tw    = usePulse(0.3, 1, 800, 0);
  const blinkV = useBlink(500);
  const lookX  = useBob(-3, 3, 4000, 0);
  const lookY  = useBob(-2, 2, 5000, 600);

  const pBob = useAnimatedProps(() => ({ translateY: bobP.value }));
  const pR1  = useAnimatedProps(() => ({ scale: r1S.value, opacity: r1O.value } as any));
  const pR2  = useAnimatedProps(() => ({ scale: r2S.value, opacity: r2O.value } as any));
  const pCk  = useAnimatedProps(() => ({ opacity: ckO.value }));
  const pLk  = useAnimatedProps(() => ({ rotation: lkR.value }));
  const pTw  = useAnimatedProps(() => ({ opacity: tw.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <OwlGrad pfx="S" pal={GREY} />
      </Defs>

      <AnimCircle cx={24} cy={26} r={7} fill={GOLD}  animatedProps={pTw} />
      <Circle    cx={18} cy={102} r={5} fill={W}     opacity={0.3} />
      <Star cx={180} cy={26} r={5} fill={GOLD}  opacity={0.8} />
      <Star cx={24}  cy={168} r={5} fill={CORAL} opacity={0.6} />

      {/* Owl (grey) */}
      <AnimG animatedProps={pBob}>
        <Owl cx={64} cy={64} s={0.9} feathers="url(#Sf)" belly="url(#Sv)" eye="url(#Se)" beak={GREY.bk} />
        <OwlEyes cx={64} cy={64} s={0.9} featherFill={GREY.f} blinkV={blinkV} lookX={lookX} lookY={lookY} />
      </AnimG>

      {/* Sonar rings — scale around shield centre (152,90) */}
      <AnimG originX={152} originY={90} animatedProps={pR2}>
        <Path d="M128,52 L176,52 L176,108 L152,130 L128,108 Z" fill="none" stroke={TEAL} strokeWidth={3} />
      </AnimG>
      <AnimG originX={152} originY={90} animatedProps={pR1}>
        <Path d="M120,44 L184,44 L184,116 L152,140 L120,116 Z" fill="none" stroke={TEAL} strokeWidth={2} />
      </AnimG>

      {/* Shield body */}
      <Path d="M130,54 L174,54 L174,108 L152,130 L130,108 Z" fill={W} opacity={0.93} />
      <Path d="M135,60 L169,60 L169,106 L152,124 L135,106 Z" fill={TEAL} opacity={0.18} />

      {/* Lock rocks around its centre (152,92) */}
      <AnimG originX={152} originY={92} animatedProps={pLk}>
        <Rect x={140} y={84} width={24} height={18} rx={5} fill="#37474F" />
        <Path d="M143,84 Q143,72 152,72 Q161,72 161,84" stroke="#37474F" strokeWidth={4} fill="none" />
        <Circle cx={152} cy={93} r={4} fill={W} opacity={0.9} />
      </AnimG>

      {/* Animated checkmark */}
      <AnimPath
        d="M136,92 L147,103 L170,72"
        stroke={GREEN} strokeWidth={4.5} fill="none" strokeLinecap="round"
        animatedProps={pCk}
      />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Discover
// Owl on branch; globe spins (meridian rx oscillates); magnifier sweeps; pin bounces.
// ─────────────────────────────────────────────────────────────────────────────
export function DiscoverIllustration({ size = 160 }: { size?: number }) {
  const bobP  = useBob(0, -6, 2200, 0);
  const merRx = useBob(46, -46, 3000, 0);
  const magTx = useBob(-10, 10, 1800, 200);
  const pinCy = useBob(0, -7, 700, 0);
  const tw1   = usePulse(0.3, 1, 900, 0);
  const tw2   = usePulse(0.3, 1, 1100, 400);
  const blinkV = useBlink(800);
  const lookX  = useBob(-3, 3, 3600, 300);
  const lookY  = useBob(-2, 2, 4800, 900);

  const pBob = useAnimatedProps(() => ({ translateY: bobP.value }));
  const pMer = useAnimatedProps(() => ({ rx: Math.abs(merRx.value) }));
  const pMag = useAnimatedProps(() => ({ translateX: magTx.value }));
  const pPin = useAnimatedProps(() => ({ translateY: pinCy.value }));
  const pTw1 = useAnimatedProps(() => ({ opacity: tw1.value }));
  const pTw2 = useAnimatedProps(() => ({ opacity: tw2.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <OwlGrad pfx="D" pal={BROWN} />
      </Defs>

      <AnimCircle cx={20}  cy={32} r={6} fill={GOLD}  animatedProps={pTw1} />
      <AnimCircle cx={178} cy={22} r={5} fill={W}     animatedProps={pTw2} />
      <Circle    cx={186} cy={148} r={6} fill={CORAL} opacity={0.5} />
      <Star cx={20} cy={172} r={5} fill={TEAL} opacity={0.7} />

      {/* Globe */}
      <Circle cx={142} cy={106} r={46} fill={W} opacity={0.12} />
      <Circle cx={142} cy={106} r={46} fill="none" stroke={W} strokeWidth={2.5} />
      <Ellipse cx={142} cy={106} rx={46} ry={14} fill="none" stroke={W} strokeWidth={1.4} opacity={0.55} />
      <AnimEllipse cx={142} cy={106} ry={46} fill="none" stroke={W} strokeWidth={1.4} opacity={0.55} animatedProps={pMer} />
      <Line x1={142} y1={60} x2={142} y2={152} stroke={W} strokeWidth={0.8} opacity={0.4} />
      <Line x1={96}  y1={106} x2={188} y2={106} stroke={W} strokeWidth={0.8} opacity={0.4} />

      {/* Bouncing location pin */}
      <AnimG animatedProps={pPin}>
        <Circle cx={155} cy={86} r={7} fill={CORAL} />
        <Path d="M155,93 L151,104 L155,100 L159,104 Z" fill={CORAL} />
        <Circle cx={155} cy={86} r={3} fill={W} opacity={0.85} />
      </AnimG>

      {/* Branch */}
      <Path d="M14,138 Q40,128 70,134" stroke="#5D4037" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.7} />

      {/* Owl (brown) on branch */}
      <AnimG animatedProps={pBob}>
        <Owl cx={46} cy={62} s={0.88} feathers="url(#Df)" belly="url(#Dv)" eye="url(#De)" beak={BROWN.bk} />
        <OwlEyes cx={46} cy={62} s={0.88} featherFill={BROWN.f} blinkV={blinkV} lookX={lookX} lookY={lookY} />
      </AnimG>

      {/* Sweeping magnifier */}
      <AnimG animatedProps={pMag}>
        <Circle cx={107} cy={106} r={13} fill="none" stroke={W} strokeWidth={3.5} />
        <Line x1={116} y1={115} x2={124} y2={123} stroke={W} strokeWidth={3.5} strokeLinecap="round" />
      </AnimG>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — AfuAI
// Tech owl: antenna bobs; eyes glow; chest lights cycle; particle orbits; bubbles drift.
// ─────────────────────────────────────────────────────────────────────────────
export function AfuAIIllustration({ size = 160 }: { size?: number }) {
  const antY  = useBob(0, -7, 900, 0);
  const eyeOp = usePulse(0.5, 0.95, 800, 0);
  const l1Op  = usePulse(0.2, 1, 1500, 0);
  const l2Op  = usePulse(0.2, 1, 1500, 500);
  const l3Op  = usePulse(0.2, 1, 1500, 1000);
  const orb   = useSpin(3500, 0);
  const thkY  = useBob(0, -10, 1800, 200);
  const thkO  = usePulse(0.5, 0.9, 1800, 200);
  const bobH  = useBob(0, -5, 2000, 600);
  const blinkV = useBlink(1200);
  const lookX  = useBob(-3, 3, 3800, 0);
  const lookY  = useBob(-2, 2, 4600, 700);

  const pAnt  = useAnimatedProps(() => ({ translateY: antY.value }));
  const pEye  = useAnimatedProps(() => ({ opacity: eyeOp.value }));
  const pL1   = useAnimatedProps(() => ({ opacity: l1Op.value }));
  const pL2   = useAnimatedProps(() => ({ opacity: l2Op.value }));
  const pL3   = useAnimatedProps(() => ({ opacity: l3Op.value }));
  const pOrb  = useAnimatedProps(() => ({
    cx: 100 + Math.cos(orb.value) * 62,
    cy: 108 + Math.sin(orb.value) * 28,
  }));
  const pThk  = useAnimatedProps(() => ({
    translateY: thkY.value,
    opacity:    thkO.value,
  } as any));
  const pBobH = useAnimatedProps(() => ({ translateY: bobH.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <OwlGrad pfx="AI"  pal={TECH}  />
        <OwlGrad pfx="AI2" pal={PURP}  />
      </Defs>

      <Star cx={28}  cy={42}  r={8} fill={GOLD}  opacity={0.9} />
      <Star cx={172} cy={38}  r={6} fill={TEAL}  opacity={0.9} />
      <Star cx={32}  cy={155} r={5} fill={CORAL} opacity={0.7} />
      <Star cx={168} cy={158} r={7} fill={GOLD}  opacity={0.8} />

      {/* Central tech owl */}
      <Owl cx={100} cy={44} s={0.92} feathers="url(#AIf)" belly="url(#AIv)" eye="url(#AIe)" beak={TECH.bk} />
      <OwlEyes cx={100} cy={44} s={0.92} featherFill={TECH.f} blinkV={blinkV} lookX={lookX} lookY={lookY} />

      {/* Glowing eye rings */}
      <AnimCircle cx={86}  cy={63} r={12} fill={TEAL} animatedProps={pEye} />
      <AnimCircle cx={114} cy={63} r={12} fill={TEAL} animatedProps={pEye} />

      {/* Bobbing antenna */}
      <AnimG animatedProps={pAnt}>
        <Line x1={100} y1={44} x2={100} y2={28} stroke={TEAL} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={100} cy={26} r={6} fill={TEAL} />
        <Circle cx={100} cy={26} r={3} fill={W} />
      </AnimG>

      {/* Chest status lights */}
      <AnimCircle cx={88}  cy={118} r={5.5} fill={CORAL} animatedProps={pL1} />
      <AnimCircle cx={100} cy={118} r={5.5} fill={GOLD}  animatedProps={pL2} />
      <AnimCircle cx={112} cy={118} r={5.5} fill={GREEN} animatedProps={pL3} />

      {/* Orbiting particle */}
      <AnimCircle r={5} fill={GOLD} opacity={0.88} animatedProps={pOrb} />

      {/* Thinking bubbles */}
      <AnimG animatedProps={pThk}>
        <Circle cx={56} cy={36} r={4} fill={W} opacity={0.6} />
        <Circle cx={48} cy={26} r={3} fill={W} opacity={0.5} />
        <Circle cx={42} cy={18} r={2} fill={W} opacity={0.4} />
      </AnimG>

      {/* Helper owl (purple) */}
      <AnimG animatedProps={pBobH}>
        <Owl cx={168} cy={100} s={0.6} feathers="url(#AI2f)" belly="url(#AI2v)" eye="url(#AI2e)" beak={PURP.bk} />
      </AnimG>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Wallet / ACoins
// Teal + purple owls; ACoin flips; sparkles drift up.
// ─────────────────────────────────────────────────────────────────────────────
export function WalletIllustration({ size = 160 }: { size?: number }) {
  const bobL  = useBob(0, -6, 2100, 0);
  const bobR  = useBob(0, -6, 2100, 1050);
  const flip  = useBob(-1, 1, 1200, 0);
  const s1Y   = useBob(0, -20, 1600, 0);
  const s1O   = usePulse(1, 0, 1600, 0);
  const s2Y   = useBob(0, -20, 1600, 530);
  const s2O   = usePulse(1, 0, 1600, 530);
  const s3Y   = useBob(0, -20, 1600, 1060);
  const s3O   = usePulse(1, 0, 1600, 1060);
  const blinkV = useBlink(300);
  const lookX  = useBob(-3, 3, 4000, 0);
  const lookY  = useBob(-1, 2, 5000, 400);

  const pBobL = useAnimatedProps(() => ({ translateY: bobL.value }));
  const pBobR = useAnimatedProps(() => ({ translateY: bobR.value }));
  const pFlip = useAnimatedProps(() => ({ scaleX: flip.value }));
  const pS1   = useAnimatedProps(() => ({ translateY: s1Y.value, opacity: s1O.value } as any));
  const pS2   = useAnimatedProps(() => ({ translateY: s2Y.value, opacity: s2O.value } as any));
  const pS3   = useAnimatedProps(() => ({ translateY: s3Y.value, opacity: s3O.value } as any));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <OwlGrad pfx="WL" pal={TEALP} />
        <OwlGrad pfx="WR" pal={PURP}  />
      </Defs>

      <Star cx={22}  cy={30}  r={7} fill={GOLD} />
      <Star cx={178} cy={165} r={6} fill={GOLD} opacity={0.8} />
      <Circle cx={18} cy={155} r={5} fill={CORAL} opacity={0.5} />

      {/* Left owl (teal) */}
      <AnimG animatedProps={pBobL}>
        <Owl cx={44} cy={68} s={0.82} feathers="url(#WLf)" belly="url(#WLv)" eye="url(#WLe)" beak={TEALP.bk} />
        <OwlEyes cx={44} cy={68} s={0.82} featherFill={TEALP.f} blinkV={blinkV} lookX={lookX} lookY={lookY} />
      </AnimG>

      {/* Right owl (purple) */}
      <AnimG animatedProps={pBobR}>
        <Owl cx={158} cy={68} s={0.82} feathers="url(#WRf)" belly="url(#WRv)" eye="url(#WRe)" beak={PURP.bk} />
        <OwlEyes cx={158} cy={68} s={0.82} featherFill={PURP.f} blinkV={blinkV} lookX={lookX} lookY={lookY} flipX />
      </AnimG>

      {/* Coin shadow */}
      <Ellipse cx={102} cy={114} rx={26} ry={7} fill={DARK} opacity={0.18} />

      {/* Flipping ACoin — scaleX around coin centre (100, 104) */}
      <AnimG originX={100} originY={104} animatedProps={pFlip}>
        <Circle cx={100} cy={104} r={30} fill={GOLD}         opacity={0.93} />
        <Circle cx={100} cy={104} r={30} fill="none" stroke={W} strokeWidth={2} opacity={0.55} />
        <Path d="M91,118 L100,89 L109,118" stroke={W} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={94} y1={110} x2={106} y2={110} stroke={W} strokeWidth={3.2} strokeLinecap="round" />
      </AnimG>

      {/* Sparkles floating up */}
      <AnimG animatedProps={pS1}><Star cx={100} cy={70} r={5} fill={GOLD}  /></AnimG>
      <AnimG animatedProps={pS2}><Star cx={116} cy={74} r={4} fill={W}     /></AnimG>
      <AnimG animatedProps={pS3}><Star cx={84}  cy={76} r={4} fill={CORAL} /></AnimG>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — Community
// Three owls (pink centre, blue left, teal right); connection lines pulse;
// heart beats above centre; small hearts float from each owl.
// ─────────────────────────────────────────────────────────────────────────────
export function CommunityIllustration({ size = 160 }: { size?: number }) {
  const bobC  = useBob(0, -7, 2000, 0);
  const bobL  = useBob(0, -7, 2200, 700);
  const bobR  = useBob(0, -7, 1900, 1300);
  const htS   = usePulse(1, 1.35, 680, 0);
  const lnO   = usePulse(0.25, 0.85, 1500, 0);
  const fh1Y  = useBob(0, -22, 2000, 0);
  const fh1O  = usePulse(0.85, 0, 2000, 0);
  const fh2Y  = useBob(0, -22, 2000, 660);
  const fh2O  = usePulse(0.85, 0, 2000, 660);
  const fh3Y  = useBob(0, -22, 2000, 1320);
  const fh3O  = usePulse(0.85, 0, 2000, 1320);
  const tw    = usePulse(0.3, 1, 1000, 0);
  const blinkV = useBlink(0);
  const lookX  = useBob(-2, 2, 4200, 0);
  const lookY  = useBob(-2, 2, 5000, 800);

  const pBobC = useAnimatedProps(() => ({ translateY: bobC.value }));
  const pBobL = useAnimatedProps(() => ({ translateY: bobL.value }));
  const pBobR = useAnimatedProps(() => ({ translateY: bobR.value }));
  const pHtS  = useAnimatedProps(() => ({ scale: htS.value }));
  const pLnO  = useAnimatedProps(() => ({ opacity: lnO.value }));
  const pFh1  = useAnimatedProps(() => ({ translateY: fh1Y.value, opacity: fh1O.value } as any));
  const pFh2  = useAnimatedProps(() => ({ translateY: fh2Y.value, opacity: fh2O.value } as any));
  const pFh3  = useAnimatedProps(() => ({ translateY: fh3Y.value, opacity: fh3O.value } as any));
  const pTw   = useAnimatedProps(() => ({ opacity: tw.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <OwlGrad pfx="CC" pal={PINK}  />
        <OwlGrad pfx="CL" pal={BLUE}  />
        <OwlGrad pfx="CR" pal={TEALP} />
      </Defs>

      <AnimCircle cx={25} cy={28} r={7} fill={GOLD} animatedProps={pTw} />
      <Circle cx={185} cy={68} r={5} fill={CORAL} opacity={0.4} />
      <Star cx={48}  cy={98} r={5} fill={GOLD}  opacity={0.8} />
      <Star cx={152} cy={98} r={5} fill={TEAL}  opacity={0.8} />
      <Star cx={175} cy={162} r={6} fill={TEAL} opacity={0.7} />

      {/* Pulsing connection lines */}
      <AnimG animatedProps={pLnO}>
        <Line x1={60}  y1={128} x2={100} y2={86} stroke={W} strokeWidth={2.5} strokeDasharray="5,5" />
        <Line x1={140} y1={128} x2={100} y2={86} stroke={W} strokeWidth={2.5} strokeDasharray="5,5" />
        <Line x1={60}  y1={128} x2={140} y2={128} stroke={W} strokeWidth={2.5} strokeDasharray="5,5" />
      </AnimG>

      {/* Centre owl (pink) */}
      <AnimG animatedProps={pBobC}>
        <Owl cx={100} cy={54} s={0.82} feathers="url(#CCf)" belly="url(#CCv)" eye="url(#CCe)" beak={PINK.bk} />
        <OwlEyes cx={100} cy={54} s={0.82} featherFill={PINK.f} blinkV={blinkV} lookX={lookX} lookY={lookY} />
      </AnimG>

      {/* Beating heart above centre owl — scale around heart centre (100, 42) */}
      <AnimG originX={100} originY={42} animatedProps={pHtS}>
        <Path
          d="M100,42 C100,42 106,36 110,40 C114,44 110,48 100,54 C90,48 86,44 90,40 C94,36 100,42 100,42 Z"
          fill={CORAL} opacity={0.9}
        />
      </AnimG>

      {/* Left owl (blue) */}
      <AnimG animatedProps={pBobL}>
        <Owl cx={48} cy={110} s={0.76} feathers="url(#CLf)" belly="url(#CLv)" eye="url(#CLe)" beak={BLUE.bk} />
        <OwlEyes cx={48} cy={110} s={0.76} featherFill={BLUE.f} blinkV={blinkV} lookX={lookX} lookY={lookY} />
      </AnimG>

      {/* Right owl (teal) */}
      <AnimG animatedProps={pBobR}>
        <Owl cx={152} cy={110} s={0.76} feathers="url(#CRf)" belly="url(#CRv)" eye="url(#CRe)" beak={TEALP.bk} />
        <OwlEyes cx={152} cy={110} s={0.76} featherFill={TEALP.f} blinkV={blinkV} lookX={lookX} lookY={lookY} flipX />
      </AnimG>

      {/* Floating hearts */}
      <AnimG animatedProps={pFh1}>
        <Path d="M100,56 C100,56 103,53 105,55 C107,57 105,59 100,62 C95,59 93,57 95,55 C97,53 100,56 100,56 Z" fill={CORAL} />
      </AnimG>
      <AnimG animatedProps={pFh2}>
        <Path d="M48,112 C48,112 51,109 53,111 C55,113 53,115 48,118 C43,115 41,113 43,111 C45,109 48,112 48,112 Z" fill={CORAL} />
      </AnimG>
      <AnimG animatedProps={pFh3}>
        <Path d="M152,112 C152,112 155,109 157,111 C159,113 157,115 152,118 C147,115 145,113 147,111 C149,109 152,112 152,112 Z" fill={CORAL} />
      </AnimG>
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
