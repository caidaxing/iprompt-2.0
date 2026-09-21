import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/explore", "/case/", "/templates"],
      disallow: ["/api/", "/admin", "/favorites", "/login", "/match", "/me"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
