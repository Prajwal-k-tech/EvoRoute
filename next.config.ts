import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',  // Enable static export for GitHub Pages
  basePath: process.env.NODE_ENV === 'production' ? '/EvoRoute' : '',
  images: {
    unoptimized: true,  // Required for static export
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
