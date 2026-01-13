import type { MetadataRoute } from "next";
import { getRebuildSiteUrl } from "@/lib/rebuild/seo/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getRebuildSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/rebuild", "/rebuild/discovery", "/rebuild/listing/"],
        disallow: ["/rebuild/ops", "/rebuild/alerts"],
      },
    ],
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
  };
}
