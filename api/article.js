'use strict';

const { supa, esc, strip, buildHtml, SITE_DOMAIN, SITE_ORIGIN: HELPER_ORIGIN } = require('./_ogHelper');

const SITE_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : HELPER_ORIGIN || `https://${SITE_DOMAIN}`;

module.exports = async function handler(req, res) {
  const { id } = req.query;
  if (!id) { res.status(400).send('Missing id'); return; }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');

  try {
    const post = await supa(
      'posts',
      `id=eq.${encodeURIComponent(id)}&select=id,article_title,article_body,article_cover_url,content,created_at,updated_at,like_count,comment_count,profiles!posts_author_id_fkey(display_name,handle,avatar_url)&post_type=eq.article&limit=1`,
    );

    const url = `${SITE_ORIGIN}/article/${id}`;

    if (!post) {
      res.send(buildHtml({
        title: 'Article \u00b7 AfuChat',
        description: 'This article was not found on AfuChat.',
        image: null,
        url,
        card: 'summary',
      }));
      return;
    }

    const author   = post.profiles || {};
    const title    = post.article_title || 'Article on AfuChat';
    const body     = post.article_body || post.content || '';
    const desc     = strip(body, 200) || `An article by ${author.display_name || 'AfuChat'}`;
    const image    = post.article_cover_url || author.avatar_url || null;
    const fullTitle = `${title} \u2014 ${author.display_name || 'AfuChat'}`;
    const authorUrl = author.handle ? `${SITE_ORIGIN}/@${author.handle}` : SITE_ORIGIN;

    const extra = author.handle
      ? `<meta property="article:author"        content="${esc(authorUrl)}">
<meta property="article:published_time" content="${esc(post.created_at)}">`
      : '';

    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: desc,
      image: image || undefined,
      url,
      datePublished: post.created_at,
      dateModified: post.updated_at || post.created_at,
      author: {
        '@type': 'Person',
        name: author.display_name || 'AfuChat',
        url: authorUrl,
        image: author.avatar_url || undefined,
      },
      publisher: {
        '@type': 'Organization',
        name: 'AfuChat',
        url: SITE_ORIGIN,
        logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/assets/logo.png` },
      },
      interactionStatistic: [
        post.like_count != null ? { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: post.like_count } : null,
        post.comment_count != null ? { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: post.comment_count } : null,
      ].filter(Boolean),
    };

    res.send(buildHtml({
      title: fullTitle,
      description: desc,
      image,
      url,
      card: image ? 'summary_large_image' : 'summary',
      type: 'article',
      extra,
      jsonld,
    }));
  } catch (err) {
    console.error('[article]', err);
    res.status(500).send('Internal error');
  }
};
