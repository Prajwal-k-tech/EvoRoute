import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/EvoRoute',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
