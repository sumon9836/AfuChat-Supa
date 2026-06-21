'use strict';

const { supa, strip, buildHtml, SITE_DOMAIN } = require('./_ogHelper');

const SITE_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : `https://${SITE_DOMAIN}`;

module.exports = async function handler(req, res) {
  const { id } = req.query;
  if (!id) { res.status(400).send('Missing id'); return; }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');

  try {
    const post = await supa(
      'posts',
      `id=eq.${encodeURIComponent(id)}&select=id,article_title,article_body,article_cover_url,content,created_at,profiles!posts_author_id_fkey(display_name,handle,avatar_url)&post_type=eq.article&limit=1`,
    );

    if (!post) {
      res.send(buildHtml({
        title: 'Article · AfuChat',
        description: 'This article was not found on AfuChat.',
        image: null,
        url: `${SITE_ORIGIN}/article/${id}`,
        card: 'summary',
      }));
      return;
    }

    const author = post.profiles || {};
    const title  = post.article_title || 'Article on AfuChat';
    const body   = post.article_body || post.content || '';
    const desc   = strip(body, 200) || `An article by ${author.display_name || 'AfuChat'}`;
    const image  = post.article_cover_url || author.avatar_url || null;
    const url    = `${SITE_ORIGIN}/article/${id}`;

    const extra = author.handle
      ? `<meta property="article:author" content="${SITE_ORIGIN}/@${author.handle}">`
      : '';

    res.send(buildHtml({
      title: `${title} — ${author.display_name || 'AfuChat'}`,
      description: desc,
      image,
      url,
      card: image ? 'summary_large_image' : 'summary',
      type: 'article',
      extra,
    }));
  } catch (err) {
    console.error('[article]', err);
    res.status(500).send('Internal error');
  }
};
