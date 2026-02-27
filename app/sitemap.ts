import type { MetadataRoute } from "next";
import { siteConfig } from "@/src/lib/content/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/book",
    "/coaches",
    "/courts",
    "/prices",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
  ];

  return routes.map((path) => ({
    url: `${siteConfig.siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/book" ? 0.9 : 0.7,
  }));
}
