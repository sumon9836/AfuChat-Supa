'use strict';

const { supa, strip, buildHtml, SITE_DOMAIN } = require('./_ogHelper');

const SITE_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : `https://${SITE_DOMAIN}`;

// Routes that belong to the SPA and must not be intercepted as handles
const RESERVED = new Set([
  'discover', 'chats', 'communities', 'contacts', 'me', 'search', 'shorts',
  'settings', 'premium', 'prestige', 'referral', 'store', 'status', 'digital-id',
  'wallet', 'games', 'shop', 'video', 'article', 'post', 'p', 'channel', 'chat',
  'chat-search', 'qr-scanner', 'user-discovery', 'achievements', 'about', 'help',
  'support', 'welcome', 'login', 'register', 'onboarding', 'saved-posts',
  'followers', 'contact', 'business', 'business-verification', 'company',
  'freelance', 'match', 'mini-programs', 'moments', 'stories', 'group', 'join',
  'profile', 'profile-not-found', 'profile-private', 'my-posts', 'collections',
  'watch-history', 'paid-communities', 'phone-contacts', 'linked-accounts',
  'digital-events', 'file-manager', 'language-settings', 'device-security',
  'update-password', 'red-envelope', 'username-market', 'gifts', 'lab', 'ai',
  'create-post', 'browser', 'status', 'index',
]);

module.exports = async function handler(req, res) {
  const raw    = (req.query.handle || '').trim();
  const handle = raw.toLowerCase();

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  // Reserved SPA route — let the SPA handle it
  if (!handle || RESERVED.has(handle) || handle.length < 3 || handle.length > 30) {
    res.setHeader('Location', `/${raw}?_s=1`);
    res.status(302).end();
    return;
  }

  try {
    const profile = await supa(
      'profiles',
      `handle=eq.${encodeURIComponent(handle)}&select=id,display_name,handle,avatar_url,bio,is_verified,is_organization_verified&limit=1`,
    );

    if (!profile) {
      // Unknown handle — pass to SPA
      res.setHeader('Location', `/${raw}?_s=1`);
      res.status(302).end();
      return;
    }

    const verified = profile.is_organization_verified || profile.is_verified;
    const name     = profile.display_name || `@${profile.handle}`;
    const title    = `${name}${verified ? ' ✓' : ''} invites you to join AfuChat!`;
    const bio      = strip(profile.bio || '', 120);
    const desc     = [
      bio ? `"${bio}"` : '',
      `Sign up with ${name}\u2019s referral link and get 1 week of free Platinum on AfuChat.`,
    ].filter(Boolean).join(' — ');
    const url      = `${SITE_ORIGIN}/${profile.handle}`;

    res.send(buildHtml({
      title,
      description: desc,
      image: profile.avatar_url || null,
      url,
      card: 'summary',
      type: 'website',
    }));
  } catch (err) {
    console.error('[handle]', err);
    // On error, just pass through to SPA
    res.setHeader('Location', `/${raw}?_s=1`);
    res.status(302).end();
  }
};
