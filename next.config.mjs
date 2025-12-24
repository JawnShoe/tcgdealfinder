import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ebayimg.com",
      },
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: false,
  disableLogger: true,
});
