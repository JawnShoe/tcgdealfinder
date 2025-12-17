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

export default nextConfig;
