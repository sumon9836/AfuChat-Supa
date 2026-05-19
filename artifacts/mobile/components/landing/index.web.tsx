import React, { useEffect, useState } from "react";
import { Twitter, Instagram, Youtube, Menu, X as XIcon } from "lucide-react";

export const TEAL = "#00BCD4";
export const GOLD = "#D4A853";

const TG_SVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.25-2.02 9.52c-.14.66-.54.82-1.08.51l-3-2.21-1.45 1.39c-.16.16-.3.3-.61.3l.21-3.05 5.56-5.02c.24-.21-.05-.33-.37-.12l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.14-.95l11.57-4.46c.54-.2 1.01.13.88.7z"/>
  </svg>
);

const WA_SVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17 0-.37-.02-.57-.02-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 2.12.56 4.1 1.53 5.82L0 24l6.35-1.66A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0zm0 21.8a9.76 9.76 0 0 1-4.97-1.35l-.36-.21-3.71.97.99-3.62-.23-.37A9.78 9.78 0 0 1 2.2 12c0-5.4 4.4-9.8 9.8-9.8 5.4 0 9.8 4.4 9.8 9.8 0 5.4-4.4 9.8-9.8 9.8z"/>
  </svg>
);

export const LANDING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.lp*,.lp *::before,.lp *::after{box-sizing:border-box;margin:0;padding:0}
.lp{
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased;
  --bg:#FAF8F5; --bg2:#F2EFE9; --bg3:#E8E3DA;
  --surf:#FFFFFF; --bdr:#E0DAD0;
  --txt:#0D0D0D; --txt2:#5A5550; --txt3:#9A9490;
  --cl:#00BCD4; --gd:#D4A853;
  background:var(--bg); color:var(--txt);
}
@media(prefers-color-scheme:dark){
  .lp{
    --bg:#000; --bg2:#0C0C0C; --bg3:#141414;
    --surf:#0C0C0C; --bdr:#1E1E1E;
    --txt:#FFF; --txt2:#666; --txt3:#333;
  }
}

/* Animations */
@keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes lp-pulse{0%{box-shadow:0 0 0 0 rgba(0,188,212,.4)}70%{box-shadow:0 0 0 12px rgba(0,188,212,0)}100%{box-shadow:0 0 0 0 rgba(0,188,212,0)}}
@keyframes lp-mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes lp-scan{0%{top:0}100%{top:100%}}
@keyframes lp-fade{from{opacity:0}to{opacity:1}}

/* Reveal */
.lp-r{opacity:0;transform:translateY(20px);transition:opacity .55s ease,transform .55s ease}
.lp-r.lp-in{opacity:1;transform:translateY(0)}
.lp-d1{transition-delay:.07s}.lp-d2{transition-delay:.16s}.lp-d3{transition-delay:.25s}.lp-d4{transition-delay:.34s}

/* Nav */
.lp-nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 6%;height:64px;background:var(--bg);border-bottom:1px solid var(--bdr)}
.lp-nav-brand{display:flex;align-items:center;gap:9px;cursor:pointer;text-decoration:none}
.lp-nav-logo{width:32px;height:32px;border-radius:8px;object-fit:cover}
.lp-nav-name{font-size:18px;font-weight:800;color:var(--txt);letter-spacing:-.4px}
.lp-nav-name em{color:var(--cl);font-style:normal}
.lp-nav-links{display:flex;align-items:center;gap:2px;list-style:none}
.lp-nav-links a{color:var(--txt2);text-decoration:none;font-size:13.5px;font-weight:500;padding:7px 11px;border-radius:6px;transition:color .15s,background .15s}
.lp-nav-links a:hover{color:var(--txt);background:var(--bg2)}
.lp-nav-links a.act{color:var(--cl)}
.lp-nav-cta{background:var(--cl)!important;color:#000!important;font-weight:700!important;padding:8px 18px!important;border-radius:6px!important}
.lp-nav-cta:hover{opacity:.88;background:var(--cl)!important}
.lp-hamburger{display:none;align-items:center;justify-content:center;cursor:pointer;background:none;border:1px solid var(--bdr);border-radius:6px;padding:6px 8px;color:var(--txt2)}
.lp-hamburger:hover{border-color:var(--txt3)}
.lp-mob{display:none;position:fixed;top:64px;left:0;right:0;background:var(--bg);border-bottom:1px solid var(--bdr);padding:10px 6% 18px;z-index:49;flex-direction:column;gap:2px}
.lp-mob.open{display:flex}
.lp-mob a{color:var(--txt2);text-decoration:none;font-size:15px;font-weight:500;padding:10px 8px;border-bottom:1px solid var(--bdr);display:block}
.lp-mob a:last-child{border-bottom:0;color:var(--cl);font-weight:700}

/* Buttons */
.lp-btn-p{display:inline-flex;align-items:center;gap:7px;background:var(--cl);color:#000;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;transition:opacity .15s;cursor:pointer;border:none;white-space:nowrap}
.lp-btn-p:hover{opacity:.88}
.lp-btn-s{display:inline-flex;align-items:center;gap:7px;background:transparent;border:1px solid var(--bdr);color:var(--txt2);text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;transition:border-color .15s,color .15s;cursor:pointer;white-space:nowrap}
.lp-btn-s:hover{border-color:var(--txt3);color:var(--txt)}
.lp-btn-g{display:inline-flex;align-items:center;gap:7px;background:var(--gd);color:#000;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;transition:opacity .15s;cursor:pointer;border:none}
.lp-btn-g:hover{opacity:.88}

/* Badge */
.lp-badge{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--bdr);color:var(--txt3);font-size:11px;font-weight:600;padding:5px 12px;border-radius:100px;margin-bottom:22px;letter-spacing:.6px;text-transform:uppercase}
.lp-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--cl);animation:lp-pulse 2s infinite;flex-shrink:0}

/* Hero */
.lp-hero{min-height:calc(100vh - 64px);display:flex;align-items:center;padding:80px 6% 60px}
.lp-hero-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:60px;width:100%}
.lp-h1{font-size:clamp(32px,5vw,64px);font-weight:900;line-height:1.06;margin-bottom:18px;letter-spacing:-2px;color:var(--txt)}
.lp-h1 em{color:var(--cl);font-style:normal}
.lp-sub{font-size:clamp(14px,1.5vw,17px);color:var(--txt2);line-height:1.75;margin-bottom:30px;max-width:480px}
.lp-ctas{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:40px}
.lp-stats{display:flex;gap:24px;flex-wrap:wrap;padding-top:28px;border-top:1px solid var(--bdr)}
.lp-stat-n{font-size:20px;font-weight:800;color:var(--txt);line-height:1}
.lp-stat-l{font-size:11px;color:var(--txt3);margin-top:3px;font-weight:500;text-transform:uppercase;letter-spacing:.5px}
.lp-phone{flex:0 0 auto;width:min(280px,35vw);position:relative;animation:lp-float 6s ease-in-out infinite}
.lp-frame{position:relative;width:100%;padding-top:216%;border-radius:28px;overflow:hidden;border:1px solid var(--bdr);box-shadow:0 32px 64px rgba(0,0,0,.1)}
.lp-frame img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:top}

/* Marquee */
.lp-mq-wrap{overflow:hidden;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);padding:10px 0;background:var(--bg2)}
.lp-mq-track{display:flex;white-space:nowrap;animation:lp-mq 32s linear infinite}
.lp-mq-item{display:inline-flex;align-items:center;gap:7px;padding:0 20px;color:var(--txt3);font-size:12.5px;font-weight:500}
.lp-mq-sep{width:1px;height:12px;background:var(--bdr);flex-shrink:0;margin:0 4px}

/* Sections */
.lp-sec{max-width:1100px;margin:0 auto;padding:80px 6%}
.lp-sec-bg{background:var(--bg2);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)}
.lp-sec-label{display:inline-block;color:var(--cl);font-size:10.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:10px}
.lp-h2{font-size:clamp(22px,3.2vw,42px);font-weight:800;line-height:1.1;letter-spacing:-1.2px;margin-bottom:10px;color:var(--txt)}
.lp-h2 em{color:var(--cl);font-style:normal}
.lp-h2 b{color:var(--gd);font-weight:900}
.lp-sec-sub{color:var(--txt2);font-size:clamp(13.5px,1.2vw,15.5px);line-height:1.75;max-width:520px}
.lp-page-hero{padding:80px 6% 60px;max-width:1100px;margin:0 auto}
.lp-page-h1{font-size:clamp(28px,4vw,52px);font-weight:900;line-height:1.08;letter-spacing:-1.5px;color:var(--txt);margin-bottom:14px}
.lp-page-h1 em{color:var(--cl);font-style:normal}
.lp-page-sub{font-size:clamp(15px,1.4vw,18px);color:var(--txt2);line-height:1.7;max-width:560px}

/* Cards grid */
.lp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;border:1px solid var(--bdr);border-radius:12px;overflow:hidden;background:var(--bdr);margin-top:40px}
.lp-card{background:var(--surf);padding:26px;transition:background .15s}
.lp-card:hover{background:var(--bg2)}
.lp-card-icon{width:44px;height:44px;border:1px solid var(--bdr);border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;background:var(--bg)}
.lp-card-title{font-size:15px;font-weight:700;margin-bottom:7px;color:var(--txt)}
.lp-card-desc{color:var(--txt2);font-size:13px;line-height:1.65}

/* Trust */
.lp-trust{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:48px}
.lp-trust-item{text-align:center;padding:32px 22px;background:var(--surf);border:1px solid var(--bdr);border-radius:16px}
.lp-trust-icon{width:54px;height:54px;border-radius:15px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
.lp-trust-title{font-size:15px;font-weight:700;margin-bottom:7px;color:var(--txt)}
.lp-trust-desc{font-size:13px;color:var(--txt2);line-height:1.65}

/* Showcase tabs */
.lp-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:24px 0 32px}
.lp-tab{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--bdr);background:transparent;color:var(--txt2);transition:all .15s}
.lp-tab:hover{color:var(--txt);border-color:var(--txt3)}
.lp-tab.act{background:var(--cl);border-color:var(--cl);color:#000}
.lp-showcase-row{display:flex;align-items:center;gap:56px}
.lp-showcase-text{flex:1}
.lp-showcase-icon{width:52px;height:52px;border:1px solid var(--bdr);border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;background:var(--bg2)}
.lp-showcase-h3{font-size:clamp(20px,2.5vw,30px);font-weight:800;margin-bottom:11px;letter-spacing:-1px;color:var(--txt)}
.lp-showcase-desc{color:var(--txt2);font-size:15px;line-height:1.75;margin-bottom:22px}
.lp-showcase-phone{flex:0 0 auto;width:min(220px,32vw);animation:lp-float 5s ease-in-out infinite}
.lp-showcase-phone .lp-frame{border-radius:18px}

/* Gallery */
.lp-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1px;border:1px solid var(--bdr);border-radius:12px;overflow:hidden;background:var(--bdr);margin-top:36px}
.lp-gitem{aspect-ratio:9/19;position:relative;overflow:hidden;cursor:default}
.lp-gitem:hover{opacity:.8;transition:opacity .2s}
.lp-gitem img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.lp-gcap{position:absolute;bottom:0;left:0;right:0;padding:20px 8px 8px;background:linear-gradient(to top,rgba(0,0,0,.8),transparent);font-size:10.5px;font-weight:600;color:#ddd}

/* Premium */
.lp-premium-row{display:flex;gap:56px;align-items:flex-start}
.lp-premium-list{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:1px;border:1px solid var(--bdr);border-radius:10px;overflow:hidden;background:var(--bdr);margin:22px 0 26px}
.lp-premium-list li{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--txt2);font-weight:500;padding:11px 14px;background:var(--surf)}
.lp-pcard{flex:0 0 260px;background:var(--surf);border:1px solid var(--bdr);border-radius:12px;padding:28px;text-align:center}
.lp-pcard-badge{width:56px;height:56px;border:1px solid rgba(212,168,83,.25);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;background:rgba(212,168,83,.08)}
.lp-pcard-name{font-size:20px;font-weight:800;color:var(--gd);margin-bottom:6px}
.lp-pcard-price{margin-top:18px;padding-top:16px;border-top:1px solid var(--bdr)}
.lp-pcard-amt{font-size:30px;font-weight:900;color:var(--txt);letter-spacing:-1.5px}

/* CTA strip */
.lp-cta-strip{text-align:center;background:var(--cl);padding:64px 6%}
.lp-cta-strip-h{font-size:clamp(22px,3vw,38px);font-weight:900;color:#000;letter-spacing:-1.2px;margin-bottom:10px}
.lp-cta-strip-sub{font-size:15px;color:rgba(0,0,0,.6);margin-bottom:28px;line-height:1.6}
.lp-cta-strip-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.lp-cta-strip-btn{display:inline-flex;align-items:center;gap:8px;background:#000;color:#fff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;border:none;white-space:nowrap}
.lp-cta-strip-btn:hover{opacity:.85}

/* Download */
.lp-dl-btns{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:28px}
.lp-dl-btn{display:inline-flex;align-items:center;gap:12px;background:var(--surf);border:1px solid var(--bdr);color:var(--txt);text-decoration:none;padding:14px 20px;border-radius:10px;cursor:pointer;transition:border-color .15s}
.lp-dl-btn:hover{border-color:var(--txt3)}
.lp-dl-store{font-size:9.5px;color:var(--txt3);text-transform:uppercase;letter-spacing:.8px}
.lp-dl-name{font-size:15px;font-weight:700;display:block;color:var(--txt);margin-top:2px}
.lp-qr{margin-top:36px;display:flex;align-items:center;justify-content:center;gap:16px;color:var(--txt3);font-size:13px;line-height:1.5}
.lp-qr-box{width:74px;height:74px;background:#fff;border-radius:8px;padding:6px;position:relative;overflow:hidden;flex-shrink:0}
.lp-qr-box::after{content:'';position:absolute;left:0;right:0;height:2px;background:var(--cl);animation:lp-scan 2s linear infinite}
.lp-qr-box img{width:100%;height:100%;object-fit:contain}

/* About blocks */
.lp-ablock-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;border:1px solid var(--bdr);border-radius:12px;overflow:hidden;background:var(--bdr);margin-top:40px}
.lp-ablock{background:var(--surf);padding:30px}
.lp-ablock-icon{width:44px;height:44px;border:1px solid var(--bdr);border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:13px;background:var(--bg)}
.lp-ablock-title{font-size:15px;font-weight:700;margin-bottom:9px;color:var(--cl)}
.lp-ablock-text{font-size:13.5px;color:var(--txt2);line-height:1.72}

/* Values */
.lp-values{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:40px}
.lp-value{background:var(--surf);border:1px solid var(--bdr);border-radius:14px;padding:22px}
.lp-value-title{font-size:14px;font-weight:700;margin-bottom:6px;color:var(--txt)}
.lp-value-desc{font-size:13px;color:var(--txt2);line-height:1.6}

/* Careers */
.lp-dept-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.lp-dept-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.lp-dept-title{font-size:16px;font-weight:700;color:var(--txt);flex:1}
.lp-dept-badge{padding:4px 10px;border-radius:100px;font-size:12px;font-weight:600}
.lp-pos-card{display:flex;align-items:center;border:1px solid var(--bdr);border-radius:12px;padding:16px 18px;gap:12px;background:var(--surf);transition:border-color .15s;cursor:pointer;text-decoration:none}
.lp-pos-card:hover{border-color:var(--txt3)}
.lp-pos-title{font-size:14px;font-weight:600;color:var(--txt);margin-bottom:4px}
.lp-pos-meta{font-size:12px;color:var(--txt3);display:flex;gap:12px;flex-wrap:wrap}
.lp-apply-btn{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--cl);border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;color:var(--cl);flex-shrink:0;white-space:nowrap}
.lp-benefits{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:36px}
.lp-benefit{background:var(--surf);border:1px solid var(--bdr);border-radius:14px;padding:22px}
.lp-benefit-icon{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.lp-benefit-title{font-size:14px;font-weight:700;margin-bottom:5px;color:var(--txt)}
.lp-benefit-desc{font-size:12.5px;color:var(--txt2);line-height:1.6}

/* Contact */
.lp-contact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:40px}
.lp-contact-card{background:var(--surf);border:1px solid var(--bdr);border-radius:16px;padding:28px}
.lp-contact-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
.lp-contact-title{font-size:16px;font-weight:700;margin-bottom:7px;color:var(--txt)}
.lp-contact-desc{font-size:13.5px;color:var(--txt2);line-height:1.65;margin-bottom:16px}

/* Legal pages */
.lp-legal-body{max-width:760px;margin:0 auto}
.lp-legal-body h2{font-size:18px;font-weight:700;color:var(--txt);margin:36px 0 10px}
.lp-legal-body p{font-size:14px;color:var(--txt2);line-height:1.78;margin-bottom:12px}
.lp-legal-body ul{padding-left:20px;display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.lp-legal-body ul li{font-size:14px;color:var(--txt2);line-height:1.7}
.lp-legal-body a{color:var(--cl);text-decoration:none}
.lp-legal-chip{display:inline-flex;align-items:center;gap:6px;background:var(--bg2);border:1px solid var(--bdr);border-radius:6px;padding:5px 11px;font-size:12px;color:var(--txt3);font-weight:600;margin:0 4px 4px 0}

/* Age rating */
.lp-age-badge{display:inline-flex;align-items:center;justify-content:center;background:var(--bg2);border:1px solid var(--bdr);border-radius:5px;padding:2px 7px;font-size:11px;font-weight:800;color:var(--txt3)}

/* Footer */
.lp-footer{background:var(--bg);border-top:1px solid var(--bdr);padding:52px 6% 0}
.lp-footer-main{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;padding-bottom:40px;border-bottom:1px solid var(--bdr)}
.lp-footer-logo-row{display:flex;align-items:center;gap:9px;margin-bottom:10px}
.lp-footer-logo{width:28px;height:28px;border-radius:7px;object-fit:cover}
.lp-footer-logo-name{font-size:16px;font-weight:800;color:var(--txt)}
.lp-footer-logo-name em{color:var(--cl);font-style:normal}
.lp-footer-tag{color:var(--txt3);font-size:13px;line-height:1.65;margin-bottom:14px;max-width:240px}
.lp-socials{display:flex;gap:6px}
.lp-social{width:30px;height:30px;border-radius:6px;background:var(--bg2);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--txt3);cursor:pointer}
.lp-social:hover{color:var(--txt);border-color:var(--txt3)}
.lp-fcol-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--txt3);margin-bottom:14px}
.lp-flinks{list-style:none;display:flex;flex-direction:column;gap:9px}
.lp-flinks a{color:var(--txt2);text-decoration:none;font-size:13px;transition:color .15s}
.lp-flinks a:hover{color:var(--txt)}
.lp-footer-bottom{max-width:1100px;margin:0 auto;padding:16px 0 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.lp-footer-copy{font-size:12px;color:var(--txt3)}
.lp-footer-reg{font-size:11px;color:var(--txt3);margin-top:2px;opacity:.7}
.lp-footer-legal{display:flex;gap:14px}
.lp-footer-legal a{font-size:12px;color:var(--txt3);text-decoration:none;transition:color .15s}
.lp-footer-legal a:hover{color:var(--txt2)}
.lp-footer-age-note{font-size:11px;color:var(--txt3);display:flex;align-items:center;gap:6px}

/* Responsive */
@media(max-width:900px){
  .lp-nav-links{display:none}.lp-hamburger{display:flex}
  .lp-hero-inner{flex-direction:column;gap:36px}
  .lp-phone{width:min(220px,56vw)}.lp-sub{max-width:100%}
  .lp-showcase-row{flex-direction:column-reverse}
  .lp-showcase-phone{width:min(200px,50vw)}
  .lp-trust{grid-template-columns:1fr 1fr}
  .lp-premium-row{flex-direction:column}
  .lp-pcard{flex:0 0 auto;width:100%}
  .lp-premium-list{grid-template-columns:1fr}
  .lp-ablock-grid{grid-template-columns:1fr}
  .lp-footer-main{grid-template-columns:1fr 1fr}
}
@media(max-width:600px){
  .lp-footer-main{grid-template-columns:1fr;gap:22px}
  .lp-footer-bottom{flex-direction:column;align-items:flex-start}
  .lp-trust{grid-template-columns:1fr}
  .lp-gallery{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}
  .lp-hero{padding:56px 6% 48px;min-height:auto}
  .lp-sec{padding:56px 6%}
  .lp-page-hero{padding:56px 6% 44px}
}
`;

export function useLandingSetup(scrollRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("lp-in"); }),
      { threshold: 0.05, root: el },
    );
    const t = setTimeout(() => {
      const elRect = el.getBoundingClientRect();
      el.querySelectorAll(".lp-r").forEach((n) => {
        obs.observe(n);
        const r = (n as HTMLElement).getBoundingClientRect();
        if (r.top < elRect.bottom && r.bottom > elRect.top) {
          (n as HTMLElement).classList.add("lp-in");
        }
      });
    }, 30);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [scrollRef]);
}

export function LandingNav({ active }: { active?: string }) {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <nav className="lp-nav">
        <a href="/landing" className="lp-nav-brand">
          <img src="/logo.png" alt="AfuChat" className="lp-nav-logo" />
          <span className="lp-nav-name">Afu<em>Chat</em></span>
        </a>
        <ul className="lp-nav-links">
          <li><a href="/features" className={active === "features" ? "act" : ""}>Features</a></li>
          <li><a href="/download" className={active === "download" ? "act" : ""}>Download</a></li>
          <li><a href="/about" className={active === "about" ? "act" : ""}>About</a></li>
          <li><a href="/careers" className={active === "careers" ? "act" : ""}>Careers</a></li>
          <li>
            <a
              href="https://play.google.com/store/apps/details?id=com.afuchat.app"
              target="_blank"
              rel="noopener noreferrer"
              className="lp-nav-cta"
            >
              Get the App
            </a>
          </li>
        </ul>
        <button className="lp-hamburger" onClick={() => setMenu(!menu)} aria-label="Menu">
          {menu ? <XIcon size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <div className={`lp-mob ${menu ? "open" : ""}`}>
        <a href="/features" onClick={() => setMenu(false)}>Features</a>
        <a href="/download" onClick={() => setMenu(false)}>Download</a>
        <a href="/about" onClick={() => setMenu(false)}>About</a>
        <a href="/careers" onClick={() => setMenu(false)}>Careers</a>
        <a href="/contact" onClick={() => setMenu(false)}>Contact</a>
        <a
          href="https://play.google.com/store/apps/details?id=com.afuchat.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get the App →
        </a>
      </div>
    </>
  );
}

const YEAR = new Date().getFullYear();

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-main">
        <div>
          <div className="lp-footer-logo-row">
            <img src="/logo.png" alt="AfuChat" className="lp-footer-logo" />
            <span className="lp-footer-logo-name">Afu<em>Chat</em></span>
          </div>
          <p className="lp-footer-tag">The super app built for Africa and the world — messaging, AI, payments, and community in one place.</p>
          <div className="lp-socials">
            <a href="https://t.me/afuchat" target="_blank" rel="noopener noreferrer" className="lp-social" aria-label="Telegram">{TG_SVG}</a>
            <a href="https://whatsapp.com/channel/0029Vb7Rbpz0Vyc9y3S8H422" target="_blank" rel="noopener noreferrer" className="lp-social" aria-label="WhatsApp">{WA_SVG}</a>
            <a href="https://twitter.com/afuchat" target="_blank" rel="noopener noreferrer" className="lp-social" aria-label="X / Twitter"><Twitter size={14} strokeWidth={1.8} /></a>
            <a href="https://instagram.com/afuchat" target="_blank" rel="noopener noreferrer" className="lp-social" aria-label="Instagram"><Instagram size={14} strokeWidth={1.8} /></a>
            <a href="https://youtube.com/@afuchat" target="_blank" rel="noopener noreferrer" className="lp-social" aria-label="YouTube"><Youtube size={14} strokeWidth={1.8} /></a>
          </div>
        </div>
        <div>
          <h4 className="lp-fcol-title">Product</h4>
          <ul className="lp-flinks">
            <li><a href="/features">Features</a></li>
            <li><a href="/download">Download</a></li>
            <li><a href="/login">Web App</a></li>
            <li><a href="/login">Premium</a></li>
          </ul>
        </div>
        <div>
          <h4 className="lp-fcol-title">Company</h4>
          <ul className="lp-flinks">
            <li><a href="/about">About Us</a></li>
            <li><a href="/careers">Careers</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 className="lp-fcol-title">Legal</h4>
          <ul className="lp-flinks">
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div className="lp-footer-bottom">
        <div>
          <div className="lp-footer-copy">© {YEAR} AfuChat Technologies Limited. All rights reserved.</div>
          <div className="lp-footer-reg">Registered in Uganda · Entebbe, Central Region</div>
        </div>
        <div className="lp-footer-legal">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/contact">Contact</a>
        </div>
        <div className="lp-footer-age-note">
          <span className="lp-age-badge">13+</span>
          Rated for ages 13 and up · Contains in-app purchases
        </div>
      </div>
    </footer>
  );
}
