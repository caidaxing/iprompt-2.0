export const siteName = "iPrompt Studio";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://<SERVER_IP>:3000").replace(/\/$/, "");

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return new URL(path, `${siteUrl}/`).toString();
}
