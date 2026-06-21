'use strict';

const { supa, strip, buildHtml, SITE_DOMAIN } = require('./_ogHelper');

const SITE_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : `https://${SITE_DOMAIN}`;

module.exports = async function handler(req, res) {
  const { type, id } = req.query;
  if (!id) { res.status(400).send('Missing id'); return; }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');

  try {
    if (type === 'post') {
      const post = await supa(
        'posts',
        `id=eq.${encodeURIComponent(id)}&select=id,content,article_title,article_cover_url,image_url,post_type,profiles!posts_author_id_fkey(display_name,handle,avatar_url)&limit=1`,
      );
      const author = post?.profiles || {};
      const isArticle = !!(post?.article_title);
      const title = isArticle
        ? `${post.article_title} — ${author.display_name || 'AfuChat'}`
        : `${author.display_name || 'Someone'} on AfuChat`;
      const desc  = strip(post?.content || post?.article_title || '', 200) || 'View this post on AfuChat';
      const image = post?.article_cover_url || post?.image_url || author.avatar_url || null;
      const url   = `${SITE_ORIGIN}/p/${id}`;
      res.send(buildHtml({ title, description: desc, image, url, card: image ? 'summary_large_image' : 'summary', type: 'article' }));
      return;
    }

    if (type === 'video') {
      const post = await supa(
        'posts',
        `id=eq.${encodeURIComponent(id)}&select=id,content,video_url,image_url,profiles!posts_author_id_fkey(display_name,handle,avatar_url)&limit=1`,
      );
      const author    = post?.profiles || {};
      const title     = `${author.display_name || 'Someone'} posted a video on AfuChat`;
      const desc      = strip(post?.content || '', 200) || 'Watch this video on AfuChat';
      const image     = post?.image_url || author.avatar_url || null;
      const url       = `${SITE_ORIGIN}/video/${id}`;
      const embedUrl  = `${SITE_ORIGIN}/video/${id}/embed`;
      const extra     = post?.video_url
        ? `<meta property="og:video" content="${post.video_url}">
<meta property="og:video:secure_url" content="${post.video_url}">
<meta property="og:video:type" content="video/mp4">
<meta name="twitter:player" content="${embedUrl}">
<meta name="twitter:player:width" content="1280">
<meta name="twitter:player:height" content="720">`
        : '';
      res.send(buildHtml({ title, description: desc, image, url, card: post?.video_url ? 'player' : 'summary_large_image', type: 'video.other', extra }));
      return;
    }

    res.send(buildHtml({
      title: 'AfuChat — Connect, Share & Discover',
      description: 'AfuChat is Africa\'s super app for messaging, videos, payments and community.',
      image: null,
      url: SITE_ORIGIN,
    }));
  } catch (err) {
    console.error('[og]', err);
    res.status(500).send('Internal error');
  }
};
