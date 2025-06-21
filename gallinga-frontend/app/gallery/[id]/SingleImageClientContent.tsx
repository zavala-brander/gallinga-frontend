"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Lottie from "lottie-react";
import { StoryChapter } from '@/lib/types';
import { handleDownload, handleSocialShare, getTimestampInSeconds } from '@/lib/utils';
import { useLottieThemer } from '@/hooks/useLottieThemer';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'; // Asegúrate de que estos componentes estén correctamente importados
import { StarRating } from '@/components/ui/StarRating';
import { DownloadIcon, ShareIcon, TwitterIcon, FacebookIcon, CopyIcon, ChevronLeftIcon, SparklesIcon, GalleryIcon } from '@/components/ui/icons';
import gallingaLogo from "@/assets/lottie/gallinga-logo.json";
import { RATE_IMAGE_API_ENDPOINT, APP_BASE_URL } from '@/lib/apiConstants';

interface SingleImageClientContentProps {
  image: StoryChapter;
}

export default function SingleImageClientContent({ image: initialImage }: SingleImageClientContentProps) {
  const [image, setImage] = useState(initialImage);
  const [ratingImageId, setRatingImageId] = useState<string | null>(null);
  const lottieAnimationData = useLottieThemer(gallingaLogo);

  const creationDate = image.createdAt ? new Date(getTimestampInSeconds(image.createdAt) * 1000).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha desconocida';

  const handleRateImage = async (imageId: string, newRating: number): Promise<void> => {
    if (ratingImageId === imageId) return;
    setRatingImageId(imageId);
    try {
      const response = await fetch(RATE_IMAGE_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, rating: newRating }),
      });
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Error al guardar la calificación.');
      }
      const result = await response.json();
      setImage(prev => (prev ? { ...prev, averageRating: result.newAverageRating, ratingCount: result.newRatingCount } : prev));
    } catch (err: any) {
      console.error("Error al calificar la imagen:", err.message);
    } finally {
      setRatingImageId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-30 flex justify-between items-center p-2 md:p-4 dark:bg-black/50">
        <a href="https://purakasaka.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 hover:scale-110 active:scale-95 transition-transform duration-150">
          <Lottie animationData={lottieAnimationData} loop={true} />
        </a>
        <Link href="/gallery" className="text-slate-200 dark:text-slate-200 hover:text-slate-600 dark:hover:text-primary-light hover:scale-110 transition-transform rounded-md focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Volver a la galería">
          <Button variant="ghost" size="icon" title="Galería">
            <GalleryIcon className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/gallery" className="inline-flex items-center text-sm text-slate-400 hover:text-primary transition-colors" aria-label="Volver a la galería">
              <ChevronLeftIcon className="h-4 w-4 mr-2" />
              Volver a la Galería
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={image.imageUrl}
                alt={image.prompt}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 90vw, 45vw"
              />
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <p className="text-lg md:text-xl italic text-slate-200">"{image.prompt}"</p>
              <div>
                <p className="text-sm font-semibold text-slate-200">Creado por: {image.creatorName}</p>
                <p className="text-xs text-slate-200">Publicado el {creationDate}</p>
              </div>
              <div className="flex items-center space-x-2">
                <StarRating rating={image.averageRating || 0} onRate={(newRating) => handleRateImage(image.id, newRating)} size={5} readonly={ratingImageId === image.id} showRatingCount={true} ratingCount={image.ratingCount || 0} />
              </div>
              <div className="flex flex-wrap gap-2 pt-4">
                <Button onClick={() => handleDownload(image.imageUrl, image.id)} variant="outline" className="flex-grow md:flex-grow-0"><DownloadIcon className="h-4 w-4 mr-2 p-1 text-slate-200" />Descargar</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-grow md:flex-grow-0"><ShareIcon className="h-4 w-4 mr-2 p-1 text-slate-200" />Compartir</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-800 border-transparent text-slate-50">
                    <DropdownMenuItem onClick={() => handleSocialShare('twitter', `¡Mira esta Kasaka! "${image.prompt}" por ${image.creatorName}`, `${APP_BASE_URL}/gallery/${image.id}`)}><TwitterIcon className="h-4 w-4 mr-2 p-1" />Compartir en X</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSocialShare('facebook', `¡Mira esta Kasaka! "${image.prompt}" por ${image.creatorName}`, `${APP_BASE_URL}/gallery/${image.id}`)}><FacebookIcon className="h-4 w-4 mr-2 p-1" />Compartir en Facebook</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSocialShare('copy', `¡Mira esta Kasaka! "${image.prompt}" por ${image.creatorName}`, `${APP_BASE_URL}/gallery/${image.id}`)}><CopyIcon className="h-4 w-4 mr-2 p-1" />Copiar Enlace</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="pt-4">
                <Link href={`/?prompt=${encodeURIComponent(image.prompt)}`} passHref>
                  <Button className="w-full bg-slate-50 hover:bg-primary/90 text-slate-200"><SparklesIcon className="h-4 w-4 mr-2" />Continuar la historia desde aquí</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}