import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const SITE   = "https://afuchat.com";
const NAME   = "AfuChat";
const TITLE  = "AfuChat \u2014 Africa\u2019s Super App";
const DESC   = "Message friends, share videos, send money, discover creators and grow your community. AfuChat is the all-in-one super app built for Africa.";
const OG_IMG = `${SITE}/assets/og-default.png`;
const COLOR  = "#1DB954";

export default function Root({ children }: PropsWithChildren) {
  const ldJson = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: NAME,
      operatingSystem: "Android, iOS, Web",
      applicationCategory: "SocialNetworkingApplication",
      description: DESC,
      url: SITE,
      image: OG_IMG,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "5200" },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: NAME,
      url: SITE,
      logo: `${SITE}/assets/logo.png`,
      sameAs: ["https://twitter.com/AfuChat", "https://www.instagram.com/afuchat/"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@afuchat.com",
        availableLanguage: ["English", "Swahili", "French", "Arabic"],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: SITE,
      name: NAME,
      description: DESC,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ]);

  return (
    <html lang="en">
      <head>
        {/* ── Core ──────────────────────────────────────────────────────────── */}
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* ── Primary SEO ───────────────────────────────────────────────────── */}
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta name="keywords" content="AfuChat, Africa super app, messaging Africa, video sharing Africa, mobile payments Africa, social network Africa, community app Kenya" />
        <meta name="author" content="AfuChat" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <link rel="canonical" href={SITE} />

        {/* ── Open Graph ────────────────────────────────────────────────────── */}
        <meta property="og:type"          content="website" />
        <meta property="og:site_name"     content={NAME} />
        <meta property="og:title"         content={TITLE} />
        <meta property="og:description"   content={DESC} />
        <meta property="og:url"           content={SITE} />
        <meta property="og:image"         content={OG_IMG} />
        <meta property="og:image:secure_url" content={OG_IMG} />
        <meta property="og:image:width"   content="1200" />
        <meta property="og:image:height"  content="630" />
        <meta property="og:image:alt"     content="AfuChat — Africa's Super App" />
        <meta property="og:locale"        content="en_US" />

        {/* ── Twitter Card ──────────────────────────────────────────────────── */}
        <meta name="twitter:card"         content="summary_large_image" />
        <meta name="twitter:site"         content="@AfuChat" />
        <meta name="twitter:creator"      content="@AfuChat" />
        <meta name="twitter:title"        content={TITLE} />
        <meta name="twitter:description"  content={DESC} />
        <meta name="twitter:image"        content={OG_IMG} />
        <meta name="twitter:image:alt"    content="AfuChat — Africa's Super App" />

        {/* ── PWA / App Capabilities ────────────────────────────────────────── */}
        <meta name="theme-color"                        content={COLOR} />
        <meta name="color-scheme"                       content="dark light" />
        <meta name="mobile-web-app-capable"             content="yes" />
        <meta name="apple-mobile-web-app-capable"       content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title"         content={NAME} />
        <meta name="application-name"                   content={NAME} />
        <meta name="msapplication-TileColor"            content={COLOR} />
        <meta name="msapplication-config"               content="/browserconfig.xml" />
        <meta name="format-detection"                   content="telephone=no" />

        {/* ── Icons & Manifest ──────────────────────────────────────────────── */}
        <link rel="icon"             type="image/png"  href="/assets/favicon.png" />
        <link rel="apple-touch-icon"                   href="/assets/logo.png" />
        <link rel="manifest"                           href="/manifest.json" />

        {/* ── Performance ───────────────────────────────────────────────────── */}
        <link rel="preconnect" href="https://rhnsjqqtdzlkvqazfcbg.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://rhnsjqqtdzlkvqazfcbg.supabase.co" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* ── Structured Data (JSON-LD) ─────────────────────────────────────── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson }}
        />

        {/* ── Expo / RN Web reset ───────────────────────────────────────────── */}
        <ScrollViewStyleReset />

        {/* ── App shell styles ──────────────────────────────────────────────── */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { height: 100%; margin: 0; padding: 0; background: #111; }
              body {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              #root {
                width: 390px;
                height: 844px;
                max-height: 100vh;
                overflow: hidden;
                position: relative;
                border-radius: 40px;
                box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 32px 100px rgba(0,0,0,0.8);
                background: #000;
              }
              @media (max-height: 860px) {
                #root { height: 100vh; border-radius: 0; box-shadow: none; }
              }
              @media (max-width: 420px) {
                body { background: #000; align-items: flex-start; }
                #root { width: 100vw; height: 100vh; border-radius: 0; box-shadow: none; }
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
