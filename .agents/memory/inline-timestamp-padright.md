---
name: Inline timestamp ghost-tail unreliable
description: Why the transparent ghost-text approach for WhatsApp-style inline timestamps breaks and what to use instead.
---

## The rule
Do NOT use a ghost `<Text style={{ color: "transparent" }}>` inside another `<Text>` (via the `tail` prop or otherwise) to reserve space for an absolutely-positioned timestamp.

## Why
`color: "transparent"` on a nested `<Text>` in React Native is unreliable — on some engines (older Android, Hermes edge cases) the text colour falls back to the inherited parent colour and the ghost text becomes visible, causing an apparent duplicate timestamp on the message bubble.

## How to apply
Instead, add `paddingRight` directly to the RichText (root `<Text>`) style to reserve the timestamp space. Example values used in chat/[id].tsx:

```js
paddingRight: useInlineTimestamp
  ? (msg.edited_at ? (isMe ? 96 : 76) : (isMe ? 60 : 46))
  : 0,
```

This is more reliable because `paddingRight` on a `<Text>` is a standard layout property handled by Yoga, not a text-colour rendering concern.
