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
      `id=eq.${encodeURIComponent(id)}&select=id,content,image_url,article_title,article_cover_url,post_type,created_at,updated_at,like_count,comment_count,profiles!posts_author_id_fkey(display_name,handle,avatar_url)&limit=1`,
    );

    const url = `${SITE_ORIGIN}/post/${id}`;

    if (!post) {
      res.send(buildHtml({
        title: 'Post \u00b7 AfuChat',
        description: 'This post was not found on AfuChat.',
        image: null,
        url,
        card: 'summary',
      }));
      return;
    }

    const author = post.profiles || {};
    const title  = post.article_title
      ? `${post.article_title} \u2014 ${author.display_name || 'AfuChat'}`
      : `${author.display_name || 'Someone'} on AfuChat`;
    const desc   = strip(post.content || post.article_title || '', 200) || 'View this post on AfuChat';
    const image  = post.article_cover_url || post.image_url || author.avatar_url || null;

    const authorUrl = author.handle ? `${SITE_ORIGIN}/@${author.handle}` : SITE_ORIGIN;

    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'SocialMediaPosting',
      headline: title,
      description: desc,
      url,
      image: image || undefined,
      datePublished: post.created_at,
      dateModified: post.updated_at || post.created_at,
      author: {
        '@type': 'Person',
        name: author.display_name || 'AfuChat user',
        url: authorUrl,
        image: author.avatar_url || undefined,
      },
      publisher: {
        '@type': 'Organization',
        name: 'AfuChat',
        url: SITE_ORIGIN,
        logo: `${SITE_ORIGIN}/assets/logo.png`,
      },
      interactionStatistic: [
        post.like_count != null ? { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: post.like_count } : null,
        post.comment_count != null ? { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: post.comment_count } : null,
      ].filter(Boolean),
    };

    res.send(buildHtml({
      title,
      description: desc,
      image,
      url,
      card: image ? 'summary_large_image' : 'summary',
      type: 'article',
      jsonld,
    }));
  } catch (err) {
    console.error('[post]', err);
    res.status(500).send('Internal error');
  }
};
