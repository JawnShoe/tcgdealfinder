import type { MetadataRoute } from "next";
import { getRebuildSiteUrl } from "@/lib/rebuild/seo/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getRebuildSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/discovery", "/listing/"],
        disallow: ["/ops", "/alerts"],
      },
    ],
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
  };
}
