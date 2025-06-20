import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GALLERY_API_ENDPOINT } from '@/lib/apiConstants';
import { StoryChapter } from '@/lib/types';
import { getTimestampInSeconds } from '@/lib/utils';
import { SingleImageClientContent } from './SingleImageClientContent'; // Nuevo componente cliente

const APP_BASE_URL = 'https://gallinga.purakasaka.com';
const PURAKASAKA_URL = 'https://purakasaka.com';

// Función de obtención de datos optimizada para el servidor
async function getImageData(id: string): Promise<StoryChapter | null> {
  try {
    // Esta URL llama a tu backend, que ahora sabe cómo manejar el parámetro `id`.
    const response = await fetch(`${GALLERY_API_ENDPOINT}?id=${id}`, {
      next: { revalidate: 3600 } // Cache por 1 hora
    });

    if (!response.ok) {
      // Si la API devuelve 404, la imagen no existe.
      if (response.status === 404) return null;
      // Para otros errores, los logueamos pero también devolvemos null.
      console.error(`[getImageData] API error fetching image ${id}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Asegurar que los campos de rating existan para evitar errores en el renderizado
    return {
      ...data,
      averageRating: data.averageRating || 0,
      ratingCount: data.ratingCount || 0,
    };
  } catch (error) {
    console.error(`[getImageData] Network or parsing error fetching image ${id}:`, error);
    return null;
  }
}

// Generación de metadatos dinámicos (se ejecuta en el servidor)
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const image = await getImageData(params.id);

  if (!image) {
    return {
      title: "Imagen no encontrada | Historias de la Gallinga",
      description: "La escena que buscas no existe o fue movida.",
    };
  }

  const pageUrl = `${APP_BASE_URL}/gallery/${image.id}`;
  const pageTitle = `Escena: "${image.prompt}" | Historias de la Gallinga`;
  const pageDescription = `Una escena de la historia colaborativa creada por ${image.creatorName || 'Anónimo'}. Prompt: "${image.prompt}". Vota y participa en el proyecto de Pura Kasaka.`;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: pageUrl,
      type: 'article',
      images: [
        {
          url: image.imageUrl,
          width: 512,
          height: 512,
          alt: `Imagen generada por IA para: ${image.prompt}`,
        },
      ],
      publishedTime: image.createdAt ? new Date(getTimestampInSeconds(image.createdAt) * 1000).toISOString() : new Date().toISOString(),
      authors: [image.creatorName || 'Anónimo'],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: [image.imageUrl],
      creator: '@PuraKasaka',
    },
  };
}

// Componente de Página (ahora un Componente de Servidor asíncrono)
export default async function SingleImagePage({ params }: { params: { id: string } }) {
  const image = await getImageData(params.id);

  // Si la imagen no se encuentra, Next.js renderizará el archivo not-found.tsx más cercano
  if (!image) {
    notFound();
  }

  // GEO: Schema JSON-LD específico para esta imagen
  const imageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "@id": `${APP_BASE_URL}/gallery/${image.id}#image`,
    "contentUrl": image.imageUrl,
    "name": image.prompt,
    "description": `Escena de la historia de Gallinga. Prompt: "${image.prompt}" por ${image.creatorName}.`,
    "author": {
      "@type": "Person",
      "name": image.creatorName,
      ...(image.creatorInstagram && { "sameAs": `https://instagram.com/${image.creatorInstagram}` })
    },
    "datePublished": image.createdAt ? new Date(getTimestampInSeconds(image.createdAt) * 1000).toISOString() : undefined,
    "isPartOf": { "@type": "WebPage", "@id": `${APP_BASE_URL}/gallery` },
    ...(image.ratingCount && image.ratingCount > 0 && image.averageRating ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": image.averageRating.toString(),
        "ratingCount": image.ratingCount.toString()
      }
    } : {})
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(imageJsonLd) }} />
      <SingleImageClientContent image={image} />
    </>
  );
}