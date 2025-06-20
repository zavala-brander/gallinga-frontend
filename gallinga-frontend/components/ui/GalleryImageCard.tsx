"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DownloadIcon, ShareIcon, TwitterIcon, FacebookIcon, CopyIcon, UserIcon, PurakasakaIcon } from "@/components/ui/icons";
import { StarRating } from "@/components/ui/StarRating";
import { ImageSerialNumber } from "@/components/ui/ImageSerialNumber";
import { StoryChapter as GalleryImage } from '@/lib/types';
import { handleDownload, handleSocialShare } from '@/lib/utils';

interface GalleryImageCardProps {
  img: GalleryImage;
  index: number; // Para la prop priority de Next/Image
  stableSortedImagesForSerialNumber: GalleryImage[];
  onImageClick: (image: GalleryImage) => void;
  onRate: (imageId: string, rating: number) => void;
  ratingImageId: string | null;
}

export const GalleryImageCard: React.FC<GalleryImageCardProps> = ({ 
  img, 
  index, 
  stableSortedImagesForSerialNumber, 
  onImageClick,
  onRate,
  ratingImageId 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const globalIndex = stableSortedImagesForSerialNumber.findIndex(sImg => sImg.id === img.id);
  const serial = globalIndex !== -1 ? `01-${String(globalIndex + 1).padStart(4, '0')}` : null;

  return (
    <div
      className="bg-black dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden cursor-pointer group flex flex-col hover:shadow-xl transition-shadow duration-300 animate__animated animate__fadeInUp animate__faster"
      onClick={() => onImageClick(img)}
      style={{ animationDelay: `${index * 50}ms` }} // Staggered animation
    >
      <div className="aspect-[3/2] w-full overflow-hidden relative rounded-t-md group">
        {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-gray-700 animate-pulse">
                {/* Podrías poner un spinner pequeño aquí o dejarlo como un placeholder de color */}
            </div>
        )}
        <Image
          src={img.imageUrl}
          alt={img.prompt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 16vw"
          className={`object-cover group-hover:scale-105 transition-all duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          priority={index < 12} // Prioridad a las primeras ~12 imágenes para LCP
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)} // Para ocultar placeholder si hay error
        />
        <ImageSerialNumber serialNumber={serial} className="top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 bg-slate-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-5"></div>
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center space-x-2">
          <Button variant="outline" size="icon" className="h-8 w-8 bg-black/200 hover:bg-black/200 border-slate-700 hover:border-slate-200 text-slate-700 hover:text-white hover:scale-110 active:scale-95 transition-transform" onClick={(e) => { e.stopPropagation(); handleDownload(img.imageUrl, img.id); }} title="Descargar imagen">
            <DownloadIcon className="h-2 w-2 p-2" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-black/200 hover:bg-black/20 border-slate-700 hover:border-slate-200 text-slate-700 hover:text-white hover:scale-110 active:scale-95 transition-transform" onClick={(e) => e.stopPropagation()} title="Compartir historia">
                <ShareIcon className="h-2 w-2 p-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="bg-gray-600 border-transparent text-slate-200">
              <DropdownMenuItem onClick={() => handleSocialShare('twitter', img.prompt, "https://purakasaka.com/gallinga-story")} className="hover:!bg-gray-700"><TwitterIcon className="h-4 w-4 p-2.5 mr-2 fill-current text-slate-200"/>Compartir en X</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSocialShare('facebook', img.prompt, "https://purakasaka.com/gallinga-story")} className="hover:!bg-gray-700"><FacebookIcon className="h-4 p-2 w-4 mr-2 fill-current text-slate-200"/>Compartir en Facebook</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSocialShare('copy', img.prompt, "https://purakasaka.com/gallinga-story")} className="hover:!bg-gray-700"><CopyIcon className="h-4 w-4 p-2 mr-2  text-slate-200"/>Copiar Enlace</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3 flex-grow flex flex-col justify-between">
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold text-slate-200 dark:text-slate-200 line-clamp-1">{img.creatorName}</h3>
          <p className="text-slate-700 dark:text-slate-700 line-clamp-2 text-sm">{img.prompt}</p>
        </div>
        <div className="mt-2">
          <StarRating rating={img.averageRating || 0} onRate={(newRating) => onRate(img.id, newRating)} size={4} readonly={ratingImageId === img.id} className="justify-start" showRatingCount={true} ratingCount={img.ratingCount || 0} ratingCountClasses="text-xs text-slate-500 dark:text-slate-400 ml-1.5" />
        </div>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-gray-700">
          {img.creatorInstagram ? (<div className="flex items-center gap-1.5 text-xs text-slate-200 dark:text-slate-200"><UserIcon className="w-3.5 h-3.5"/><a href={`https://instagram.com/${img.creatorInstagram}`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary dark:hover:text-primary-light transition-colors">@{img.creatorInstagram}</a></div>) : <div />}
          <a href="https://purakasaka.com" target="_blank" rel="noopener noreferrer" title="Visita Purakasaka.com" className="text-slate-200 dark:text-slate-200 hover:text-primary dark:hover:text-primary-light transition-colors"><PurakasakaIcon className="w-5 h-5" /></a>
        </div>
      </div>
    </div>
  );
};