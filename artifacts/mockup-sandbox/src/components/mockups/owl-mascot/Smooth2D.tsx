import { useEffect, useRef, useState } from "react";
import "./owl.css";

type BF = "open" | "blinking";

export function Smooth2D() {
  const t = useRef(0);
  const raf = useRef<number>(0);
  const [, setTick] = useState(0);
  const [blink, setBlink] = useState<BF>("open");
  const [excited, setExcited] = useState(false);

  useEffect(() => {
    function frame() {
      t.current += 0.016;
      setTick(n => n + 1);
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function schedBlink() {
      timer = setTimeout(() => {
        setBlink("blinking");
        setTimeout(() => { setBlink("open"); schedBlink(); }, 150);
      }, 2400 + Math.random() * 3600);
    }
    schedBlink();
    return () => clearTimeout(timer);
  }, []);

  const lookX = Math.sin(t.current * 0.38) * 5;
  const lookY = Math.sin(t.current * 0.55) * 4;
  const wingFlopL = Math.sin(t.current * 0.8) * 5;
  const wingFlopR = Math.sin(t.current * 0.8 + Math.PI * 0.4) * 5;
  const earL = Math.sin(t.current * 1.2 + 0.5) * 2.5;
  const earR = Math.sin(t.current * 1.1) * 2.5;
  const breatheX = 1 + Math.sin(t.current * 1.4) * 0.015;
  const breatheY = 1 + Math.sin(t.current * 1.4 + Math.PI) * 0.012;

  return (
    <div
      className="owl-stage"
      style={{ background: "linear-gradient(160deg, #00BCD4 0%, #006064 100%)", overflow: "hidden" }}
    >
      {/* Ambient orbs */}
      <div style={{ position:"absolute", top:40, left:40, width:120, height:120, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:60, right:40, width:80, height:80, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,183,0,0.12) 0%, transparent 70%)", pointerEvents:"none" }} />

      <div className="owl-label" style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>A — Smooth 2D</div>
      <div className="owl-sub">Telegram-style animated character</div>

      <div
        className={`owl-wrap ${excited ? "excited" : ""}`}
        onClick={() => { setExcited(true); setTimeout(() => setExcited(false), 620); }}
        style={{ cursor: "pointer" }}
      >
        <div className="owl-shadow" />

        <svg
          viewBox="0 0 220 280"
          width={220} height={280}
          style={{ filter: "drop-shadow(0 20px 36px rgba(0,0,0,0.38)) drop-shadow(0 4px 8px rgba(0,0,0,0.2))", overflow: "visible" }}
        >
          <defs>
            {/* ── 3D sphere gradients ── */}
            <radialGradient id="headG" cx="32%" cy="24%" fx="32%" fy="24%" r="68%">
              <stop offset="0%"   stopColor="#64B5F6" />
              <stop offset="40%"  stopColor="#1E88E5" />
              <stop offset="100%" stopColor="#0A2845" />
            </radialGradient>
            <radialGradient id="bodyG" cx="32%" cy="22%" fx="32%" fy="22%" r="70%">
              <stop offset="0%"   stopColor="#42A5F5" />
              <stop offset="42%"  stopColor="#1565C0" />
              <stop offset="100%" stopColor="#051A30" />
            </radialGradient>
            <radialGradient id="bellyG" cx="38%" cy="28%" fx="38%" fy="28%" r="62%">
              <stop offset="0%"   stopColor="#E3F2FD" />
              <stop offset="55%"  stopColor="#BBDEFB" />
              <stop offset="100%" stopColor="#1565C0" stopOpacity="0.5" />
            </radialGradient>
            <radialGradient id="wingLG" cx="62%" cy="28%" r="70%">
              <stop offset="0%"   stopColor="#1E88E5" />
              <stop offset="100%" stopColor="#051A30" />
            </radialGradient>
            <radialGradient id="wingRG" cx="38%" cy="28%" r="70%">
              <stop offset="0%"   stopColor="#1E88E5" />
              <stop offset="100%" stopColor="#051A30" />
            </radialGradient>
            <radialGradient id="irisG" cx="30%" cy="26%" fx="30%" fy="26%" r="68%">
              <stop offset="0%"   stopColor="#00E5FF" />
              <stop offset="50%"  stopColor="#00ACC1" />
              <stop offset="100%" stopColor="#002B33" />
            </radialGradient>
            <radialGradient id="pupilG" cx="24%" cy="24%" r="68%">
              <stop offset="0%"   stopColor="#1A237E" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
            <linearGradient id="beakG" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#FFD54F" />
              <stop offset="100%" stopColor="#E65100" />
            </linearGradient>
            <filter id="glow2d" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ── Wings (behind body) ── */}
          <ellipse
            cx={40} cy={192 + wingFlopL} rx={28} ry={54}
            fill="url(#wingLG)" transform="rotate(-20,40,185)"
          />
          <ellipse
            cx={180} cy={192 + wingFlopR} rx={28} ry={54}
            fill="url(#wingRG)" transform="rotate(20,180,185)"
          />
          {/* Wing rim highlights */}
          <ellipse cx={42} cy={178 + wingFlopL} rx={9} ry={22} fill="white" opacity={0.1} transform="rotate(-20,42,178)" />
          <ellipse cx={178} cy={178 + wingFlopR} rx={9} ry={22} fill="white" opacity={0.1} transform="rotate(20,178,178)" />

          {/* ── Body ── */}
          <ellipse
            cx={110} cy={202} rx={68 * breatheX} ry={82 * breatheY}
            fill="url(#bodyG)"
          />
          {/* Body rim light */}
          <ellipse cx={110} cy={202} rx={68} ry={82} fill="none" stroke="#42A5F5" strokeWidth={2} opacity={0.12} />

          {/* ── Belly ── */}
          <ellipse cx={110} cy={213} rx={42} ry={58} fill="url(#bellyG)" />
          {/* Belly feather stripes */}
          <path d="M82,197 Q110,187 138,197" stroke="#90CAF9" strokeWidth={2} fill="none" opacity={0.45} />
          <path d="M86,214 Q110,205 134,214" stroke="#90CAF9" strokeWidth={1.5} fill="none" opacity={0.35} />
          <path d="M90,230 Q110,222 130,230" stroke="#90CAF9" strokeWidth={1} fill="none" opacity={0.28} />

          {/* ── Feet ── */}
          <path d="M88,272 L74,284 M88,272 L88,286 M88,272 L102,284" stroke="#FFB300" strokeWidth={4.5} strokeLinecap="round" />
          <path d="M132,272 L118,284 M132,272 L132,286 M132,272 L146,284" stroke="#FFB300" strokeWidth={4.5} strokeLinecap="round" />

          {/* ── Head ── */}
          <circle cx={110} cy={108} r={74} fill="url(#headG)" />
          {/* Facial disc */}
          <ellipse cx={110} cy={115} rx={53} ry={57} fill="#BBDEFB" opacity={0.14} />
          {/* Head rim light */}
          <circle cx={110} cy={108} r={74} fill="none" stroke="#64B5F6" strokeWidth={2.5} opacity={0.18} />

          {/* ── Ear tufts ── */}
          <path
            d={`M${72 + earL},50 L${82 + earL},20 L${94 + earL},48`}
            fill="#1565C0"
          />
          <path
            d={`M${126 + earR},48 L${138 + earR},20 L${148 + earR},50`}
            fill="#1565C0"
          />
          {/* Tuft highlights */}
          <path d={`M${76 + earL},48 L${84 + earL},26 L${90 + earL},46`} fill="#42A5F5" opacity={0.35} />
          <path d={`M${130 + earR},46 L${140 + earR},26 L${144 + earR},48`} fill="#42A5F5" opacity={0.35} />

          {/* ── Eye sockets (depth) ── */}
          <circle cx={82} cy={106} r={30} fill="#051A30" opacity={0.35} />
          <circle cx={138} cy={106} r={30} fill="#051A30" opacity={0.35} />

          {/* ── Eye whites ── */}
          <circle cx={82} cy={104} r={26} fill="white" />
          <circle cx={138} cy={104} r={26} fill="white" />

          {/* ── Irises (3D gradient) ── */}
          <circle cx={82} cy={104} r={20} fill="url(#irisG)" />
          <circle cx={138} cy={104} r={20} fill="url(#irisG)" />

          {/* ── Pupils + shine (or blink) ── */}
          {blink === "open" ? (
            <>
              <circle cx={82 + lookX} cy={104 + lookY} r={11} fill="url(#pupilG)" />
              <circle cx={138 + lookX} cy={104 + lookY} r={11} fill="url(#pupilG)" />
              <circle cx={76 + lookX * 0.3} cy={97 + lookY * 0.3} r={5} fill="white" opacity={0.95} />
              <circle cx={132 + lookX * 0.3} cy={97 + lookY * 0.3} r={5} fill="white" opacity={0.95} />
              <circle cx={85 + lookX * 0.3} cy={109 + lookY * 0.3} r={2.2} fill="white" opacity={0.5} />
              <circle cx={141 + lookX * 0.3} cy={109 + lookY * 0.3} r={2.2} fill="white" opacity={0.5} />
            </>
          ) : (
            <>
              <rect x={57} y={97} width={50} height={18} rx={9} fill="#1565C0" />
              <rect x={113} y={97} width={50} height={18} rx={9} fill="#1565C0" />
            </>
          )}

          {/* ── Eye glow rings ── */}
          <circle cx={82} cy={104} r={22} fill="none" stroke="#00E5FF" strokeWidth={1.5} opacity={0.3} filter="url(#glow2d)" />
          <circle cx={138} cy={104} r={22} fill="none" stroke="#00E5FF" strokeWidth={1.5} opacity={0.3} filter="url(#glow2d)" />

          {/* ── Beak ── */}
          <path d="M110,128 L97,150 L123,150 Z" fill="url(#beakG)" />
          <path d="M110,128 L110,150" stroke="#BF360C" strokeWidth={1.5} opacity={0.55} />
          <path d="M103,133 Q110,128 117,133" stroke="rgba(255,255,255,0.55)" strokeWidth={2} fill="none" strokeLinecap="round" />
        </svg>

        <div className="owl-hint">tap to react ✨</div>
      </div>
    </div>
  );
}
