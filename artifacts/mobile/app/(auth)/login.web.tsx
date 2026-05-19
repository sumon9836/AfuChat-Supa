import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import GoogleOneTap from "@/components/ui/GoogleOneTap";

const CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%}

/* ── Shell ── */
.dl-shell{
  display:flex;height:100vh;overflow:hidden;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
}

/* ── Left brand panel ── */
.dl-brand{
  flex:0 0 42%;display:flex;flex-direction:column;
  justify-content:space-between;padding:48px 52px;
  background:#0D0D0D;overflow:hidden;position:relative;
}
.dl-brand-bg{
  position:absolute;inset:0;
  background:radial-gradient(ellipse 80% 60% at 20% 80%,rgba(0,188,212,.18) 0%,transparent 70%),
             radial-gradient(ellipse 60% 50% at 80% 10%,rgba(212,168,83,.10) 0%,transparent 70%);
  pointer-events:none;
}
.dl-brand-top{position:relative;z-index:1}
.dl-brand-logo{display:flex;align-items:center;gap:10px;margin-bottom:56px}
.dl-brand-logo img{width:36px;height:36px;border-radius:10px;object-fit:cover}
.dl-brand-logo-name{font-size:18px;font-weight:800;color:#fff;letter-spacing:-.4px}
.dl-brand-logo-name em{color:#00BCD4;font-style:normal}
.dl-brand-headline{font-size:36px;font-weight:800;color:#fff;letter-spacing:-.7px;line-height:1.2;margin-bottom:14px}
.dl-brand-headline em{color:#00BCD4;font-style:normal}
.dl-brand-sub{font-size:15px;color:rgba(255,255,255,.5);line-height:1.65;max-width:340px}

.dl-features{position:relative;z-index:1;display:flex;flex-direction:column;gap:14px}
.dl-feature{display:flex;align-items:flex-start;gap:12px}
.dl-feature-icon{
  width:34px;height:34px;border-radius:9px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:16px;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);
}
.dl-feature-text{font-size:13px;color:rgba(255,255,255,.55);line-height:1.55;padding-top:1px}
.dl-feature-title{font-size:13.5px;font-weight:600;color:rgba(255,255,255,.85);display:block;margin-bottom:1px}

.dl-brand-footer{position:relative;z-index:1;font-size:12px;color:rgba(255,255,255,.25)}

/* ── Right form panel ── */
.dl-form-wrap{
  flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;padding:48px 56px;overflow-y:auto;
}
.dl-form-wrap.dl-lt{background:#FAF8F5}
.dl-form-wrap.dl-dk{background:#0F0F0F}

.dl-form{width:100%;max-width:400px}
.dl-form-head{margin-bottom:28px}
.dl-form-title{
  font-size:26px;font-weight:800;letter-spacing:-.5px;margin-bottom:5px;
}
.dl-form-title.dl-lt-txt{color:#1A1208}
.dl-form-title.dl-dk-txt{color:#F1F1F1}
.dl-form-sub{font-size:14px}
.dl-form-sub.dl-lt-sub{color:#8C7F6A}
.dl-form-sub.dl-dk-sub{color:#717171}

/* ── Google button ── */
.dl-google-btn{
  display:flex;align-items:center;justify-content:center;gap:10px;
  width:100%;padding:12px 20px;border-radius:10px;
  font-size:15px;font-weight:600;cursor:pointer;
  transition:background .13s,box-shadow .13s;
  text-decoration:none;border:none;
}
.dl-google-btn.dl-lt{background:#fff;color:#1A1208;border:1.5px solid #DDD7C9;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.dl-google-btn.dl-lt:hover{background:#F5F0E8;box-shadow:0 2px 8px rgba(0,0,0,0.12)}
.dl-google-btn.dl-dk{background:#272727;color:#F1F1F1;border:1.5px solid #3A3A3A;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
.dl-google-btn.dl-dk:hover{background:#333;box-shadow:0 2px 8px rgba(0,0,0,0.35)}
.dl-google-btn:disabled{opacity:.55;cursor:not-allowed}

/* ── Divider ── */
.dl-divider{
  display:flex;align-items:center;gap:12px;
  margin:18px 0;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;
}
.dl-divider-line{flex:1;height:1px}
.dl-divider-line.dl-lt{background:#DDD7C9}
.dl-divider-line.dl-dk{background:#2C2C2E}
.dl-divider-txt.dl-lt{color:#8C7F6A}
.dl-divider-txt.dl-dk{color:#717171}

/* ── Form fields ── */
.dl-field{margin-bottom:12px}
.dl-field-label{
  display:block;font-size:12px;font-weight:600;letter-spacing:.03em;
  margin-bottom:5px;
}
.dl-field-label.dl-lt{color:#5A5040}
.dl-field-label.dl-dk{color:#AAAAAA}
.dl-field-input{
  width:100%;padding:11px 14px;border-radius:9px;
  font-size:14px;font-family:inherit;outline:none;
  transition:border-color .13s,box-shadow .13s;
}
.dl-field-input.dl-lt{
  background:#fff;border:1.5px solid #DDD7C9;color:#1A1208;
}
.dl-field-input.dl-lt::placeholder{color:#8C7F6A}
.dl-field-input.dl-lt:focus{border-color:#00BCD4;box-shadow:0 0 0 3px rgba(0,188,212,.12)}
.dl-field-input.dl-dk{
  background:#272727;border:1.5px solid #3A3A3A;color:#F1F1F1;
}
.dl-field-input.dl-dk::placeholder{color:#717171}
.dl-field-input.dl-dk:focus{border-color:#00BCD4;box-shadow:0 0 0 3px rgba(0,188,212,.15)}

.dl-field-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}
.dl-forgot{
  font-size:12px;font-weight:600;color:#00BCD4;
  background:none;border:none;cursor:pointer;padding:0;text-decoration:none;
}
.dl-forgot:hover{text-decoration:underline}

/* ── Sign in button ── */
.dl-submit{
  width:100%;padding:12px;border-radius:10px;border:none;
  font-size:15px;font-weight:700;color:#000;cursor:pointer;
  background:#00BCD4;transition:opacity .13s;margin-top:4px;
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.dl-submit:hover{opacity:.88}
.dl-submit:disabled{opacity:.5;cursor:not-allowed}

/* ── Error ── */
.dl-error{
  padding:10px 14px;border-radius:8px;font-size:13px;
  margin-bottom:14px;
}
.dl-error.dl-lt{background:#FFF0F0;color:#C0392B;border:1px solid #FCCACA}
.dl-error.dl-dk{background:rgba(192,57,43,.15);color:#FF6B6B;border:1px solid rgba(192,57,43,.3)}

/* ── Footer links ── */
.dl-switch{
  display:flex;align-items:center;justify-content:center;
  gap:6px;margin-top:20px;font-size:14px;
}
.dl-switch-txt.dl-lt{color:#8C7F6A}
.dl-switch-txt.dl-dk{color:#717171}
.dl-switch-link{
  font-size:14px;font-weight:700;color:#00BCD4;
  background:none;border:none;cursor:pointer;text-decoration:none;padding:0;
}
.dl-switch-link:hover{text-decoration:underline}

/* ── Spinner ── */
.dl-spin{
  width:16px;height:16px;border-radius:50%;
  border:2px solid rgba(0,0,0,0.2);border-top-color:#000;
  animation:dl-rotate .7s linear infinite;
}
@keyframes dl-rotate{to{transform:rotate(360deg)}}

/* ── Responsive ── */
@media(max-width:800px){
  .dl-brand{display:none}
  .dl-form-wrap{padding:36px 24px}
}
`;

const GOOGLE_SVG = (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.3 29.4 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.7 7.1 29.1 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20 20-8.9 20-20c0-1.5-.2-3-.4-4.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.7 7.1 29.1 5 24 5 16.3 5 9.7 9 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 45c5 0 9.5-1.9 12.9-5l-6-5.1C29.4 36.5 26.8 37.5 24 37.5c-5.3 0-9.8-3.6-11.3-8.5l-6.5 5C9.7 41 16.3 45 24 45z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.1 5.5-5.6 7.2l6 5.1C39.5 37.5 44 32 44 25c0-1.5-.2-3-.4-4.5z"/>
  </svg>
);

export default function DesktopLoginPage() {
  const { session, loading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [error, setError]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const lt = isDark ? "dl-dk" : "dl-lt";
  const ltTxt = isDark ? "dl-dk-txt" : "dl-lt-txt";

  useEffect(() => {
    if (!loading && session) {
      router.replace("/(tabs)");
    }
  }, [session, loading]);

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (err) throw err;
    } catch (e: any) {
      setError(e.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      let email = identifier.trim();

      if (!email.includes("@") || email.startsWith("@")) {
        const ident = email.startsWith("@") ? email.slice(1) : email;
        const { data, error: fnErr } = await supabase.functions.invoke("auth-resolve-identifier", {
          body: { identifier: ident },
        });
        if (fnErr || !data?.email) {
          throw new Error("No account found with that email, handle, or phone number.");
        }
        email = data.email;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        if (signInErr.message.toLowerCase().includes("email not confirmed")) {
          throw new Error("Please verify your email first. Check your inbox.");
        }
        throw signInErr;
      }

      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Sign-in failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: "💬", title: "Secure Messaging",    desc: "End-to-end encrypted chats, voice notes, and group conversations." },
    { icon: "🤖", title: "AfuAI Assistant",     desc: "Your built-in AI — ask anything, draft messages, generate images." },
    { icon: "💰", title: "AfuPay Wallet",        desc: "Send money, pay for services, manage your digital wallet." },
    { icon: "🌍", title: "Built for Africa",     desc: "Optimized for 2G, 3G, and slow Wi-Fi across the continent." },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <GoogleOneTap />

      <div className="dl-shell">

        {/* ══ LEFT: Brand panel ══ */}
        <div className="dl-brand">
          <div className="dl-brand-bg" />

          <div className="dl-brand-top">
            <div className="dl-brand-logo">
              <img src="/logo.png" alt="AfuChat" />
              <span className="dl-brand-logo-name">Afu<em>Chat</em></span>
            </div>
            <h1 className="dl-brand-headline">
              The Super App<br /><em>Africa Deserves</em>
            </h1>
            <p className="dl-brand-sub">
              Messaging, payments, AI, and community — all in one beautifully designed platform.
            </p>
          </div>

          <div className="dl-features">
            {features.map((f) => (
              <div key={f.title} className="dl-feature">
                <div className="dl-feature-icon">{f.icon}</div>
                <div className="dl-feature-text">
                  <span className="dl-feature-title">{f.title}</span>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>

          <div className="dl-brand-footer">
            © {new Date().getFullYear()} AfuChat Technologies Limited · Uganda
          </div>
        </div>

        {/* ══ RIGHT: Form panel ══ */}
        <div className={`dl-form-wrap ${lt}`}>
          <form className="dl-form" onSubmit={handleLogin}>

            <div className="dl-form-head">
              <h2 className={`dl-form-title ${ltTxt}`}>Welcome back</h2>
              <p className={`dl-form-sub ${isDark ? "dl-dk-sub" : "dl-lt-sub"}`}>
                Sign in to continue to AfuChat
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className={`dl-error ${lt}`}>{error}</div>
            )}

            {/* Google sign-in — one tap */}
            <button
              type="button"
              className={`dl-google-btn ${lt}`}
              onClick={handleGoogleLogin}
              disabled={googleLoading || submitting}
            >
              {googleLoading ? (
                <div className="dl-spin" style={{ borderTopColor: isDark ? "#F1F1F1" : "#1A1208" }} />
              ) : (
                GOOGLE_SVG
              )}
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            {/* Divider */}
            <div className="dl-divider">
              <div className={`dl-divider-line ${lt}`} />
              <span className={`dl-divider-txt ${lt}`}>or sign in with email</span>
              <div className={`dl-divider-line ${lt}`} />
            </div>

            {/* Email / handle */}
            <div className="dl-field">
              <label className={`dl-field-label ${lt}`}>Email, handle or phone</label>
              <input
                className={`dl-field-input ${lt}`}
                type="text"
                placeholder="you@example.com or @handle"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="dl-field">
              <div className="dl-field-row">
                <label className={`dl-field-label ${lt}`} style={{ marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  className="dl-forgot"
                  onClick={() => alert("To reset your password, open the AfuChat mobile app and use 'Forgot password?' — or contact support at support@afuchat.com.")}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  className={`dl-field-input ${lt}`}
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer", padding: 0,
                    color: isDark ? "#717171" : "#8C7F6A",
                    display: "flex", alignItems: "center",
                  }}
                >
                  {showPwd ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              className="dl-submit"
              disabled={submitting || googleLoading}
              style={{ marginTop: 8 }}
            >
              {submitting ? (
                <div className="dl-spin" />
              ) : (
                "Sign In"
              )}
            </button>

            {/* Register link */}
            <div className="dl-switch">
              <span className={`dl-switch-txt ${lt}`}>Don't have an account?</span>
              <button
                type="button"
                className="dl-switch-link"
                onClick={() => router.replace("/(auth)/register")}
              >
                Create account
              </button>
            </div>

            {/* Legal */}
            <p style={{
              textAlign: "center", fontSize: 11, marginTop: 20,
              color: isDark ? "#3A3A3A" : "#C0B9AE", lineHeight: 1.6,
            }}>
              By signing in, you agree to our{" "}
              <a href="/terms" style={{ color: "#00BCD4", textDecoration: "none" }}>Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" style={{ color: "#00BCD4", textDecoration: "none" }}>Privacy Policy</a>.
            </p>

          </form>
        </div>
      </div>
    </>
  );
}
