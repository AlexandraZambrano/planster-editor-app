import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async rewrites() {
    return [
      // Public profile URLs (planster.app/@username). A literal `@username` folder
      // can't be used for this — Next.js reserves `@folder` for parallel route
      // slots, which never produce a URL segment. The real page lives at
      // /profile/[username]; this rewrite exposes it at the spec'd /@username path.
      {
        source: "/@:username",
        destination: "/profile/:username",
      },
    ]
  },
}

export default withNextIntl(nextConfig)
