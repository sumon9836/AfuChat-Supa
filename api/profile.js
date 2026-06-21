'use strict';

const { supa, esc, strip, buildHtml, SITE_DOMAIN, SITE_ORIGIN: HELPER_ORIGIN } = require('./_ogHelper');

const SITE_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : HELPER_ORIGIN || `https://${SITE_DOMAIN}`;

module.exports = async function handler(req, res) {
  const handle = (req.query.handle || '').replace(/^@/, '').toLowerCase().trim();

  if (!handle) { res.status(400).send('Missing handle'); return; }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');

  try {
    const profile = await supa(
      'profiles',
      `handle=eq.${encodeURIComponent(handle)}&select=id,display_name,handle,avatar_url,bio,is_verified,is_organization_verified,xp,country,follower_count,following_count&limit=1`,
    );

    const url = `${SITE_ORIGIN}/@${handle}`;

    if (!profile) {
      res.send(buildHtml({
        title: `@${handle} \u00b7 AfuChat`,
        description: 'This profile was not found on AfuChat.',
        image: null,
        url,
        card: 'summary',
      }));
      return;
    }

    const verified  = profile.is_organization_verified || profile.is_verified;
    const title     = `${profile.display_name}${verified ? ' \u2713' : ''} (@${profile.handle}) \u00b7 AfuChat`;
    const bio       = strip(profile.bio || '', 160);
    const desc      = bio || `Follow @${profile.handle} on AfuChat`;

    const extra = `<meta property="og:profile:username" content="${esc(profile.handle)}">
${profile.xp      ? `<meta name="afuchat:xp"   content="${profile.xp}">` : ''}
${profile.country ? `<meta property="og:locale" content="${esc(profile.country)}">` : ''}`;

    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: title,
      url,
      mainEntity: {
        '@type': 'Person',
        name: profile.display_name,
        alternateName: `@${profile.handle}`,
        description: bio || undefined,
        image: profile.avatar_url || undefined,
        url,
        interactionStatistic: [
          profile.follower_count != null ? {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/FollowAction',
            userInteractionCount: profile.follower_count,
          } : null,
        ].filter(Boolean),
      },
    };

    res.send(buildHtml({
      title,
      description: desc,
      image: profile.avatar_url || null,
      url,
      card: 'summary',
      type: 'profile',
      extra,
      jsonld,
    }));
  } catch (err) {
    console.error('[profile]', err);
    res.status(500).send('Internal error');
  }
};
