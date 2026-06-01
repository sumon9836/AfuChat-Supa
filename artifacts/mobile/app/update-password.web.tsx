import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

const CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%}
.up-shell{
  display:flex;height:100vh;overflow:hidden;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
}
.up-brand{
  flex:0 0 42%;display:flex;flex-direction:column;
  justify-content:space-between;padding:48px 52px;
  background:#0D0D0D;overflow:hidden;position:relative;
}
.up-brand-bg{
  position:absolute;inset:0;
  background:radial-gradient(ellipse 80% 60% at 20% 80%,rgba(0,188,212,.18) 0%,transparent 70%),
             radial-gradient(ellipse 60% 50% at 80% 10%,rgba(212,168,83,.10) 0%,transparent 70%);
  pointer-events:none;
}
.up-brand-top{position:relative;z-index:1}
.up-brand-logo{display:flex;align-items:center;gap:10px;margin-bottom:56px}
.up-brand-logo img{width:36px;height:36px;border-radius:10px;object-fit:cover}
.up-brand-logo-name{font-size:18px;font-weight:800;color:#fff;letter-spacing:-.4px}
.up-brand-logo-name em{color:#00BCD4;font-style:normal}
.up-brand-headline{font-size:36px;font-weight:800;color:#fff;letter-spacing:-.7px;line-height:1.2;margin-bottom:14px}
.up-brand-headline em{color:#00BCD4;font-style:normal}
.up-brand-sub{font-size:15px;color:rgba(255,255,255,.5);line-height:1.65;max-width:340px}
.up-brand-footer{position:relative;z-index:1;font-size:12px;color:rgba(255,255,255,.25)}
.up-form-wrap{
  flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;padding:48px 56px;overflow-y:auto;
}
.up-form-wrap.lt{background:#FAF8F5}
.up-form-wrap.dk{background:#0F0F0F}
.up-form{width:100%;max-width:400px}
.up-icon{
  width:52px;height:52px;border-radius:16px;
  background:rgba(0,188,212,.12);border:1px solid rgba(0,188,212,.2);
  display:flex;align-items:center;justify-content:center;
  font-size:24px;margin-bottom:20px;
}
.up-title{font-size:26px;font-weight:800;letter-spacing:-.5px;margin-bottom:6px}
.up-title.lt{color:#1A1208}
.up-title.dk{color:#F1F1F1}
.up-sub{font-size:14px;margin-bottom:28px}
.up-sub.lt{color:#8C7F6A}
.up-sub.dk{color:#717171}
.up-field{margin-bottom:12px}
.up-label{display:block;font-size:12px;font-weight:600;letter-spacing:.03em;margin-bottom:5px}
.up-label.lt{color:#5A5040}
.up-label.dk{color:#AAAAAA}
.up-input-wrap{position:relative}
.up-input{
  width:100%;padding:11px 42px 11px 14px;border-radius:9px;
  font-size:14px;font-family:inherit;outline:none;
  transition:border-color .13s,box-shadow .13s;
}
.up-input.lt{background:#fff;border:1.5px solid #DDD7C9;color:#1A1208}
.up-input.lt::placeholder{color:#8C7F6A}
.up-input.lt:focus{border-color:#00BCD4;box-shadow:0 0 0 3px rgba(0,188,212,.12)}
.up-input.dk{background:#272727;border:1.5px solid #3A3A3A;color:#F1F1F1}
.up-input.dk::placeholder{color:#717171}
.up-input.dk:focus{border-color:#00BCD4;box-shadow:0 0 0 3px rgba(0,188,212,.15)}
.up-eye{
  position:absolute;right:12px;top:50%;transform:translateY(-50%);
  background:none;border:none;cursor:pointer;padding:0;
  display:flex;align-items:center;
}
.up-hint{font-size:12px;margin-top:4px}
.up-hint.lt{color:#8C7F6A}
.up-hint.dk{color:#555}
.up-btn{
  width:100%;padding:12px;border-radius:10px;border:none;
  font-size:15px;font-weight:700;color:#000;cursor:pointer;
  background:#00BCD4;transition:opacity .13s;margin-top:8px;
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.up-btn:hover{opacity:.88}
.up-btn:disabled{opacity:.5;cursor:not-allowed}
.up-error{
  padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;
}
.up-error.lt{background:#FFF0F0;color:#C0392B;border:1px solid #FCCACA}
.up-error.dk{background:rgba(192,57,43,.15);color:#FF6B6B;border:1px solid rgba(192,57,43,.3)}
.up-success{
  padding:16px;border-radius:10px;font-size:14px;line-height:1.6;
  text-align:center;margin-bottom:20px;
}
.up-success.lt{background:#F0FFF4;color:#155724;border:1px solid #C3E6CB}
.up-success.dk{background:rgba(52,199,89,.12);color:#4ADE80;border:1px solid rgba(52,199,89,.25)}
.up-invalid{
  padding:20px;border-radius:12px;text-align:center;font-size:14px;line-height:1.7;
}
.up-invalid.lt{background:#FFF8E7;color:#856404;border:1px solid #FFD97D}
.up-invalid.dk{background:rgba(255,193,7,.10);color:#FFC107;border:1px solid rgba(255,193,7,.25)}
.up-spin{
  width:16px;height:16px;border-radius:50%;
  border:2px solid rgba(0,0,0,0.2);border-top-color:#000;
  animation:up-rot .7s linear infinite;
}
@keyframes up-rot{to{transform:rotate(360deg)}}
@media(max-width:800px){
  .up-brand{display:none}
  .up-form-wrap{padding:36px 24px}
}
`;

type PageState = "loading" | "ready" | "invalid" | "success";

export default function UpdatePasswordPage() {
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const t = isDark ? "dk" : "lt";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase processes the #access_token hash from the email link automatically.
    // Wait briefly to let it do so, then check for a recovery session.
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setPageState("ready");
      } else {
        setPageState("invalid");
      }
    }, 400);

    // Also listen for the PASSWORD_RECOVERY event fired by Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        clearTimeout(timer);
        setPageState("ready");
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { error: sbErr } = await supabase.auth.updateUser({ password });
      if (sbErr) throw sbErr;
      await supabase.auth.signOut();
      setPageState("success");
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const EyeOpen = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
  const EyeOff = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="up-shell">

        {/* Left brand panel */}
        <div className="up-brand">
          <div className="up-brand-bg" />
          <div className="up-brand-top">
            <div className="up-brand-logo">
              <img src="/logo.svg" alt="AfuChat" />
              <span className="up-brand-logo-name">Afu<em>Chat</em></span>
            </div>
            <h1 className="up-brand-headline">
              Set a New<br /><em>Password</em>
            </h1>
            <p className="up-brand-sub">
              Choose a strong password that's at least 8 characters. You'll use it to sign in to AfuChat on all your devices.
            </p>
          </div>
          <div className="up-brand-footer">
            © {new Date().getFullYear()} AfuChat Technologies Limited · Uganda
          </div>
        </div>

        {/* Right form panel */}
        <div className={`up-form-wrap ${t}`}>
          <div className="up-form">

            {pageState === "loading" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div className="up-spin" style={{ width: 32, height: 32, borderWidth: 3, borderTopColor: "#00BCD4", borderColor: isDark ? "#2A2A2A" : "#DDD7C9" }} />
                <p style={{ color: isDark ? "#717171" : "#8C7F6A", fontSize: 14 }}>Verifying your reset link…</p>
              </div>
            )}

            {pageState === "invalid" && (
              <>
                <div className="up-icon">⚠️</div>
                <h2 className={`up-title ${t}`}>Link expired</h2>
                <div className={`up-invalid ${t}`}>
                  This password reset link has expired or already been used.<br />
                  Please request a new one from the sign-in page.
                </div>
                <button
                  type="button"
                  className="up-btn"
                  onClick={() => router.replace("/(auth)/reset-password")}
                >
                  Request new link
                </button>
              </>
            )}

            {pageState === "ready" && (
              <form onSubmit={handleSubmit}>
                <div className="up-icon">🔒</div>
                <h2 className={`up-title ${t}`}>Set new password</h2>
                <p className={`up-sub ${t}`}>
                  Choose a strong password for your AfuChat account.
                </p>

                {error && <div className={`up-error ${t}`}>{error}</div>}

                <div className="up-field">
                  <label className={`up-label ${t}`}>New password</label>
                  <div className="up-input-wrap">
                    <input
                      className={`up-input ${t}`}
                      type={showPwd ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      autoFocus
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      className="up-eye"
                      onClick={() => setShowPwd(v => !v)}
                      style={{ color: isDark ? "#717171" : "#8C7F6A" }}
                    >
                      {showPwd ? EyeOff : EyeOpen}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 8 && (
                    <p className={`up-hint ${t}`}>Too short — need at least 8 characters</p>
                  )}
                </div>

                <div className="up-field">
                  <label className={`up-label ${t}`}>Confirm new password</label>
                  <div className="up-input-wrap">
                    <input
                      className={`up-input ${t}`}
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat your new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="up-eye"
                      onClick={() => setShowConfirm(v => !v)}
                      style={{ color: isDark ? "#717171" : "#8C7F6A" }}
                    >
                      {showConfirm ? EyeOff : EyeOpen}
                    </button>
                  </div>
                  {confirm.length > 0 && password !== confirm && (
                    <p className={`up-hint ${t}`} style={{ color: "#EF4444" }}>Passwords don't match</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="up-btn"
                  disabled={submitting || password.length < 8 || password !== confirm}
                >
                  {submitting ? <div className="up-spin" /> : "Update password"}
                </button>
              </form>
            )}

            {pageState === "success" && (
              <>
                <div className="up-icon">✅</div>
                <h2 className={`up-title ${t}`}>Password updated!</h2>
                <div className={`up-success ${t}`}>
                  Your password has been changed successfully.<br />
                  Please sign in with your new password.
                </div>
                <button
                  type="button"
                  className="up-btn"
                  onClick={() => router.replace("/(auth)/login")}
                >
                  Sign in
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
