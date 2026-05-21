/** Server origin used by Next.js API route proxies (server-side only). */
export function getServerOrigin(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:4000"
  ).replace(/\/$/, "");
}
