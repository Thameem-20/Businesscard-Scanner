/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  webpack: (config, { isServer, webpack }) => {
    // Exclude sharp and pdfkit from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
        sharp: false,
        pdfkit: false,
      };
    } else {
      // Server-side: ensure pdfkit is not bundled (keeps font files accessible)
      // This prevents webpack from bundling pdfkit and breaking font file paths
      const originalExternals = config.externals;
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : []),
        ({ request }, callback) => {
          // Don't bundle pdfkit - use the node_modules version directly
          if (request === 'pdfkit' || request?.startsWith('pdfkit/')) {
            return callback(null, `commonjs ${request}`);
          }
          if (typeof originalExternals === 'function') {
            return originalExternals({ request }, callback);
          }
          callback();
        },
      ];
    }
    return config;
  },
}

module.exports = nextConfig
