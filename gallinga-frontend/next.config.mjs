// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'https://europe-west1-gallinga-project.cloudfunctions.net/:path*',
      },
    ];
  },
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://*.googletagmanager.com;
      worker-src 'self' blob:;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://storage.googleapis.com https://*.googleusercontent.com https://*.giphy.com https://cdn.leonardo.ai;
      font-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      frame-src 'self' https://giphy.com;
      connect-src 'self' https://storage.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://europe-west1-gallinga-project.cloudfunctions.net https://europe-west1-branderproject.cloudfunctions.net https://api.leonardo.ai https://cloud.leonardo.ai https://va.vercel-scripts.com;
      media-src 'self';
      upgrade-insecure-requests;
    `;
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/gallinga-images-gallinga-project/**', // Sé específico con el path si es posible
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com', // Para imágenes de perfil de Google, si las usas
      },
      {
        protocol: 'https',
        hostname: '*.giphy.com', // Para los GIFs de Giphy
      },
      {
        protocol: 'https',
        hostname: 'cdn.leonardo.ai',
        port: '',
        pathname: '/users/**', // Permite imágenes de Leonardo AI desde la ruta /users/
      },
    ],
  },
};

export default nextConfig;
