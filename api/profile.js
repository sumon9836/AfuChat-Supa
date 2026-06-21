'use strict';

const { supa, strip, buildHtml, SITE_DOMAIN } = require('./_ogHelper');

const SITE_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : `https://${SITE_DOMAIN}`;

module.exports = async function handler(req, res) {
  const handle = (req.query.handle || '').replace(/^@/, '').toLowerCase().trim();

  if (!handle) { res.status(400).send('Missing handle'); return; }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');

  try {
    const profile = await supa(
      'profiles',
      `handle=eq.${encodeURIComponent(handle)}&select=id,display_name,handle,avatar_url,bio,is_verified,is_organization_verified,xp,country&limit=1`,
    );

    if (!profile) {
      res.send(buildHtml({
        title: `@${handle} · AfuChat`,
        description: 'This profile was not found on AfuChat.',
        image: null,
        url: `${SITE_ORIGIN}/@${handle}`,
        card: 'summary',
      }));
      return;
    }

    const verified = profile.is_organization_verified || profile.is_verified;
    const title    = `${profile.display_name}${verified ? ' ✓' : ''} (@${profile.handle}) · AfuChat`;
    const bio      = strip(profile.bio || '', 160);
    const desc     = bio || `Follow @${profile.handle} on AfuChat`;
    const url      = `${SITE_ORIGIN}/@${profile.handle}`;

    const extra = `
<meta property="og:profile:username" content="${profile.handle}">
${profile.xp ? `<meta name="afuchat:xp" content="${profile.xp}">` : ''}
${profile.country ? `<meta property="og:locale" content="${profile.country}">` : ''}`;

    res.send(buildHtml({
      title,
      description: desc,
      image: profile.avatar_url || null,
      url,
      card: profile.avatar_url ? 'summary' : 'summary',
      type: 'profile',
      extra,
    }));
  } catch (err) {
    console.error('[profile]', err);
    res.status(500).send('Internal error');
  }
};
