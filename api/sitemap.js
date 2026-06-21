'use strict';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const SITE_DOMAIN  = process.env.EXPO_PUBLIC_DOMAIN || 'afuchat.com';
const ORIGIN       = `https://${SITE_DOMAIN}`;

async function supaList(table, queryString) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${queryString}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
      'Range-Unit': 'items',
      Range: '0-999',
    },
  });
  if (!r.ok) return [];
  return r.json();
}

function url(loc, priority, changefreq, lastmod) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority !== undefined ? `    <priority>${priority}</priority>` : '',
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

module.exports = async function handler(req, res) {
  try {
    const [posts, videos, articles, profiles] = await Promise.all([
      supaList('posts', 'select=id,created_at&post_type=eq.post&is_deleted=eq.false&order=created_at.desc&limit=500'),
      supaList('posts', 'select=id,created_at&not.video_url=is.null&is_deleted=eq.false&order=created_at.desc&limit=300'),
      supaList('posts', 'select=id,created_at&post_type=eq.article&is_deleted=eq.false&order=created_at.desc&limit=200'),
      supaList('profiles', 'select=handle,updated_at&is_private=eq.false&order=updated_at.desc&limit=500'),
    ]);

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      url(`${ORIGIN}/`, 1.0, 'daily'),
      url(`${ORIGIN}/discover`, 0.9, 'hourly'),
      ...posts.map(p => url(`${ORIGIN}/p/${p.id}`, 0.7, 'weekly', p.created_at)),
      ...videos.map(v => url(`${ORIGIN}/video/${v.id}`, 0.7, 'weekly', v.created_at)),
      ...articles.map(a => url(`${ORIGIN}/article/${a.id}`, 0.8, 'monthly', a.created_at)),
      ...profiles.map(p => url(`${ORIGIN}/@${p.handle}`, 0.6, 'weekly', p.updated_at)),
      '</urlset>',
    ];

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.send(lines.join('\n'));
  } catch (err) {
    console.error('[sitemap]', err);
    res.status(500).send('Internal error');
  }
};
