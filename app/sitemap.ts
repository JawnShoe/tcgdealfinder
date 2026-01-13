import type { MetadataRoute } from "next";
import { buildCanonicalUrl } from "@/lib/rebuild/seo/canonical";
import { getListingSitemapEntries } from "@/lib/rebuild/seo/sitemap";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: buildCanonicalUrl("/rebuild"),
      lastModified: now,
    },
    {
      url: buildCanonicalUrl("/rebuild/discovery"),
      lastModified: now,
    },
  ];

  const listingEntries = await getListingSitemapEntries();

  return [...entries, ...listingEntries];
}
