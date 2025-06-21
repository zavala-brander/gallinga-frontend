"use client";

import { useState, MouseEvent, useEffect, useMemo, useCallback } from 'react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Lottie from "lottie-react";
import { useSwipeable } from 'react-swipeable';
import { StoryChapter } from '@/lib/types';
import { handleDownload, handleSocialShare, getTimestampInSeconds } from '@/lib/utils';
import { useLottieThemer } from '@/hooks/useLottieThemer';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StarRating } from '@/components/ui/StarRating';
import { DownloadIcon, ShareIcon, TwitterIcon, FacebookIcon, CopyIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, SparklesIcon, GalleryIcon } from '@/components/ui/icons';
import gallingaLogo from "@/assets/lottie/gallinga-logo.json";
import { RATE_IMAGE_API_ENDPOINT, APP_BASE_URL, GALLERY_API_ENDPOINT } from '@/lib/apiConstants';

interface SingleImageClientContentProps {
  image: StoryChapter;
}

export default function SingleImageClientContent({ image: initialImage }: SingleImageClientContentProps) {
  const [image, setImage] = useState(initialImage);
  const [ratingImageId, setRatingImageId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const lottieAnimationData = useLottieThemer(gallingaLogo);
  const router = useRouter();

  // Estado para la secuencia de navegación
  const [imageSequence, setImageSequence] = useState<string[]>([]);

  const creationDate = image.createdAt ? new Date(getTimestampInSeconds(image.createdAt) * 1000).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha desconocida';

  useEffect(() => {
    const fetchImageSequence = async () => {
      try {
        // Fetch a large list to build the navigation sequence.
        // Assuming default sort is newest.
        const response = await fetch(`${GALLERY_API_ENDPOINT}?limit=500`);
        if (!response.ok) throw new Error('Failed to fetch sequence');
        const data = await response.json();
        if (data && data.images) {
          const ids = data.images.map((img: StoryChapter) => img.id);
          setImageSequence(ids);
        }
      } catch (error) {
        console.error("Could not fetch image sequence for swipe navigation:", error);
      }
    };

    fetchImageSequence();
  }, []); // Fetch only once on component mount

  const { prevId, nextId } = useMemo(() => {
    const currentIndex = imageSequence.findIndex(id => id === image.id);
    if (currentIndex === -1) return { prevId: null, nextId: null };
    
    const prev = currentIndex > 0 ? imageSequence[currentIndex - 1] : null;
    const next = currentIndex < imageSequence.length - 1 ? imageSequence[currentIndex + 1] : null;
    return { prevId: prev, nextId: next };
  }, [image.id, imageSequence]);

  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    const targetId = direction === 'prev' ? prevId : nextId;
    if (targetId) router.push(`/gallery/${targetId}`);
  }, [prevId, nextId, router]);

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

  const handleSharePlatformClick = (e: MouseEvent, platform: 'twitter' | 'facebook') => {
    // Aunque no está dentro de un <Link>, es buena práctica para consistencia.
    e.stopPropagation();
    handleSocialShare(platform, `¡Mira esta Kasaka! "${image.prompt}" por ${image.creatorName}`, `${APP_BASE_URL}/gallery/${image.id}`);
  };

  const handleCopyClick = async (e: MouseEvent) => {
    e.stopPropagation();
    if (isCopied) return;

    const success = await handleSocialShare(
      'copy',
      `¡Mira esta Kasaka! "${image.prompt}" por ${image.creatorName}`,
      `${APP_BASE_URL}/gallery/${image.id}`
    );

    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500); // Reset after 2.5 seconds
    } else {
      alert("Error al copiar el enlace."); // Fallback
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigateImage('next'),
    onSwipedRight: () => navigateImage('prev'),
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

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
            <div {...swipeHandlers} className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing">
              <Image
                src={image.imageUrl}
                alt={image.prompt}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 90vw, 45vw"
              />
              {/* Botones de Navegación */}
              {prevId && (
                <Button
                  variant="ghost" size="icon" onClick={() => navigateImage('prev')}
                  className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8 md:h-10 md:w-10"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeftIcon className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              )}
              {nextId && (
                <Button
                  variant="ghost" size="icon" onClick={() => navigateImage('next')}
                  className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8 md:h-10 md:w-10"
                  aria-label="Siguiente imagen"
                >
                  <ChevronRightIcon className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              )}
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <p className="text-lg md:text-xl italic text-slate-200">"{image.prompt}"</p>
              <div>
                <p className="text-sm font-semibold text-slate-200">Creado por: {image.creatorName}</p>
                <p className="text-xs text-slate-200">Publicado el {creationDate}</p>
              </div>
              <div className="flex items-center space-x-2">
                <StarRating
                  rating={image.averageRating || 0}
                  onRate={(newRating) => handleRateImage(image.id, newRating)}
                  size={5}
                  readonly={ratingImageId === image.id}
                  showRatingCount={true}
                  ratingCount={image.ratingCount || 0}
                  filledStarClasses="text-slate-200 fill-slate-200"
                />
              </div>
              <div className="pt-4">
                <Button asChild className="w-full bg-slate-200 text-slate-50 hover:bg-slate-100 transition-colors duration-200">
                  <Link href={`/?prompt=${encodeURIComponent(image.prompt)}`}>
                    Continuar la historia desde aquí
                  </Link>
                </Button>
              </div>
              <div className="flex w-full items-center gap-4 pt-4">
                <Button onClick={() => handleDownload(image.imageUrl, image.id)} variant="outline" className="flex-1 bg-transparent border-slate-200 text-slate-200 hover:border-slate-100 hover:text-slate-100 hover:bg-transparent"><DownloadIcon className="w-4 h-4 mr-2 p-1" />Descargar</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 bg-transparent border-slate-200 text-slate-200 hover:border-slate-100 hover:text-slate-100 hover:bg-transparent"><ShareIcon className="w-4 h-4 mr-2 p-1" />Compartir</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-800 border-transparent text-slate-50">
                    <DropdownMenuItem onClick={(e) => handleSharePlatformClick(e, 'twitter')} className="hover:!bg-gray-700 focus:!bg-gray-700 cursor-pointer"><TwitterIcon className="h-4 w-4 mr-2 p-2.5 fill-current text-slate-50" />Compartir en X</DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleSharePlatformClick(e, 'facebook')} className="hover:!bg-gray-700 focus:!bg-gray-700 cursor-pointer"><FacebookIcon className="h-4 w-4 mr-2 p-2 text-slate-50" />Compartir en Facebook</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyClick} className="hover:!bg-gray-700 focus:!bg-gray-700 cursor-pointer">
                      {isCopied ? <CheckIcon className="h-4 w-4 mr-2 p-2 text-green-400" /> : <CopyIcon className="h-4 w-4 mr-2 p-2 text-slate-50" />}
                      {isCopied ? '¡Copiado!' : 'Copiar Enlace'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}