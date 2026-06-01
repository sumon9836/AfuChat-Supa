import { useEffect, useRef, useState } from "react";
import "./owl.css";

export function Smooth2D() {
  const [blink, setBlink] = useState(false);
  const [wink, setWink] = useState(false);
  const [excited, setExcited] = useState(false);
  const blinkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function schedBlink() {
      const gap = 2200 + Math.random() * 3500;
      blinkRef.current = setTimeout(() => {
        if (Math.random() < 0.15) {
          setWink(true);
          setTimeout(() => setWink(false), 160);
        } else {
          setBlink(true);
          setTimeout(() => setBlink(false), 150);
        }
        schedBlink();
      }, gap);
    }
    schedBlink();
    return () => { if (blinkRef.current) clearTimeout(blinkRef.current); };
  }, []);

  return (
    <div className="owl-stage" style={{ background: "linear-gradient(160deg, #00BCD4 0%, #006064 100%)" }}>
      <div className="owl-label">A — Smooth 2D</div>
      <div className="owl-sub">Telegram-style animated character</div>

      <div className={`owl-wrap ${excited ? "excited" : ""}`}>
        {/* Shadow */}
        <div className="owl-shadow" />

        {/* Body */}
        <svg
          viewBox="0 0 220 280"
          width="220"
          height="280"
          className="owl-svg"
          style={{ filter: "drop-shadow(0 18px 32px rgba(0,0,0,0.35))" }}
          onClick={() => { setExcited(true); setTimeout(() => setExcited(false), 600); }}
        >
          <defs>
            <radialGradient id="bodyGrad" cx="38%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#42A5F5" />
              <stop offset="100%" stopColor="#1565C0" />
            </radialGradient>
            <radialGradient id="bellyGrad" cx="40%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#E3F2FD" />
              <stop offset="100%" stopColor="#BBDEFB" />
            </radialGradient>
            <radialGradient id="eyeGradL" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#00E5FF" />
              <stop offset="100%" stopColor="#00ACC1" />
            </radialGradient>
            <radialGradient id="eyeGradR" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#00E5FF" />
              <stop offset="100%" stopColor="#00ACC1" />
            </radialGradient>
            <radialGradient id="headGrad" cx="38%" cy="28%" r="65%">
              <stop offset="0%" stopColor="#42A5F5" />
              <stop offset="100%" stopColor="#1565C0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Wings */}
          <ellipse cx="32" cy="178" rx="28" ry="48" fill="url(#bodyGrad)" transform="rotate(-18,32,178)" />
          <ellipse cx="188" cy="178" rx="28" ry="48" fill="url(#bodyGrad)" transform="rotate(18,188,178)" />
          {/* Wing highlight */}
          <ellipse cx="32" cy="165" rx="10" ry="20" fill="#64B5F6" opacity="0.35" transform="rotate(-18,32,165)" />
          <ellipse cx="188" cy="165" rx="10" ry="20" fill="#64B5F6" opacity="0.35" transform="rotate(18,188,165)" />

          {/* Body */}
          <ellipse cx="110" cy="200" rx="68" ry="82" fill="url(#bodyGrad)" />

          {/* Belly */}
          <ellipse cx="110" cy="210" rx="42" ry="58" fill="url(#bellyGrad)" />

          {/* Belly stripes */}
          <path d="M80,195 Q110,185 140,195" stroke="#90CAF9" strokeWidth="2.5" fill="none" opacity="0.6" />
          <path d="M84,212 Q110,203 136,212" stroke="#90CAF9" strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M88,228 Q110,220 132,228" stroke="#90CAF9" strokeWidth="1.5" fill="none" opacity="0.4" />

          {/* Feet */}
          <path d="M86,272 L72,282 M86,272 L86,284 M86,272 L100,282" stroke="#FFB300" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M134,272 L120,282 M134,272 L134,284 M134,272 L148,282" stroke="#FFB300" strokeWidth="4.5" strokeLinecap="round" />

          {/* Head */}
          <circle cx="110" cy="112" r="72" fill="url(#headGrad)" />
          {/* Facial disc */}
          <ellipse cx="110" cy="118" rx="52" ry="56" fill="#BBDEFB" opacity="0.28" />

          {/* Ear tufts */}
          <path d="M68,55 L78,28 L92,55" fill="#1565C0" />
          <path d="M128,55 L142,28 L152,55" fill="#1565C0" />
          {/* Tuft highlight */}
          <path d="M74,52 L81,34 L87,52" fill="#42A5F5" opacity="0.4" />
          <path d="M134,52 L141,34 L147,52" fill="#42A5F5" opacity="0.4" />

          {/* Eye whites */}
          <circle cx="83" cy="110" r="28" fill="white" />
          <circle cx="137" cy="110" r="28" fill="white" />

          {/* Eye irises */}
          <circle cx="83" cy="110" r="22" fill="url(#eyeGradL)" />
          <circle cx="137" cy="110" r="22" fill="url(#eyeGradR)" />

          {/* Pupils */}
          {!blink && !wink && (
            <>
              <circle cx="86" cy="112" r="13" fill="#0D1321" />
              <circle cx="140" cy="112" r="13" fill="#0D1321" />
              {/* Eye shine */}
              <circle cx="80" cy="105" r="5" fill="white" opacity="0.9" />
              <circle cx="134" cy="105" r="5" fill="white" opacity="0.9" />
              <circle cx="89" cy="117" r="2.5" fill="white" opacity="0.5" />
              <circle cx="143" cy="117" r="2.5" fill="white" opacity="0.5" />
            </>
          )}
          {/* Blink */}
          {(blink || wink) && (
            <>
              <rect x="61" y="104" width="44" height="16" rx="8" fill="#1565C0" />
              {wink ? (
                <circle cx="140" cy="112" r="13" fill="#0D1321" />
              ) : (
                <rect x="115" y="104" width="44" height="16" rx="8" fill="#1565C0" />
              )}
              {!blink && <circle cx="134" cy="105" r="5" fill="white" opacity="0.9" />}
            </>
          )}

          {/* Eye glow ring */}
          <circle cx="83" cy="110" r="24" fill="none" stroke="#00E5FF" strokeWidth="1.5" opacity="0.4" filter="url(#glow)" />
          <circle cx="137" cy="110" r="24" fill="none" stroke="#00E5FF" strokeWidth="1.5" opacity="0.4" filter="url(#glow)" />

          {/* Beak */}
          <path d="M110,128 L98,146 L122,146 Z" fill="#FFB300" />
          <path d="M110,128 L110,146" stroke="#E65100" strokeWidth="1.5" opacity="0.5" />
          {/* Beak highlight */}
          <path d="M104,132 L108,143" stroke="#FFE082" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </svg>

        {/* Click hint */}
        <div className="owl-hint">tap to react ✨</div>
      </div>
    </div>
  );
}
