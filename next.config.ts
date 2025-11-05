import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Development performance optimizations
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      "@/*": "./*",
    },
  },
  
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    // Remove React dev tools in production
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    // Optimize styled-jsx if used
    styledComponents: process.env.NODE_ENV === 'production',
  },
  
  // Enable compression and optimization
  compress: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  
  // External packages for server components
  serverExternalPackages: ['prisma', '@prisma/client'],
  
  // Enhanced experimental features for performance
  experimental: {
    // Package import optimization
    optimizePackageImports: [
      'lucide-react', 
      'react', 
      'react-dom', 
      'next-auth',
      'pusher-js'
    ],
    // Optimize CSS loading
    optimizeCss: true,
  },
  
  // Bundle analyzer setup
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config: any) => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-analysis.html',
        })
      );
      return config;
    },
  }),
  
  // Headers for PWA support and security
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Security headers for mobile apps
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Enable HSTS on production only
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
        ],
      },
    ];
  },

  // Redirect HTTP to HTTPS in production (configurable via NEXT_PUBLIC_SITE_URL)
  async redirects() {
    if (process.env.NODE_ENV !== 'production') return []
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL
    if (!siteUrl) return []
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: `${siteUrl}/:path*`,
        permanent: true,
      },
    ]
  },

  // Image optimization for mobile
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Enable bundle analyzer in development if needed
};

export default nextConfig;
