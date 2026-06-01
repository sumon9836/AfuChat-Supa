import { useEffect, useRef, useState } from "react";
import "./owl.css";

export function Layered3D() {
  const t = useRef(0);
  const raf = useRef<number>(0);
  const [_, setTick] = useState(0);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    function frame() {
      t.current += 0.016;
      setTick(n => n + 1);
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const bob = Math.sin(t.current * 1.1) * 9;
  const rotY = hover ? 16 : Math.sin(t.current * 0.55) * 10;
  const rotX = Math.sin(t.current * 0.7) * 4;
  const breathX = 1 + Math.sin(t.current * 1.3) * 0.018;
  const breathY = 1 + Math.sin(t.current * 1.3 + Math.PI) * 0.014;
  const lookX = Math.sin(t.current * 0.4) * 5;
  const lookY = Math.sin(t.current * 0.6) * 4;
  const wingL = Math.sin(t.current * 0.9) * 8;
  const wingR = Math.sin(t.current * 0.9 + Math.PI * 0.4) * 8;
  const earL = Math.sin(t.current * 1.2 + 0.5) * 3;
  const earR = Math.sin(t.current * 1.2) * 3;
  const tailWag = Math.sin(t.current * 1.5) * 3;

  return (
    <div
      className="owl-stage"
      style={{ background: "linear-gradient(160deg, #0D1B2A 0%, #1B2838 50%, #0D2137 100%)" }}
    >
      <div className="owl-label">C — Full 3D Layered</div>
      <div className="owl-sub">CSS perspective + Z-depth layers</div>

      <div
        className="owl-wrap"
        style={{ perspective: "600px", cursor: "pointer" }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Ground glow */}
        <div style={{
          position: "absolute",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "150px",
          height: "28px",
          background: "radial-gradient(ellipse, rgba(0,188,212,0.35) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />

        <div
          style={{
            transformStyle: "preserve-3d",
            transform: `translateY(${bob}px) rotateY(${rotY}deg) rotateX(${rotX}deg)`,
            transition: hover ? "transform 0.6s cubic-bezier(0.34,1.56,0.64,1)" : "none",
            position: "relative",
            width: "220px",
            height: "290px",
          }}
        >
          {/* ── LAYER -3: Back wings (furthest back) ── */}
          <svg
            viewBox="0 0 220 290"
            width="220" height="290"
            style={{
              position: "absolute", top: 0, left: 0,
              transform: `translateZ(-28px) scaleX(${breathX})`,
              transformOrigin: "50% 50%",
              filter: "drop-shadow(-6px 4px 12px rgba(0,0,0,0.6))",
            }}
          >
            <defs>
              <radialGradient id="wBL" cx="65%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#37474F" />
                <stop offset="100%" stopColor="#102027" />
              </radialGradient>
              <radialGradient id="wBR" cx="35%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#37474F" />
                <stop offset="100%" stopColor="#102027" />
              </radialGradient>
            </defs>
            <ellipse cx={36} cy={185 + wingL} rx="30" ry="62" fill="url(#wBL)" transform="rotate(-26,36,185)" />
            <ellipse cx={184} cy={185 + wingR} rx="30" ry="62" fill="url(#wBR)" transform="rotate(26,184,185)" />
          </svg>

          {/* ── LAYER -2: Body ── */}
          <svg
            viewBox="0 0 220 290"
            width="220" height="290"
            style={{
              position: "absolute", top: 0, left: 0,
              transform: `translateZ(-14px) scaleX(${breathX}) scaleY(${breathY})`,
              transformOrigin: "50% 70%",
            }}
          >
            <defs>
              <radialGradient id="bodyL3" cx="30%" cy="24%" r="75%">
                <stop offset="0%" stopColor="#26C6DA" />
                <stop offset="38%" stopColor="#00838F" />
                <stop offset="100%" stopColor="#002F35" />
              </radialGradient>
              <radialGradient id="bellyL3" cx="36%" cy="26%" r="70%">
                <stop offset="0%" stopColor="#E0F7FA" />
                <stop offset="55%" stopColor="#80DEEA" />
                <stop offset="100%" stopColor="#26C6DA" />
              </radialGradient>
            </defs>
            <ellipse cx="110" cy="205" rx="68" ry="82" fill="url(#bodyL3)" />
            <ellipse cx="110" cy="216" rx="42" ry="58" fill="url(#bellyL3)" />
            {/* Belly stripes */}
            <path d="M78,200 Q110,190 142,200" stroke="#4DD0E1" strokeWidth="2" fill="none" opacity="0.5" />
            <path d="M82,218 Q110,208 138,218" stroke="#4DD0E1" strokeWidth="1.5" fill="none" opacity="0.4" />
            <path d="M86,234 Q110,226 134,234" stroke="#4DD0E1" strokeWidth="1" fill="none" opacity="0.3" />
          </svg>

          {/* ── LAYER -1: Head ── */}
          <svg
            viewBox="0 0 220 290"
            width="220" height="290"
            style={{
              position: "absolute", top: 0, left: 0,
              transform: "translateZ(-4px)",
            }}
          >
            <defs>
              <radialGradient id="headL3" cx="30%" cy="22%" r="74%">
                <stop offset="0%" stopColor="#26C6DA" />
                <stop offset="40%" stopColor="#006064" />
                <stop offset="100%" stopColor="#001F22" />
              </radialGradient>
            </defs>
            {/* Ear tufts */}
            <path d={`M65,54 L${73 + earL},22 L88,52`} fill="#006064" />
            <path d={`M132,52 L${147 + earR},22 L156,52`} fill="#006064" />
            {/* Ear highlight */}
            <path d={`M69,52 L${75 + earL},30 L84,50`} fill="#26C6DA" opacity="0.35" />
            <path d={`M136,50 L${149 + earR},30 L152,50`} fill="#26C6DA" opacity="0.35" />
            {/* Head sphere */}
            <circle cx="110" cy="108" r="72" fill="url(#headL3)" />
            {/* Rim light */}
            <circle cx="110" cy="108" r="72" fill="none" stroke="#26C6DA" strokeWidth="2" opacity="0.15" />
            {/* Facial disc */}
            <ellipse cx="110" cy="115" rx="50" ry="54" fill="#B2EBF2" opacity="0.11" />
          </svg>

          {/* ── LAYER 0: Face features (front) ── */}
          <svg
            viewBox="0 0 220 290"
            width="220" height="290"
            style={{
              position: "absolute", top: 0, left: 0,
              transform: "translateZ(8px)",
              filter: "drop-shadow(0 6px 16px rgba(0,188,212,0.4))",
            }}
          >
            <defs>
              <radialGradient id="irisL3" cx="28%" cy="26%" r="72%">
                <stop offset="0%" stopColor="#FFD740" />
                <stop offset="48%" stopColor="#FFB300" />
                <stop offset="100%" stopColor="#E65100" />
              </radialGradient>
              <radialGradient id="pupL3" cx="25%" cy="25%" r="70%">
                <stop offset="0%" stopColor="#1A237E" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
              <filter id="eyeGlow3d" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Eye whites */}
            <circle cx="83" cy="108" r="26" fill="white" />
            <circle cx="137" cy="108" r="26" fill="white" />

            {/* Irises */}
            <circle cx="83" cy="108" r="20" fill="url(#irisL3)" />
            <circle cx="137" cy="108" r="20" fill="url(#irisL3)" />

            {/* Pupils */}
            <circle cx={83 + lookX} cy={108 + lookY} r="11" fill="url(#pupL3)" />
            <circle cx={137 + lookX} cy={108 + lookY} r="11" fill="url(#pupL3)" />

            {/* Shine (specular) */}
            <circle cx={77 + lookX * 0.25} cy={101 + lookY * 0.25} r="5" fill="white" opacity="0.95" />
            <circle cx={131 + lookX * 0.25} cy={101 + lookY * 0.25} r="5" fill="white" opacity="0.95" />
            <circle cx={87 + lookX * 0.25} cy={114 + lookY * 0.25} r="2.2" fill="white" opacity="0.5" />
            <circle cx={141 + lookX * 0.25} cy={114 + lookY * 0.25} r="2.2" fill="white" opacity="0.5" />

            {/* Eye glow */}
            <circle cx="83" cy="108" r="22" fill="none" stroke="#FFD740" strokeWidth="2" opacity="0.35" filter="url(#eyeGlow3d)" />
            <circle cx="137" cy="108" r="22" fill="none" stroke="#FFD740" strokeWidth="2" opacity="0.35" filter="url(#eyeGlow3d)" />

            {/* Beak */}
            <path d="M110,128 L97,148 L123,148 Z" fill="#FFB300" />
            <path d="M110,128 L110,148" stroke="#E65100" strokeWidth="1.5" opacity="0.5" />
            <path d="M103,133 Q110,128 117,133" stroke="#FFE082" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.65" />
          </svg>

          {/* ── LAYER +1: Front wings (foreground) ── */}
          <svg
            viewBox="0 0 220 290"
            width="220" height="290"
            style={{
              position: "absolute", top: 0, left: 0,
              transform: `translateZ(18px)`,
              pointerEvents: "none",
            }}
          >
            <defs>
              <radialGradient id="wFL" cx="68%" cy="32%" r="72%">
                <stop offset="0%" stopColor="#00BCD4" />
                <stop offset="100%" stopColor="#004D5A" />
              </radialGradient>
              <radialGradient id="wFR" cx="32%" cy="32%" r="72%">
                <stop offset="0%" stopColor="#00BCD4" />
                <stop offset="100%" stopColor="#004D5A" />
              </radialGradient>
            </defs>
            {/* Only partial wings visible in front */}
            <path
              d={`M56,${162 + wingL} Q28,${188 + wingL} 38,${230 + wingL}`}
              stroke="url(#wFL)" strokeWidth="22" fill="none" strokeLinecap="round" opacity="0.7"
            />
            <path
              d={`M164,${162 + wingR} Q192,${188 + wingR} 182,${230 + wingR}`}
              stroke="url(#wFR)" strokeWidth="22" fill="none" strokeLinecap="round" opacity="0.7"
            />

            {/* Feet */}
            <path d="M86,278 L72,290 M86,278 L86,292 M86,278 L100,290" stroke="#FFB300" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M134,278 L120,290 M134,278 L134,292 M134,278 L148,290" stroke="#FFB300" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
        </div>

        <div className="owl-hint">hover to rotate 🌀</div>
      </div>
    </div>
  );
}
