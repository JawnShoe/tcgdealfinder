from pathlib import Path
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ebayimg.com',
      },
    ]
  }
};
ECHO is on.
export default nextConfig;
'''
Path('next.config.mjs').write_text(text)
