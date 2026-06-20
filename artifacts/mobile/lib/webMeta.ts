// webMeta.ts — no-op stubs. All functions are web-only; they return immediately
// on Android/iOS builds. Kept for import compatibility with screen files.
export function setPageMeta(_params: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "article" | "profile" | "website";
  publishedAt?: string;
  author?: string;
}): void {}

export function resetPageMeta(): void {}
