/**
 * deepLinkVerifier.ts
 *
 * Verifies that afuchat:// deep links route to the correct screens at startup.
 * Runs a lightweight test suite in __DEV__ mode and logs any route that
 * accidentally lands in [handle].tsx instead of its intended destination.
 *
 * Usage: call verifyDeepLinks() once inside a useEffect in _layout.tsx.
 * It is a no-op in production builds.
 */

import { handleIncomingUrl } from "./deepLinkHandler";

type RouteTestCase = {
  url: string;
  expectedType: "navigate" | "join_group" | "referral" | "null";
  expectedPath?: string;
  description: string;
};

const TEST_CASES: RouteTestCase[] = [
  // ── Critical navigation routes ─────────────────────────────────────────────
  {
    url: "afuchat://settings",
    expectedType: "navigate",
    expectedPath: "/settings",
    description: "Settings deep link",
  },
  {
    url: "afuchat://wallet",
    expectedType: "navigate",
    expectedPath: "/wallet",
    description: "Wallet deep link",
  },
  {
    url: "afuchat://profile",
    expectedType: "navigate",
    expectedPath: "/(tabs)/me",
    description: "Profile tab deep link",
  },
  {
    url: "afuchat://discover",
    expectedType: "navigate",
    expectedPath: "/(tabs)/discover",
    description: "Discover tab deep link",
  },
  {
    url: "afuchat://chats",
    expectedType: "navigate",
    expectedPath: "/(tabs)/chats",
    description: "Chats tab deep link",
  },
  {
    url: "afuchat://ai",
    expectedType: "navigate",
    expectedPath: "/ai",
    description: "AfuAI deep link",
  },
  {
    url: "afuchat://about",
    expectedType: "navigate",
    expectedPath: "/about",
    description: "About screen deep link",
  },
  // ── Chat with specific ID ──────────────────────────────────────────────────
  {
    url: "afuchat://chat/00000000-0000-0000-0000-000000000001",
    expectedType: "navigate",
    expectedPath: "/chat/[id]",
    description: "Chat by UUID deep link",
  },
  // ── Group join ─────────────────────────────────────────────────────────────
  {
    url: "afuchat://join/00000000-0000-0000-0000-000000000002",
    expectedType: "join_group",
    description: "Group join by UUID deep link",
  },
  // ── Referral ───────────────────────────────────────────────────────────────
  {
    url: "afuchat://ref/john",
    expectedType: "referral",
    description: "Referral /ref/handle path",
  },
  // ── System routes that must NOT be treated as handles ─────────────────────
  {
    url: "afuchat://about",
    expectedType: "navigate",
    description: "[handle] leak guard: 'about' must not be a referral",
  },
  {
    url: "afuchat://advanced-features",
    expectedType: "null",
    description: "[handle] leak guard: 'advanced-features' must not be a referral (invalid handle chars)",
  },
  {
    url: "afuchat://lab",
    expectedType: "null",
    description: "[handle] leak guard: 'lab' is a system route",
  },
];

/**
 * Run all test cases and log results. Only active in __DEV__ builds.
 * Results are logged as a group so they don't pollute the normal log stream.
 */
export async function verifyDeepLinks(): Promise<void> {
  if (!__DEV__) return;

  const results: { pass: boolean; desc: string; url: string; got: string; expected: string }[] = [];

  for (const tc of TEST_CASES) {
    try {
      const action = await handleIncomingUrl(tc.url);
      const gotType = action === null ? "null" : action.type;
      const gotPath = action?.type === "navigate" ? action.path : undefined;

      const typeMatch = gotType === tc.expectedType;
      const pathMatch = tc.expectedPath == null || gotPath === tc.expectedPath;
      const pass = typeMatch && pathMatch;

      results.push({
        pass,
        desc: tc.description,
        url: tc.url,
        got: action === null ? "null" : `${action.type}${gotPath ? ` → ${gotPath}` : ""}`,
        expected: tc.expectedPath ? `${tc.expectedType} → ${tc.expectedPath}` : tc.expectedType,
      });
    } catch (err) {
      results.push({
        pass: false,
        desc: tc.description,
        url: tc.url,
        got: `ERROR: ${err}`,
        expected: tc.expectedPath ? `${tc.expectedType} → ${tc.expectedPath}` : tc.expectedType,
      });
    }
  }

  const failures = results.filter((r) => !r.pass);
  const passes   = results.filter((r) => r.pass);

  console.group?.("[DeepLinkVerifier] Route test results");
  console.log(`✅ ${passes.length} passed  ❌ ${failures.length} failed`);

  if (failures.length > 0) {
    console.warn("[DeepLinkVerifier] FAILED routes:");
    for (const f of failures) {
      console.warn(`  ❌ ${f.desc}`);
      console.warn(`     URL:      ${f.url}`);
      console.warn(`     Expected: ${f.expected}`);
      console.warn(`     Got:      ${f.got}`);
    }
  }

  console.groupEnd?.();
}

/**
 * Log a route leak — call this from [handle].tsx when a path that should
 * have been caught by a static file ends up in the catch-all handler.
 *
 * @param handle  The raw handle/path segment that landed in [handle].tsx
 * @param reason  Why it was flagged (e.g. "reserved route", "system route")
 */
export function logHandleLeak(handle: string, reason: string): void {
  if (!__DEV__) return;
  console.warn(
    `[DeepLinkVerifier] Route leak detected!\n` +
    `  Segment "${handle}" landed in [handle].tsx — ${reason}.\n` +
    `  Add a static file for this route or add it to RESERVED_ROUTES.`
  );
}
