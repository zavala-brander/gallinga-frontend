// /home/welcome/gallinga-app/gallinga-frontend/app/sitemap.ts
import { MetadataRoute } from 'next';
import { GALLERY_API_ENDPOINT, APP_BASE_URL } from '@/lib/apiConstants';
import { StoryChapter } from '@/lib/types';
import { getTimestampInSeconds } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Rutas Estáticas
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: APP_BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${APP_BASE_URL}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // 2. Rutas Dinámicas (para cada imagen en la galería)
  let dynamicImageRoutes: MetadataRoute.Sitemap = [];
  try {
    // Fetch all images to include them in the sitemap.
    // If you have thousands, you might need to paginate this fetch.
    const response = await fetch(`${GALLERY_API_ENDPOINT}?limit=500`); // Fetch a large number for sitemap
    if (response.ok) {
      const galleryData = await response.json();
      const images: StoryChapter[] = galleryData?.images || [];

      dynamicImageRoutes = images.map((image) => ({
        url: `${APP_BASE_URL}/gallery/${image.id}`, // URL canónica para cada imagen
        lastModified: image.createdAt ? new Date(getTimestampInSeconds(image.createdAt) * 1000) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      }));
    }
  } catch (error) {
    console.error("Error fetching gallery images for sitemap:", error);
  }

  return [...staticRoutes, ...dynamicImageRoutes];
}