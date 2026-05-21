import "react-native-gesture-handler";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Text, TextInput } from "react-native";
import { Slot, router, usePathname } from "expo-router";
import * as Font from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  MessageCircle, Compass, Search, Bot, Wallet, Grid3X3,
  User, Settings, Edit3, Users, Bookmark, Star, LogOut,
  Copy, ExternalLink, MoreHorizontal, FileText, Film, Hash,
  Bell, ShoppingBag, UserCheck, Plus, ChevronLeft,
} from "lucide-react";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useTheme } from "@/hooks/useTheme";
import { AppAccentProvider } from "@/context/AppAccentContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AdvancedFeaturesProvider } from "@/context/AdvancedFeaturesContext";
import { ChatPreferencesProvider } from "@/context/ChatPreferencesContext";
import { DataModeProvider } from "@/context/DataModeContext";
import { TabSwipeProvider } from "@/context/TabSwipeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/ui/ToastContainer";
import AlertModal from "@/components/ui/AlertModal";
import { initConnectivityToasts } from "@/lib/toast";
import { supabase } from "@/lib/supabase";
import { getLocalConversations } from "@/lib/storage/localConversations";

(Text as any).defaultProps = { ...((Text as any).defaultProps ?? {}), allowFontScaling: false };
(TextInput as any).defaultProps = { ...((TextInput as any).defaultProps ?? {}), allowFontScaling: false };

/* ─────────────────────────────────────────────────────────
   GLOBAL CSS — desktop shell
───────────────────────────────────────────────────────── */
const DT_CSS = `
*,*::before,*::after{box-sizing:border-box}

/* ── Theme tokens ── */
.dt-lt{
  --sb:#FFFFFF;--bg:#F5F0E8;--bdr:#DDD7C9;
  --txt:#1A1208;--txt2:#5A5040;--txt3:#8C7F6A;
  --hov:rgba(0,0,0,0.046);--act:rgba(0,188,212,0.10);
  --inp:#EDE8DC;--cl:#00BCD4;
}
.dt-dk{
  --sb:#161616;--bg:#0F0F0F;--bdr:#2A2A2A;
  --txt:#F1F1F1;--txt2:#AAAAAA;--txt3:#666666;
  --hov:rgba(255,255,255,0.06);--act:rgba(0,188,212,0.14);
  --inp:#1E1E1E;--cl:#00BCD4;
}

/* ── Shell container ── */
.dt-shell{
  display:flex;height:100vh;overflow:hidden;
  font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
  background:var(--bg);
}

/* ════════════════════════════════════════════
   SIDEBAR  (240 px, fixed left)
════════════════════════════════════════════ */
.dt-side{
  position:fixed;top:0;left:0;bottom:0;width:240px;z-index:50;
  display:flex;flex-direction:column;
  background:var(--sb);border-right:1px solid var(--bdr);
  overflow:hidden;
}

/* Brand row — 56 px to align with top bar */
.dt-brand{
  display:flex;align-items:center;gap:10px;
  padding:0 14px;height:56px;
  border-bottom:1px solid var(--bdr);flex-shrink:0;
}
.dt-brand-img{width:28px;height:28px;border-radius:7px;object-fit:cover;flex-shrink:0}
.dt-brand-name{font-size:16px;font-weight:800;color:var(--txt);letter-spacing:-.4px;flex:1;line-height:1}
.dt-brand-name em{color:var(--cl);font-style:normal}

/* Sidebar search pill */
.dt-sb-srch{padding:10px 10px 6px;flex-shrink:0}
.dt-sb-srch-inner{position:relative;display:flex;align-items:center}
.dt-sb-srch-ico{position:absolute;left:9px;color:var(--txt3);pointer-events:none;flex-shrink:0}
.dt-sb-srch-inp{
  width:100%;padding:7px 10px 7px 30px;border-radius:8px;
  border:1.5px solid var(--bdr);background:var(--inp);color:var(--txt);
  font-size:13px;font-family:inherit;outline:none;cursor:pointer;
  transition:border-color .13s;
}
.dt-sb-srch-inp::placeholder{color:var(--txt3)}
.dt-sb-srch-inp:hover,.dt-sb-srch-inp:focus{border-color:var(--cl)}

/* Nav area */
.dt-nav{flex:1;overflow-y:auto;padding:4px 0 4px}
.dt-nav::-webkit-scrollbar{width:3px}
.dt-nav::-webkit-scrollbar-thumb{background:var(--bdr);border-radius:2px}
.dt-ns{margin-bottom:2px}
.dt-ns-lbl{
  font-size:10px;font-weight:700;letter-spacing:.09em;
  text-transform:uppercase;color:var(--txt3);
  padding:10px 18px 4px;display:block;
}
.dt-ni{
  display:flex;align-items:center;gap:12px;
  padding:8px 14px;border-radius:9px;margin:1px 6px;
  cursor:pointer;text-decoration:none;color:var(--txt2);
  font-size:13.5px;font-weight:500;
  transition:background .12s,color .12s;user-select:none;
}
.dt-ni:hover{background:var(--hov);color:var(--txt)}
.dt-ni.act{background:var(--act);color:var(--cl);font-weight:700}
.dt-ni-badge{
  margin-left:auto;background:var(--cl);color:#000;
  font-size:9.5px;font-weight:800;min-width:17px;height:17px;
  border-radius:9px;display:flex;align-items:center;
  justify-content:center;padding:0 5px;line-height:1;
}
.dt-ns-div{height:1px;background:var(--bdr);margin:6px 12px}

/* User footer */
.dt-ucard{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;border-top:1px solid var(--bdr);
  flex-shrink:0;cursor:pointer;transition:background .12s;
}
.dt-ucard:hover{background:var(--hov)}
.dt-uav{width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--bdr)}
.dt-uav-ph{
  width:34px;height:34px;border-radius:50%;
  background:var(--cl);color:#000;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:800;flex-shrink:0;
}
.dt-ucard-info{flex:1;min-width:0}
.dt-ucard-name{font-size:13px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dt-ucard-handle{font-size:11px;color:var(--txt3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Generic icon button */
.dt-ibtn{
  background:none;border:none;cursor:pointer;
  padding:6px;border-radius:7px;color:var(--txt3);
  display:flex;align-items:center;justify-content:center;
  transition:background .13s,color .13s;flex-shrink:0;
}
.dt-ibtn:hover{background:var(--hov);color:var(--txt)}

/* ════════════════════════════════════════════
   TOP BAR  (56 px, fixed, right of sidebar)
════════════════════════════════════════════ */
.dt-topbar{
  position:fixed;top:0;left:240px;right:0;height:56px;z-index:40;
  display:flex;align-items:center;padding:0 16px;gap:12px;
  background:var(--sb);border-bottom:1px solid var(--bdr);
}
.dt-tb-title{
  font-size:16px;font-weight:700;color:var(--txt);
  white-space:nowrap;flex-shrink:0;
}
.dt-tb-srch{
  flex:1;max-width:460px;min-width:120px;
  position:relative;display:flex;align-items:center;
}
.dt-tb-srch-ico{position:absolute;left:10px;color:var(--txt3);pointer-events:none}
.dt-tb-srch-inp{
  width:100%;padding:8px 12px 8px 34px;
  border-radius:20px;border:1.5px solid var(--bdr);
  background:var(--inp);color:var(--txt);
  font-size:13.5px;font-family:inherit;outline:none;cursor:pointer;
  transition:border-color .13s,background .13s;
}
.dt-tb-srch-inp::placeholder{color:var(--txt3)}
.dt-tb-srch-inp:hover,.dt-tb-srch-inp:focus{border-color:var(--cl);background:var(--sb)}
.dt-tb-actions{display:flex;align-items:center;gap:4px;margin-left:auto;flex-shrink:0}
.dt-tb-notif{position:relative}
.dt-tb-notif-badge{
  position:absolute;top:-2px;right:-2px;
  background:#FF3B30;color:#fff;
  font-size:9px;font-weight:800;min-width:15px;height:15px;
  border-radius:8px;display:flex;align-items:center;
  justify-content:center;padding:0 3px;line-height:1;pointer-events:none;
}
.dt-tb-avbtn{
  width:32px;height:32px;border-radius:50%;
  border:2px solid var(--bdr);cursor:pointer;
  overflow:hidden;flex-shrink:0;
  transition:border-color .13s;
  background:none;padding:0;
  display:flex;align-items:center;justify-content:center;
}
.dt-tb-avbtn:hover{border-color:var(--cl)}
.dt-tb-avbtn img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.dt-tb-avbtn-ph{
  width:100%;height:100%;border-radius:50%;
  background:var(--cl);color:#000;
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:800;
}
.dt-tb-divider{width:1px;height:24px;background:var(--bdr);margin:0 4px;flex-shrink:0}
.dt-tb-back{
  width:32px;height:32px;display:flex;align-items:center;justify-content:center;
  border-radius:8px;border:none;background:none;cursor:pointer;padding:0;
  color:var(--txt2);transition:background .1s,color .1s;flex-shrink:0;
}
.dt-tb-back:hover{background:var(--hov);color:var(--txt)}

/* ════════════════════════════════════════════
   BODY  (offset 240 px left + 56 px top)
════════════════════════════════════════════ */
.dt-body{
  flex:1;
  padding-left:240px;padding-top:56px;
  display:flex;flex-direction:column;
  min-height:100vh;
  background:var(--bg);
  overflow-y:auto;overflow-x:hidden;
  min-width:0;
}
.dt-body>div{flex:1;min-height:0;display:flex;flex-direction:column}

/* ─── Centred page wrapper (max 840 px) ─────────────────────────────────── */
/* Applied to all non-wide routes so content never stretches across the full  */
/* viewport on large monitors.                                                 */
.dt-page-wrap{
  align-self:center;
  width:100%;max-width:840px;
}
@media(max-width:820px){
  .dt-page-wrap{max-width:100%}
}

.dt-loading{display:flex;flex:1;align-items:center;justify-content:center;background:var(--bg);min-height:100vh}
.dt-spin{
  width:32px;height:32px;border-radius:50%;
  border:3px solid var(--bdr);border-top-color:var(--cl);
  animation:dt-rot .8s linear infinite;
}
@keyframes dt-rot{to{transform:rotate(360deg)}}

/* ════════════════════════════════════════════
   DROPDOWNS
════════════════════════════════════════════ */
.dt-drop{
  position:fixed;z-index:9500;
  background:var(--sb);border:1.5px solid var(--bdr);
  border-radius:12px;padding:6px;min-width:210px;
  box-shadow:0 12px 36px rgba(0,0,0,0.16),0 3px 10px rgba(0,0,0,0.08);
}
.dt-dk .dt-drop{box-shadow:0 12px 40px rgba(0,0,0,0.60),0 4px 14px rgba(0,0,0,0.35)}
.dt-drop-item{
  display:flex;align-items:center;gap:10px;
  padding:8px 10px;border-radius:8px;cursor:pointer;
  font-size:13px;font-weight:500;color:var(--txt2);
  transition:background .1s,color .1s;
  background:none;border:none;width:100%;text-align:left;
  font-family:inherit;line-height:1.3;text-decoration:none;
}
.dt-drop-item:hover{background:var(--hov);color:var(--txt)}
.dt-danger{color:#EF4444!important}
.dt-danger:hover{background:rgba(239,68,68,0.10)!important;color:#EF4444!important}
.dt-drop-lbl{
  display:flex;align-items:center;gap:10px;
  padding:5px 10px 6px;font-size:10.5px;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;color:var(--txt3);
  cursor:default;user-select:none;
}
.dt-drop-hr{height:1px;background:var(--bdr);margin:4px 2px;border:none}

/* ════════════════════════════════════════════
   MOBILE BOTTOM NAV  (pill, < 820 px only)
════════════════════════════════════════════ */
@media(min-width:821px){
  .dt-side{display:flex}
  .dt-bnav{display:none!important}
}
@media(max-width:820px){
  .dt-side{display:none}
  .dt-topbar{left:0}
  .dt-body{padding-left:0}
  .dt-bnav{display:flex}
}
.dt-bnav{
  display:none;
  position:fixed;
  bottom:calc(14px + env(safe-area-inset-bottom,0px));
  left:50%;transform:translateX(-50%);
  width:max-content;max-width:calc(100vw - 24px);
  z-index:200;border-radius:999px;
  background:var(--sb);border:1px solid var(--bdr);
  backdrop-filter:blur(40px) saturate(2);
  -webkit-backdrop-filter:blur(40px) saturate(2);
}
.dt-dk .dt-bnav{box-shadow:0 12px 40px rgba(0,0,0,0.55),0 4px 14px rgba(0,0,0,0.30)}
.dt-lt .dt-bnav{box-shadow:0 8px 32px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.06)}
.dt-bnav-inner{display:flex;align-items:center;padding:6px 8px;gap:0}
.dt-bnav-item{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;width:62px;padding:2px 0;
  text-decoration:none;color:rgba(110,108,118,1);
  font-size:10px;font-weight:700;letter-spacing:.08px;
  transition:color .16s;cursor:pointer;
  background:none;border:none;font-family:inherit;
  border-radius:32px;-webkit-tap-highlight-color:transparent;
  user-select:none;flex-shrink:0;
}
.dt-dk .dt-bnav-item{color:rgba(95,93,105,1)}
.dt-bnav-item:active{opacity:.68}
.dt-bnav-item.act{color:#00BCD4;font-weight:700}
.dt-bnav-icon{
  position:relative;width:54px;height:36px;border-radius:18px;
  display:flex;align-items:center;justify-content:center;
}
.dt-bnav-badge{
  position:absolute;top:-3px;right:-1px;
  background:#00BCD4;color:#000;
  font-size:9px;font-weight:800;min-width:16px;height:16px;
  border-radius:8px;display:flex;align-items:center;
  justify-content:center;padding:0 4px;line-height:1;pointer-events:none;
}
.dt-bnav-label{font-size:10.5px;font-weight:inherit;letter-spacing:.04px;line-height:1}
`;

/* ─────────────────────────────────────────────────────────
   NAVIGATION STRUCTURE
───────────────────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    key: "workspace",
    label: null,
    items: [
      {
        label: "Chats",
        Icon: MessageCircle,
        route: "/(tabs)" as const,
        matchPaths: ["/", "/(tabs)", "/index", "/chat"],
        badge: true,
      },
      {
        label: "Discover",
        Icon: Compass,
        route: "/(tabs)/discover" as const,
        matchPaths: ["/discover", "/(tabs)/discover"],
        badge: false,
      },
      {
        label: "Search",
        Icon: Search,
        route: "/(tabs)/search" as const,
        matchPaths: ["/search", "/(tabs)/search"],
        badge: false,
      },
    ],
  },
  {
    key: "features",
    label: "Features",
    items: [
      {
        label: "AfuAI",
        Icon: Bot,
        route: "/ai" as const,
        matchPaths: ["/ai"],
        badge: false,
      },
      {
        label: "Wallet",
        Icon: Wallet,
        route: "/wallet" as const,
        matchPaths: ["/wallet"],
        badge: false,
      },
      {
        label: "Apps",
        Icon: Grid3X3,
        route: "/(tabs)/apps" as const,
        matchPaths: ["/apps", "/(tabs)/apps"],
        badge: false,
      },
      {
        label: "Marketplace",
        Icon: ShoppingBag,
        route: "/shop" as const,
        matchPaths: ["/shop", "/store"],
        badge: false,
      },
    ],
  },
  {
    key: "social",
    label: "Social",
    items: [
      {
        label: "Communities",
        Icon: Users,
        route: "/(tabs)/communities" as const,
        matchPaths: ["/communities", "/(tabs)/communities"],
        badge: false,
      },
      {
        label: "Contacts",
        Icon: UserCheck,
        route: "/(tabs)/contacts" as const,
        matchPaths: ["/contacts", "/(tabs)/contacts"],
        badge: false,
      },
      {
        label: "Saved",
        Icon: Bookmark,
        route: "/saved-posts" as const,
        matchPaths: ["/saved-posts", "/saved"],
        badge: false,
      },
    ],
  },
  {
    key: "you",
    label: "You",
    items: [
      {
        label: "Profile",
        Icon: User,
        route: "/(tabs)/me" as const,
        matchPaths: ["/me", "/(tabs)/me"],
        badge: false,
      },
      {
        label: "Achievements",
        Icon: Star,
        route: "/achievements" as const,
        matchPaths: ["/achievements"],
        badge: false,
      },
      {
        label: "Settings",
        Icon: Settings,
        route: "/settings" as const,
        matchPaths: ["/settings"],
        badge: false,
      },
    ],
  },
];

const BNAV_ITEMS = [
  {
    label: "Chats",
    Icon: MessageCircle,
    route: "/(tabs)" as const,
    matchPaths: ["/", "/(tabs)", "/index", "/chat"],
    useAfuSymbol: true,
  },
  {
    label: "Discover",
    Icon: Compass,
    route: "/(tabs)/discover" as const,
    matchPaths: ["/discover", "/(tabs)/discover"],
    useAfuSymbol: false,
  },
  {
    label: "Apps",
    Icon: Grid3X3,
    route: "/(tabs)/apps" as const,
    matchPaths: ["/apps", "/(tabs)/apps"],
    useAfuSymbol: false,
  },
  {
    label: "Profile",
    Icon: User,
    route: "/(tabs)/me" as const,
    matchPaths: ["/me", "/(tabs)/me"],
    useAfuSymbol: false,
  },
] as const;

/* ─────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────── */
function isActiveRoute(pathname: string, matchPaths: string[]): boolean {
  return matchPaths.some((p) => {
    if (p === "/" || p === "/(tabs)" || p === "/index") {
      return (
        pathname === "/" ||
        pathname === "/(tabs)" ||
        pathname === "/(tabs)/index" ||
        pathname === "/index" ||
        pathname.startsWith("/chat/")
      );
    }
    return pathname === p || pathname.startsWith(p + "/");
  });
}

/**
 * Routes that should span the full body width on desktop.
 * Discover has its own DesktopFeedLayout; the me/profile tab uses a RightRail.
 * Everything else gets a centred max-width column via .dt-page-wrap.
 */
function isWideRoute(pathname: string): boolean {
  return (
    pathname.includes("/discover") ||
    pathname.includes("/(tabs)/me") ||
    pathname.startsWith("/me")
  );
}

/**
 * Primary/top-level routes accessible directly from the sidebar.
 * These don't need a back button in the topbar.
 */
const PRIMARY_ROUTES = new Set([
  "/(tabs)", "/(tabs)/index", "/(tabs)/discover",
  "/(tabs)/search", "/(tabs)/me", "/(tabs)/ai",
  "/ai", "/wallet", "/wallet/index",
  "/games", "/games/index",
  "/apps", "/apps/index",
  "/notifications", "/notifications/index",
  "/settings", "/settings/index",
  "/support", "/support/index",
  "/premium", "/achievements",
  "/referral", "/freelance",
  "/communities", "/contacts",
  "/saved", "/company", "/shop",
]);

function isPrimaryRoute(pathname: string): boolean {
  return PRIMARY_ROUTES.has(pathname);
}

/** Routes rendered WITHOUT the desktop shell (fullscreen or marketing) */
function isNoShell(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/index" ||
    pathname.startsWith("/(auth)") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/download") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/features") ||
    pathname.startsWith("/careers") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/landing") ||
    pathname.startsWith("/call/") ||
    pathname.startsWith("/shorts") ||
    pathname.startsWith("/stories/view") ||
    pathname.startsWith("/stories/camera") ||
    pathname.startsWith("/video/") ||
    pathname === "/+not-found"
  );
}

function getPageTitle(pathname: string): string {
  if (
    pathname === "/(tabs)" ||
    pathname === "/(tabs)/index" ||
    pathname.startsWith("/chat/")
  ) return "Chats";
  if (pathname.includes("/discover")) return "Discover";
  if (pathname.includes("/search")) return "Search";
  if (pathname.startsWith("/ai")) return "AfuAI";

  // ── Settings sub-pages (specific before generic) ──────────────────────────
  if (pathname.startsWith("/settings/privacy-account"))     return "Account Privacy";
  if (pathname.startsWith("/settings/privacy-visibility"))  return "Visibility";
  if (pathname.startsWith("/settings/privacy-messages"))    return "Messages Privacy";
  if (pathname.startsWith("/settings/privacy-interactions"))return "Reactions & Tags";
  if (pathname.startsWith("/settings/privacy-restricted"))  return "Restricted Accounts";
  if (pathname.startsWith("/settings/privacy-data"))        return "Data & Permissions";
  if (pathname.startsWith("/settings/privacy-download"))    return "Download My Data";
  if (pathname.startsWith("/settings/privacy"))             return "Privacy";
  if (pathname.startsWith("/settings/notifications"))       return "Notifications";
  if (pathname.startsWith("/settings/security"))            return "Security";
  if (pathname.startsWith("/settings/two-factor"))          return "Two-Factor Auth";
  if (pathname.startsWith("/settings/oauth-providers"))     return "Connected Accounts";
  if (pathname.startsWith("/settings/blocked"))             return "Blocked Users";
  if (pathname.startsWith("/settings/chat"))                return "Chat Settings";
  if (pathname.startsWith("/settings/offline-videos"))      return "Offline Videos";
  if (pathname.startsWith("/settings/storage"))             return "Storage";
  if (pathname.startsWith("/settings"))                     return "Settings";

  // ── Wallet sub-pages ───────────────────────────────────────────────────────
  if (pathname.startsWith("/wallet/topup"))                 return "Top Up";
  if (pathname.startsWith("/wallet/scan"))                  return "Scan QR";
  if (pathname.startsWith("/wallet/requests"))              return "Payment Requests";
  if (pathname.startsWith("/wallet/gift-vault"))            return "Gift Vault";
  if (pathname.startsWith("/wallet"))                       return "Wallet";

  // ── Games ─────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/games/snake"))         return "Snake";
  if (pathname.startsWith("/games/tetris"))        return "Tetris";
  if (pathname.startsWith("/games/game-2048"))     return "2048";
  if (pathname.startsWith("/games/brick-breaker")) return "Brick Breaker";
  if (pathname.startsWith("/games/flappy"))        return "Flappy Bird";
  if (pathname.startsWith("/games/memory-match"))  return "Memory Match";
  if (pathname.startsWith("/games/minesweeper"))   return "Minesweeper";
  if (pathname.startsWith("/games/space-shooter")) return "Space Shooter";
  if (pathname.startsWith("/games"))               return "Games";

  // ── Support sub-pages ─────────────────────────────────────────────────────
  if (pathname.startsWith("/support/ticket"))      return "Support Ticket";
  if (pathname.startsWith("/support"))             return "Help & Support";

  // ── Other routes ──────────────────────────────────────────────────────────
  if (pathname.includes("/apps"))            return "Apps";
  if (pathname.startsWith("/shop") || pathname.startsWith("/store")) return "Marketplace";
  if (pathname.includes("/communities"))     return "Communities";
  if (pathname.includes("/contacts"))        return "Contacts";
  if (pathname.startsWith("/saved"))         return "Saved";
  if (pathname.includes("/me"))              return "Profile";
  if (pathname.startsWith("/achievements"))  return "Achievements";
  if (pathname.startsWith("/notifications")) return "Notifications";
  if (pathname.startsWith("/premium"))       return "Premium";
  if (pathname.startsWith("/referral"))      return "Refer a Friend";
  if (pathname.startsWith("/freelance"))     return "Freelance";
  if (pathname.startsWith("/gifts"))         return "Gifts";
  if (pathname.startsWith("/company"))       return "Pages";
  if (pathname.startsWith("/profile"))       return "Profile";
  if (pathname.startsWith("/group"))         return "Group";
  if (pathname.startsWith("/channel"))       return "Channel";
  if (pathname.startsWith("/followers"))     return "Followers";
  if (pathname.startsWith("/following"))     return "Following";
  if (pathname.startsWith("/post/"))         return "Post";
  if (pathname.startsWith("/create-post"))   return "New Post";
  if (pathname.startsWith("/create-story"))  return "New Story";
  if (pathname.startsWith("/profile/edit"))  return "Edit Profile";
  if (pathname.startsWith("/leaderboard"))   return "Leaderboard";
  return "AfuChat";
}

/* ─────────────────────────────────────────────────────────
   ROOT LAYOUT — wraps all providers
───────────────────────────────────────────────────────── */
export default function RootWebLayout() {
  const [, fontError] = Font.useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initConnectivityToasts();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AppAccentProvider>
            <DataModeProvider>
              <AuthProvider>
                <LanguageProvider>
                  <AdvancedFeaturesProvider>
                    <ChatPreferencesProvider>
                      <TabSwipeProvider>
                        <style dangerouslySetInnerHTML={{ __html: DT_CSS }} />
                        <DesktopShell />
                        <ToastContainer />
                        <AlertModal />
                      </TabSwipeProvider>
                    </ChatPreferencesProvider>
                  </AdvancedFeaturesProvider>
                </LanguageProvider>
              </AuthProvider>
            </DataModeProvider>
          </AppAccentProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

/* ─────────────────────────────────────────────────────────
   DESKTOP SHELL
───────────────────────────────────────────────────────── */
function DesktopShell() {
  const { session, profile, loading, user } = useAuth();
  const { isDark } = useTheme();
  const pathname = usePathname();

  /* ── unread chat count ── */
  const [unread, setUnread] = useState(0);
  const refreshUnread = useCallback(async () => {
    try {
      const convs = await getLocalConversations();
      setUnread(convs.reduce((s, c) => s + (c.unread_count ?? 0), 0));
    } catch (_) {}
  }, []);
  useEffect(() => { refreshUnread(); }, [refreshUnread]);
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("dt-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refreshUnread)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_receipts" }, refreshUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, refreshUnread]);

  /* ── notification count ── */
  const [notifCount, setNotifCount] = useState(0);
  const refreshNotifs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setNotifCount(count ?? 0);
    } catch (_) {}
  }, [user?.id]);
  useEffect(() => { refreshNotifs(); }, [refreshNotifs]);
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("dt-notifs")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, refreshNotifs)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, refreshNotifs]);

  /* ── dropdown state ── */
  const composeRef = useRef<HTMLButtonElement | null>(null);
  const avBtnRef   = useRef<HTMLButtonElement | null>(null);
  const [composeDrop, setComposeDrop] = useState<{ top: number; left: number } | null>(null);
  const [userDrop, setUserDrop]       = useState<{ bottom: number; left: number } | null>(null);
  const [tbUserDrop, setTbUserDrop]   = useState<{ top: number; right: number } | null>(null);
  const [navCtx, setNavCtx]           = useState<{ x: number; y: number; route: string; label: string } | null>(null);

  const closeAll = useCallback(() => {
    setComposeDrop(null);
    setUserDrop(null);
    setTbUserDrop(null);
    setNavCtx(null);
  }, []);

  useEffect(() => {
    if (!composeDrop && !userDrop && !tbUserDrop && !navCtx) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest?.(".dt-drop")) closeAll();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeAll(); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [composeDrop, userDrop, tbUserDrop, navCtx, closeAll]);

  /* ── auth guard ── */
  useEffect(() => {
    if (loading) return;
    if (!session && !isNoShell(pathname)) {
      if (typeof window !== "undefined") {
        const hasStored = Object.keys(window.localStorage || {}).some(
          (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
        );
        if (hasStored) return;
      }
      router.replace("/(auth)/login");
      return;
    }
    if (session && profile && !profile.onboarding_completed && !pathname.startsWith("/onboarding")) {
      router.replace({ pathname: "/onboarding", params: { userId: session.user.id } } as any);
    }
  }, [session, profile, loading, pathname]);

  const noShell = isNoShell(pathname) || !session;

  /* Loading */
  if (loading && !noShell) {
    const theme = isDark ? "dt-dk" : "dt-lt";
    return (
      <div className={`dt-shell ${theme}`}>
        <div className="dt-loading"><div className="dt-spin" /></div>
      </div>
    );
  }

  /* No-shell routes: pass through */
  if (noShell) {
    return <Slot />;
  }

  const theme        = isDark ? "dt-dk" : "dt-lt";
  const displayName  = profile?.display_name || profile?.handle || "You";
  const avatarUrl    = profile?.avatar_url;
  const initials     = displayName.charAt(0).toUpperCase();
  const pageTitle    = getPageTitle(pathname);

  return (
    <>
      {/* ═══ SHELL WRAPPER ═══ */}
      <div className={`dt-shell ${theme}`}>

        {/* ══════════════════════════════════
            SIDEBAR
        ══════════════════════════════════ */}
        <nav className="dt-side">

          {/* Brand */}
          <div className="dt-brand">
            <img src="/logo.png" alt="AfuChat" className="dt-brand-img"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="dt-brand-name">Afu<em>Chat</em></span>
            <button
              ref={composeRef}
              className="dt-ibtn"
              title="Create…"
              onClick={(e) => {
                e.stopPropagation();
                if (composeDrop) { setComposeDrop(null); return; }
                const rect = composeRef.current!.getBoundingClientRect();
                setComposeDrop({ top: rect.bottom + 6, left: Math.max(8, rect.right - 214) });
              }}
            >
              <Plus size={15} strokeWidth={2.2} />
            </button>
          </div>

          {/* Search */}
          <div className="dt-sb-srch">
            <div className="dt-sb-srch-inner">
              <Search size={13} className="dt-sb-srch-ico" />
              <input
                className="dt-sb-srch-inp"
                placeholder="Search people, chats…"
                readOnly
                onClick={() => router.push("/(tabs)/search")}
              />
            </div>
          </div>

          {/* Nav sections */}
          <div className="dt-nav">
            {NAV_SECTIONS.map((section, si) => (
              <div key={section.key} className="dt-ns">
                {si > 0 && <div className="dt-ns-div" />}
                {section.label && (
                  <span className="dt-ns-lbl">{section.label}</span>
                )}
                {section.items.map((item) => {
                  const active = isActiveRoute(pathname, item.matchPaths as unknown as string[]);
                  return (
                    <a
                      key={item.route}
                      className={`dt-ni${active ? " act" : ""}`}
                      href={item.route}
                      onClick={(e) => { e.preventDefault(); router.push(item.route as any); }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setNavCtx({ x: e.clientX, y: e.clientY, route: item.route, label: item.label });
                      }}
                    >
                      <item.Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.badge && unread > 0 && (
                        <span className="dt-ni-badge">{unread > 99 ? "99+" : unread}</span>
                      )}
                    </a>
                  );
                })}
              </div>
            ))}
          </div>

          {/* User footer card */}
          <div
            className="dt-ucard"
            onClick={() => router.push("/(tabs)/me")}
            onContextMenu={(e) => {
              e.preventDefault();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setUserDrop({ bottom: window.innerHeight - r.top + 4, left: r.left + 4 });
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && router.push("/(tabs)/me")}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="dt-uav" />
            ) : (
              <div className="dt-uav-ph">{initials}</div>
            )}
            <div className="dt-ucard-info">
              <div className="dt-ucard-name">{displayName}</div>
              <div className="dt-ucard-handle">@{profile?.handle || "…"}</div>
            </div>
            <button
              className="dt-ibtn"
              title="Account options"
              onClick={(e) => {
                e.stopPropagation();
                if (userDrop) { setUserDrop(null); return; }
                const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setUserDrop({ bottom: window.innerHeight - r.top + 4, left: r.left - 176 });
              }}
            >
              <MoreHorizontal size={14} strokeWidth={1.8} />
            </button>
          </div>
        </nav>

        {/* ══════════════════════════════════
            TOP BAR
        ══════════════════════════════════ */}
        <header className="dt-topbar">
          {/* Back button — shown for non-primary routes where GlassHeader is hidden */}
          {!isPrimaryRoute(pathname) && (
            <button
              className="dt-tb-back"
              title="Go back"
              onClick={() => router.back()}
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          )}
          <span className="dt-tb-title">{pageTitle}</span>

          <div className="dt-tb-srch">
            <Search size={14} className="dt-tb-srch-ico" />
            <input
              className="dt-tb-srch-inp"
              placeholder="Search AfuChat…"
              readOnly
              onClick={() => router.push("/(tabs)/search")}
            />
          </div>

          <div className="dt-tb-actions">
            {/* Compose */}
            <button
              className="dt-ibtn"
              title="Create new…"
              onClick={(e) => {
                e.stopPropagation();
                if (composeDrop) { setComposeDrop(null); return; }
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setComposeDrop({ top: rect.bottom + 6, left: Math.max(8, rect.right - 214) });
              }}
            >
              <Edit3 size={16} strokeWidth={1.8} />
            </button>

            {/* Notifications */}
            <div className="dt-tb-notif">
              <button
                className="dt-ibtn"
                title="Notifications"
                onClick={() => router.push("/notifications" as any)}
              >
                <Bell size={16} strokeWidth={1.8} />
              </button>
              {notifCount > 0 && (
                <span className="dt-tb-notif-badge">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </div>

            <div className="dt-tb-divider" />

            {/* Profile avatar */}
            <button
              ref={avBtnRef}
              className="dt-tb-avbtn"
              title="Account"
              onClick={(e) => {
                e.stopPropagation();
                if (tbUserDrop) { setTbUserDrop(null); return; }
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setTbUserDrop({
                  top: rect.bottom + 6,
                  right: Math.max(8, window.innerWidth - rect.right),
                });
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} />
              ) : (
                <div className="dt-tb-avbtn-ph">{initials}</div>
              )}
            </button>
          </div>
        </header>

        {/* ══════════════════════════════════
            MAIN BODY
        ══════════════════════════════════ */}
        <main className="dt-body">
          {isWideRoute(pathname) ? (
            <Slot />
          ) : (
            <div className="dt-page-wrap">
              <Slot />
            </div>
          )}
        </main>

      </div>

      {/* ══════════════════════════════════
          MOBILE BOTTOM NAV
      ══════════════════════════════════ */}
      <nav className={`dt-bnav ${theme}`} aria-label="Mobile navigation">
        <div className="dt-bnav-inner">
          {BNAV_ITEMS.map((item) => {
            const active    = isActiveRoute(pathname, item.matchPaths as unknown as string[]);
            const isChats   = item.label === "Chats";
            const isProfile = item.label === "Profile";
            const iconColor = active ? "#00BCD4" : undefined;
            return (
              <a
                key={item.route}
                className={`dt-bnav-item${active ? " act" : ""}`}
                href={item.route}
                onClick={(e) => { e.preventDefault(); router.push(item.route as any); }}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <div className="dt-bnav-icon">
                  {isProfile && avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      style={{
                        width: 28, height: 28, borderRadius: "50%", objectFit: "cover",
                        border: active ? "2.5px solid #00BCD4" : "2px solid rgba(128,128,128,0.22)",
                        transition: "border-color .16s",
                      }}
                    />
                  ) : item.useAfuSymbol ? (
                    <img
                      src="/afu-symbol-icon.png"
                      alt="Chats"
                      style={{
                        width: 44, height: 44, objectFit: "contain",
                        filter: active
                          ? "invert(68%) sepia(97%) saturate(450%) hue-rotate(148deg) brightness(98%) contrast(102%)"
                          : isDark
                            ? "invert(40%) sepia(0%) saturate(0%) brightness(70%)"
                            : "invert(30%) sepia(0%) saturate(0%) brightness(60%)",
                        transition: "filter .16s",
                      }}
                    />
                  ) : (
                    <item.Icon size={24} strokeWidth={active ? 2.3 : 1.7} color={iconColor} />
                  )}
                  {isChats && unread > 0 && (
                    <span className="dt-bnav-badge">{unread > 99 ? "99+" : unread}</span>
                  )}
                </div>
                <span className="dt-bnav-label">{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* ══════════════════════════════════
          COMPOSE DROPDOWN
      ══════════════════════════════════ */}
      {composeDrop && (
        <div
          className={`dt-drop ${theme}`}
          style={{ top: composeDrop.top, left: composeDrop.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="dt-drop-lbl">Create</div>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/(tabs)" as any); }}>
            <MessageCircle size={14} strokeWidth={1.8} /><span>New Chat</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/create-post" as any); }}>
            <FileText size={14} strokeWidth={1.8} /><span>New Post</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/story/create" as any); }}>
            <Film size={14} strokeWidth={1.8} /><span>New Story</span>
          </button>
          <hr className="dt-drop-hr" />
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/group/create" as any); }}>
            <Users size={14} strokeWidth={1.8} /><span>New Group</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/channel/intro" as any); }}>
            <Hash size={14} strokeWidth={1.8} /><span>New Channel</span>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════
          SIDEBAR USER DROPDOWN (right-click / ⋯)
      ══════════════════════════════════ */}
      {userDrop && (
        <div
          className={`dt-drop ${theme}`}
          style={{ bottom: userDrop.bottom, left: userDrop.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="dt-drop-lbl">{profile?.handle ? `@${profile.handle}` : "Account"}</div>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/(tabs)/me" as any); }}>
            <User size={14} strokeWidth={1.8} /><span>View Profile</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/profile/edit" as any); }}>
            <Edit3 size={14} strokeWidth={1.8} /><span>Edit Profile</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/settings" as any); }}>
            <Settings size={14} strokeWidth={1.8} /><span>Settings</span>
          </button>
          <hr className="dt-drop-hr" />
          {profile?.handle && (
            <button className="dt-drop-item" onClick={() => { closeAll(); navigator.clipboard?.writeText(`@${profile!.handle}`); }}>
              <Copy size={14} strokeWidth={1.8} /><span>Copy @handle</span>
            </button>
          )}
          <button className="dt-drop-item dt-danger" onClick={() => { closeAll(); supabase.auth.signOut(); }}>
            <LogOut size={14} strokeWidth={1.8} /><span>Sign out</span>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════
          TOP BAR PROFILE DROPDOWN
      ══════════════════════════════════ */}
      {tbUserDrop && (
        <div
          className={`dt-drop ${theme}`}
          style={{ top: tbUserDrop.top, right: tbUserDrop.right, minWidth: 230 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="dt-drop-lbl" style={{ fontSize: 12 }}>
            {displayName}
            {profile?.handle ? ` · @${profile.handle}` : ""}
          </div>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/(tabs)/me" as any); }}>
            <User size={14} strokeWidth={1.8} /><span>View Profile</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/profile/edit" as any); }}>
            <Edit3 size={14} strokeWidth={1.8} /><span>Edit Profile</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/notifications" as any); }}>
            <Bell size={14} strokeWidth={1.8} /><span>Notifications</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/premium" as any); }}>
            <Star size={14} strokeWidth={1.8} /><span>Premium</span>
          </button>
          <hr className="dt-drop-hr" />
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/settings" as any); }}>
            <Settings size={14} strokeWidth={1.8} /><span>Settings</span>
          </button>
          {profile?.handle && (
            <button className="dt-drop-item" onClick={() => { closeAll(); navigator.clipboard?.writeText(`@${profile!.handle}`); }}>
              <Copy size={14} strokeWidth={1.8} /><span>Copy @handle</span>
            </button>
          )}
          <hr className="dt-drop-hr" />
          <button className="dt-drop-item dt-danger" onClick={() => { closeAll(); supabase.auth.signOut(); }}>
            <LogOut size={14} strokeWidth={1.8} /><span>Sign out</span>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════
          NAV ITEM RIGHT-CLICK CONTEXT MENU
      ══════════════════════════════════ */}
      {navCtx && (
        <div
          className={`dt-drop ${theme}`}
          style={{
            top: Math.min(navCtx.y, window.innerHeight - 160),
            left: Math.min(navCtx.x + 4, window.innerWidth - 224),
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="dt-drop-lbl">{navCtx.label}</div>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push(navCtx.route as any); }}>
            <ExternalLink size={14} strokeWidth={1.8} /><span>Open</span>
          </button>
          <button
            className="dt-drop-item"
            onClick={() => { closeAll(); window.open(window.location.origin + navCtx.route, "_blank"); }}
          >
            <ExternalLink size={14} strokeWidth={1.8} /><span>Open in new tab</span>
          </button>
          <hr className="dt-drop-hr" />
          <button
            className="dt-drop-item"
            onClick={() => { closeAll(); navigator.clipboard?.writeText(window.location.origin + navCtx.route); }}
          >
            <Copy size={14} strokeWidth={1.8} /><span>Copy link</span>
          </button>
        </div>
      )}
    </>
  );
}
