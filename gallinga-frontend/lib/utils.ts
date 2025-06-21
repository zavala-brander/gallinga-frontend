import { TimestampValue } from './types';
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getTimestampInSeconds = (createdAtValue: TimestampValue): number => {
  if (!createdAtValue) return 0;

  if (typeof (createdAtValue as any).seconds === 'number') {
    return (createdAtValue as any).seconds;
  }
  if (typeof (createdAtValue as any)._seconds === 'number') {
    return (createdAtValue as any)._seconds;
  }
  if (typeof createdAtValue === 'number') {
    if (createdAtValue > 1000000000000) { // Heurística para milisegundos
      return Math.floor(createdAtValue / 1000);
    }
    return createdAtValue; // Asumir segundos
  }
  if (createdAtValue instanceof Date) {
    return Math.floor(createdAtValue.getTime() / 1000);
  }
  if (typeof createdAtValue === 'string') {
    const date = new Date(createdAtValue);
    if (!isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1000);
    }
  }
  console.warn("[WARN][getTimestampInSeconds] Could not parse createdAt value:", createdAtValue);
  return 0; // Fallback
};

export const handleDownload = async (imageUrl: string, id: string): Promise<void> => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gallinga-story-${id}.png`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error al descargar la imagen:", error);
    window.open(imageUrl, '_blank'); // Fallback
  }
};

export const handleSocialShare = async (
  platform: 'twitter' | 'facebook' | 'copy',
  textToShare: string,
  pageUrl: string
): Promise<boolean> => {
  const encodedUrl = encodeURIComponent(pageUrl);
  let shareUrl = '';

  if (platform === 'twitter') {
    const encodedText = encodeURIComponent(textToShare);
    shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  } else if (platform === 'facebook') {
    // Nota: El sharer.php de Facebook ignora mayormente el texto y se basa
    // en las metaetiquetas Open Graph (OG) de la URL que se comparte.
    // Es crucial que la página en `pageUrl` tenga `og:title`, `og:description`, etc.
    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  } else if (platform === 'copy') {
    const textToCopy = `${textToShare} ${pageUrl}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      // Éxito. El componente que llama a esta función puede ahora mostrar
      // una notificación de "Copiado" en lugar de usar un alert.
      return true;
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      return false;
    }
  }

  if (shareUrl) {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
};