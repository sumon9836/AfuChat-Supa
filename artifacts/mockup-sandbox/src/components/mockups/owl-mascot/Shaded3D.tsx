import { useEffect, useRef, useState } from "react";
import "./owl.css";

export function Shaded3D() {
  const [phase, setPhase] = useState(0);
  const raf = useRef<number>(0);
  const t = useRef(0);

  useEffect(() => {
    function tick() {
      t.current += 0.018;
      setPhase(t.current);
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const bob = Math.sin(t.current) * 7;
  const tilt = Math.sin(t.current * 0.7) * 3.5;
  const breathe = 1 + Math.sin(t.current * 1.2) * 0.012;
  const earL = Math.sin(t.current * 1.1 + 0.4) * 2;
  const earR = Math.sin(t.current * 1.1) * 2;
  const wingL = Math.sin(t.current * 0.8) * 6;
  const wingR = Math.sin(t.current * 0.8 + Math.PI) * 6;

  // Pupil look-around
  const lookX = Math.sin(t.current * 0.4) * 4;
  const lookY = Math.sin(t.current * 0.55) * 3;

  return (
    <div className="owl-stage" style={{ background: "linear-gradient(160deg, #1a0533 0%, #2d0b4e 50%, #0d1b47 100%)" }}>
      <div className="owl-label">B — 3D Shaded SVG</div>
      <div className="owl-sub">Radial-gradient depth shading</div>

      <div className="owl-wrap">
        <div className="owl-shadow" style={{ opacity: 0.5 }} />

        <svg
          viewBox="0 0 260 310"
          width="240"
          height="288"
          style={{
            filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.6))",
            transform: `translateY(${bob}px) rotate(${tilt}deg)`,
            transition: "none",
          }}
        >
          <defs>
            {/* 3D sphere shading — body */}
            <radialGradient id="bodyS" cx="32%" cy="26%" r="72%">
              <stop offset="0%" stopColor="#7E57C2" />
              <stop offset="42%" stopColor="#4527A0" />
              <stop offset="100%" stopColor="#1A0533" />
            </radialGradient>
            {/* 3D sphere shading — belly */}
            <radialGradient id="bellyS" cx="38%" cy="28%" r="68%">
              <stop offset="0%" stopColor="#EDE7F6" />
              <stop offset="55%" stopColor="#B39DDB" />
              <stop offset="100%" stopColor="#7E57C2" />
            </radialGradient>
            {/* Head sphere */}
            <radialGradient id="headS" cx="32%" cy="24%" r="70%">
              <stop offset="0%" stopColor="#9575CD" />
              <stop offset="40%" stopColor="#512DA8" />
              <stop offset="100%" stopColor="#1A0533" />
            </radialGradient>
            {/* Iris */}
            <radialGradient id="irisS" cx="30%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#FFD740" />
              <stop offset="50%" stopColor="#FF8F00" />
              <stop offset="100%" stopColor="#E65100" />
            </radialGradient>
            {/* Pupil depth */}
            <radialGradient id="pupilS" cx="28%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#263238" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
            {/* Wing shading */}
            <radialGradient id="wingLS" cx="70%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#5E35B1" />
              <stop offset="100%" stopColor="#1A0533" />
            </radialGradient>
            <radialGradient id="wingRS" cx="30%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#5E35B1" />
              <stop offset="100%" stopColor="#1A0533" />
            </radialGradient>
            {/* Ambient occlusion under body */}
            <radialGradient id="aoGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="innerShadow">
              <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
              <feBlend mode="multiply" />
            </filter>
          </defs>

          {/* ── Wings ── */}
          <ellipse
            cx="48" cy={200 + wingL} rx="34" ry="58"
            fill="url(#wingLS)" transform="rotate(-22,48,200)"
            opacity="0.95"
          />
          <ellipse
            cx="212" cy={200 + wingR} rx="34" ry="58"
            fill="url(#wingRS)" transform="rotate(22,212,200)"
            opacity="0.95"
          />
          {/* Wing highlight streaks */}
          <ellipse cx="44" cy={190 + wingL} rx="8" ry="22" fill="#9575CD" opacity="0.22" transform="rotate(-22,44,190)" />
          <ellipse cx="216" cy={190 + wingR} rx="8" ry="22" fill="#9575CD" opacity="0.22" transform="rotate(22,216,190)" />

          {/* ── AO shadow under body ── */}
          <ellipse cx="130" cy="278" rx="55" ry="12" fill="url(#aoGrad)" />

          {/* ── Body ── */}
          <ellipse cx="130" cy="215" rx="72" ry="86" fill="url(#bodyS)" style={{ transform: `scaleX(${breathe})`, transformOrigin: "130px 215px" }} />
          {/* Rim light (back) */}
          <ellipse cx="130" cy="215" rx="72" ry="86" fill="none" stroke="#7E57C2" strokeWidth="3" opacity="0.18" />

          {/* ── Belly ── */}
          <ellipse cx="130" cy="226" rx="44" ry="62" fill="url(#bellyS)" style={{ transform: `scaleX(${breathe})`, transformOrigin: "130px 226px" }} />

          {/* ── Belly stripes (embossed look) ── */}
          <path d="M96,205 Q130,194 164,205" stroke="#9575CD" strokeWidth="2" fill="none" opacity="0.45" />
          <path d="M100,222 Q130,212 160,222" stroke="#9575CD" strokeWidth="1.5" fill="none" opacity="0.35" />

          {/* ── Feet ── */}
          <path d="M102,288 L86,300 M102,288 L102,302 M102,288 L118,300" stroke="#FFB300" strokeWidth="5" strokeLinecap="round" />
          <path d="M158,288 L142,300 M158,288 L158,302 M158,288 L174,300" stroke="#FFB300" strokeWidth="5" strokeLinecap="round" />

          {/* ── Head ── */}
          <circle cx="130" cy="124" r="80" fill="url(#headS)" />
          {/* Facial disc — translucent */}
          <ellipse cx="130" cy="132" rx="58" ry="62" fill="#B39DDB" opacity="0.14" />
          {/* Rim light on head */}
          <circle cx="130" cy="124" r="80" fill="none" stroke="#9575CD" strokeWidth="2.5" opacity="0.2" />

          {/* ── Ear tufts ── */}
          <path d={`M82,60 L${90 + earL},28 L104,58`} fill="#512DA8" />
          <path d={`M156,58 L${170 + earR},28 L180,58`} fill="#512DA8" />
          {/* Tuft highlight */}
          <path d={`M86,58 L${92 + earL},36 L100,56`} fill="#9575CD" opacity="0.4" />
          <path d={`M160,56 L${172 + earR},36 L176,56`} fill="#9575CD" opacity="0.4" />

          {/* ── Eye sockets (depth) ── */}
          <circle cx="99" cy="122" r="32" fill="#1A0533" opacity="0.5" />
          <circle cx="161" cy="122" r="32" fill="#1A0533" opacity="0.5" />

          {/* ── Eye whites ── */}
          <circle cx="99" cy="120" r="28" fill="white" />
          <circle cx="161" cy="120" r="28" fill="white" />

          {/* ── Irises (3D sphere shaded) ── */}
          <circle cx="99" cy="120" r="21" fill="url(#irisS)" />
          <circle cx="161" cy="120" r="21" fill="url(#irisS)" />

          {/* ── Pupils ── */}
          <circle cx={99 + lookX} cy={120 + lookY} r="12" fill="url(#pupilS)" />
          <circle cx={161 + lookX} cy={120 + lookY} r="12" fill="url(#pupilS)" />

          {/* ── Eye shine (specular) ── */}
          <circle cx={93 + lookX * 0.3} cy={113 + lookY * 0.3} r="5.5" fill="white" opacity="0.92" />
          <circle cx={155 + lookX * 0.3} cy={113 + lookY * 0.3} r="5.5" fill="white" opacity="0.92" />
          <circle cx={102 + lookX * 0.3} cy={126 + lookY * 0.3} r="2.5" fill="white" opacity="0.45" />
          <circle cx={164 + lookX * 0.3} cy={126 + lookY * 0.3} r="2.5" fill="white" opacity="0.45" />

          {/* ── Glow ring around eyes ── */}
          <circle cx="99" cy="120" r="23" fill="none" stroke="#FFD740" strokeWidth="1.5" opacity="0.3" filter="url(#softGlow)" />
          <circle cx="161" cy="120" r="23" fill="none" stroke="#FFD740" strokeWidth="1.5" opacity="0.3" filter="url(#softGlow)" />

          {/* ── Beak ── */}
          <path d="M130,144 L116,165 L144,165 Z" fill="#FFB300" />
          <path d="M130,144 L130,165" stroke="#E65100" strokeWidth="1.5" opacity="0.6" />
          {/* Beak 3D highlight */}
          <path d="M122,149 Q130,144 138,149" stroke="#FFE082" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
          {/* Beak shadow */}
          <path d="M118,163 L144,163" stroke="#BF360C" strokeWidth="1" opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}
