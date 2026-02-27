import type { MetadataRoute } from "next";
import { siteConfig } from "@/src/lib/content/site-data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/book", "/coaches", "/courts", "/prices", "/contact", "/legal/privacy", "/legal/terms"],
        disallow: ["/admin", "/account", "/login", "/register", "/forgot-password", "/unauthorized", "/api/"],
      },
    ],
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
    host: siteConfig.siteUrl,
  };
}
