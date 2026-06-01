import React, { useState } from "react";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

const CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%}
.rp-shell{
  display:flex;height:100vh;overflow:hidden;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
}
.rp-brand{
  flex:0 0 42%;display:flex;flex-direction:column;
  justify-content:space-between;padding:48px 52px;
  background:#0D0D0D;overflow:hidden;position:relative;
}
.rp-brand-bg{
  position:absolute;inset:0;
  background:radial-gradient(ellipse 80% 60% at 20% 80%,rgba(0,188,212,.18) 0%,transparent 70%),
             radial-gradient(ellipse 60% 50% at 80% 10%,rgba(212,168,83,.10) 0%,transparent 70%);
  pointer-events:none;
}
.rp-brand-top{position:relative;z-index:1}
.rp-brand-logo{display:flex;align-items:center;gap:10px;margin-bottom:56px}
.rp-brand-logo img{width:36px;height:36px;border-radius:10px;object-fit:cover}
.rp-brand-logo-name{font-size:18px;font-weight:800;color:#fff;letter-spacing:-.4px}
.rp-brand-logo-name em{color:#00BCD4;font-style:normal}
.rp-brand-headline{font-size:36px;font-weight:800;color:#fff;letter-spacing:-.7px;line-height:1.2;margin-bottom:14px}
.rp-brand-headline em{color:#00BCD4;font-style:normal}
.rp-brand-sub{font-size:15px;color:rgba(255,255,255,.5);line-height:1.65;max-width:340px}
.rp-brand-footer{position:relative;z-index:1;font-size:12px;color:rgba(255,255,255,.25)}
.rp-form-wrap{
  flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;padding:48px 56px;overflow-y:auto;
}
.rp-form-wrap.lt{background:#FAF8F5}
.rp-form-wrap.dk{background:#0F0F0F}
.rp-form{width:100%;max-width:400px}
.rp-back{
  display:inline-flex;align-items:center;gap:6px;
  font-size:13px;font-weight:600;color:#00BCD4;
  background:none;border:none;cursor:pointer;padding:0;
  text-decoration:none;margin-bottom:28px;
}
.rp-back:hover{text-decoration:underline}
.rp-icon{
  width:52px;height:52px;border-radius:16px;
  background:rgba(0,188,212,.12);border:1px solid rgba(0,188,212,.2);
  display:flex;align-items:center;justify-content:center;
  font-size:24px;margin-bottom:20px;
}
.rp-title{font-size:26px;font-weight:800;letter-spacing:-.5px;margin-bottom:6px}
.rp-title.lt{color:#1A1208}
.rp-title.dk{color:#F1F1F1}
.rp-sub{font-size:14px;margin-bottom:28px}
.rp-sub.lt{color:#8C7F6A}
.rp-sub.dk{color:#717171}
.rp-field{margin-bottom:16px}
.rp-label{display:block;font-size:12px;font-weight:600;letter-spacing:.03em;margin-bottom:5px}
.rp-label.lt{color:#5A5040}
.rp-label.dk{color:#AAAAAA}
.rp-input{
  width:100%;padding:11px 14px;border-radius:9px;
  font-size:14px;font-family:inherit;outline:none;
  transition:border-color .13s,box-shadow .13s;
}
.rp-input.lt{background:#fff;border:1.5px solid #DDD7C9;color:#1A1208}
.rp-input.lt::placeholder{color:#8C7F6A}
.rp-input.lt:focus{border-color:#00BCD4;box-shadow:0 0 0 3px rgba(0,188,212,.12)}
.rp-input.dk{background:#272727;border:1.5px solid #3A3A3A;color:#F1F1F1}
.rp-input.dk::placeholder{color:#717171}
.rp-input.dk:focus{border-color:#00BCD4;box-shadow:0 0 0 3px rgba(0,188,212,.15)}
.rp-btn{
  width:100%;padding:12px;border-radius:10px;border:none;
  font-size:15px;font-weight:700;color:#000;cursor:pointer;
  background:#00BCD4;transition:opacity .13s;
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.rp-btn:hover{opacity:.88}
.rp-btn:disabled{opacity:.5;cursor:not-allowed}
.rp-error{
  padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;
}
.rp-error.lt{background:#FFF0F0;color:#C0392B;border:1px solid #FCCACA}
.rp-error.dk{background:rgba(192,57,43,.15);color:#FF6B6B;border:1px solid rgba(192,57,43,.3)}
.rp-success{
  padding:16px;border-radius:10px;font-size:14px;line-height:1.6;
  text-align:center;margin-bottom:20px;
}
.rp-success.lt{background:#F0FFF4;color:#155724;border:1px solid #C3E6CB}
.rp-success.dk{background:rgba(52,199,89,.12);color:#4ADE80;border:1px solid rgba(52,199,89,.25)}
.rp-spin{
  width:16px;height:16px;border-radius:50%;
  border:2px solid rgba(0,0,0,0.2);border-top-color:#000;
  animation:rp-rot .7s linear infinite;
}
@keyframes rp-rot{to{transform:rotate(360deg)}}
@media(max-width:800px){
  .rp-brand{display:none}
  .rp-form-wrap{padding:36px 24px}
}
`;

export default function ResetPasswordPage() {
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const t = isDark ? "dk" : "lt";

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/update-password`
          : "https://afuchat.com/update-password";

      const { error: sbErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: redirectUrl,
      });
      if (sbErr) throw sbErr;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="rp-shell">

        {/* Left brand panel */}
        <div className="rp-brand">
          <div className="rp-brand-bg" />
          <div className="rp-brand-top">
            <div className="rp-brand-logo">
              <img src="/logo.svg" alt="AfuChat" />
              <span className="rp-brand-logo-name">Afu<em>Chat</em></span>
            </div>
            <h1 className="rp-brand-headline">
              Reset Your<br /><em>Password</em>
            </h1>
            <p className="rp-brand-sub">
              Enter the email linked to your account and we'll send you a secure link to set a new password.
            </p>
          </div>
          <div className="rp-brand-footer">
            © {new Date().getFullYear()} AfuChat Technologies Limited · Uganda
          </div>
        </div>

        {/* Right form panel */}
        <div className={`rp-form-wrap ${t}`}>
          <form className="rp-form" onSubmit={handleSubmit}>

            <button
              type="button"
              className="rp-back"
              onClick={() => router.replace("/(auth)/login")}
            >
              ← Back to sign in
            </button>

            <div className="rp-icon">🔑</div>

            <h2 className={`rp-title ${t}`}>Forgot password?</h2>
            <p className={`rp-sub ${t}`}>
              No worries — we'll send a reset link to your email.
            </p>

            {error && <div className={`rp-error ${t}`}>{error}</div>}

            {sent ? (
              <>
                <div className={`rp-success ${t}`}>
                  ✅ Reset link sent! Check your inbox (and spam folder) for an email from AfuChat.<br /><br />
                  Click the link in the email to set your new password.
                </div>
                <button
                  type="button"
                  className="rp-btn"
                  onClick={() => router.replace("/(auth)/login")}
                >
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                <div className="rp-field">
                  <label className={`rp-label ${t}`}>Email address</label>
                  <input
                    className={`rp-input ${t}`}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="rp-btn"
                  disabled={submitting}
                >
                  {submitting ? <div className="rp-spin" /> : "Send reset link"}
                </button>
              </>
            )}

          </form>
        </div>
      </div>
    </>
  );
}
