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
      `id=eq.${encodeURIComponent(id)}&select=id,content,image_url,article_title,article_cover_url,post_type,created_at,profiles!posts_author_id_fkey(display_name,handle,avatar_url)&limit=1`,
    );

    if (!post) {
      res.send(buildHtml({
        title: 'Post · AfuChat',
        description: 'This post was not found on AfuChat.',
        image: null,
        url: `${SITE_ORIGIN}/post/${id}`,
        card: 'summary',
      }));
      return;
    }

    const author = post.profiles || {};
    const title  = post.article_title
      ? `${post.article_title} — ${author.display_name || 'AfuChat'}`
      : `${author.display_name || 'Someone'} on AfuChat`;
    const desc   = strip(post.content || post.article_title || '', 200) || 'View this post on AfuChat';
    const image  = post.article_cover_url || post.image_url || author.avatar_url || null;
    const url    = `${SITE_ORIGIN}/post/${id}`;

    res.send(buildHtml({
      title,
      description: desc,
      image,
      url,
      card: image ? 'summary_large_image' : 'summary',
      type: 'article',
    }));
  } catch (err) {
    console.error('[post]', err);
    res.status(500).send('Internal error');
  }
};
