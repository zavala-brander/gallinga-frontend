"use client";
import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react"; // Añadido Suspense
import { Metadata } from 'next';
import { useSearchParams, useRouter as useNextRouter } from 'next/navigation';
import Lottie from "lottie-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // prettier-ignore
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"; // prettier-ignore
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"; // prettier-ignore
import { LoadingSpinner, GalleryIcon, PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, ChevronLeftIcon, ChevronRightIcon, InfoIcon, UpArrow, EggIcon, DownloadIcon, ShareIcon, TwitterIcon, FacebookIcon, CopyIcon, CheckIcon, StarIcon, CancelIcon, ApproveIcon } from "@/components/ui/icons";
import gallingaLogo from "@/assets/lottie/gallinga-logo.json"; // Lottie animation data
import { StarRating } from "@/components/ui/StarRating";
import { useSwipeable } from "react-swipeable";
import { useLottieThemer } from '@/hooks/useLottieThemer';
import { ImageSerialNumber } from "@/components/ui/ImageSerialNumber";
import { StoryChapter, PendingApprovalImage } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion'; // Para animaciones en botones
import { LoadingGiphy } from '@/components/ui/LoadingGiphy';
import {
  APP_BASE_URL,
  GALLERY_API_ENDPOINT,
  GENERATE_IMAGE_ENDPOINT,
  APPROVE_ENDPOINT,
  DELETE_ENDPOINT,
  STATUS_ENDPOINT_BASE,
  RATE_IMAGE_API_ENDPOINT,
  PURAKASAKA_URL
} from '@/lib/apiConstants';
import { instructionsContent, InstructionsLang } from '@/assets/instructionsContent'; // Importar el contenido de las instrucciones
import { getTimestampInSeconds, handleDownload, handleSocialShare } from '@/lib/utils';

// Nuevo componente hijo para manejar la lógica de searchParams
function PromptHandler({ setPromptForParent }: { setPromptForParent: (prompt: string) => void }) {
  const searchParams = useSearchParams();
  const nextRouter = useNextRouter();

  useEffect(() => {
    const promptFromQuery = searchParams.get('prompt');
    if (promptFromQuery) {
      setPromptForParent(decodeURIComponent(promptFromQuery));
      // Limpiar el query param de la URL después de leerlo
      // Esto solo funciona en el cliente, lo cual está bien para este caso.
      const currentPath = window.location.pathname;
      nextRouter.replace(currentPath, { scroll: false });
    }
  }, [searchParams, nextRouter, setPromptForParent]);

  return null; // Este componente no renderiza UI directamente
}

const REQUEST_LIMIT = 3; // Default value, matches the GALLINGA_REQUEST_LIMIT env var

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const lottieAnimationData = useLottieThemer(gallingaLogo);
  const [creatorName, setCreatorName] = useState("");
  const [creatorInstagram, setCreatorInstagram] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [story, setStory] = useState<StoryChapter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [pendingApprovalImage, setPendingApprovalImage] = useState<PendingApprovalImage | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [ratingImageId, setRatingImageId] = useState<string | null>(null);
  const [isCurrentImageLoading, setIsCurrentImageLoading] = useState(true); // Estado para la carga de la imagen actual del carrusel
  const [prevImageUrlForEffect, setPrevImageUrlForEffect] = useState<string | null>(null); // Para el efecto de carga
  const [instructionsLang, setInstructionsLang] = useState<InstructionsLang>('es'); // Estado para el idioma del popup de instrucciones
  const [isCopied, setIsCopied] = useState(false);

  const playbackInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true); 
        setError(null); 
        const response = await fetch(GALLERY_API_ENDPOINT);
        if (!response.ok) { 
          const errorText = await response.text().catch(() => "No se pudo leer el cuerpo del error");
          throw new Error(`API Error: ${response.status}`);
        }
        const dataFromApi = await response.json();

        let imagesToSet: StoryChapter[] = [];
        if (dataFromApi && dataFromApi.images && Array.isArray(dataFromApi.images)) {
          imagesToSet = dataFromApi.images;
        } else if (Array.isArray(dataFromApi)) { 
          imagesToSet = dataFromApi;
        } else {
          setStory([]); 
          setError('Error: Formato de datos inesperado de la API.'); 
          setIsLoading(false);
          return;
        }

        if (imagesToSet.length > 0) {
          const augmentedData: StoryChapter[] = imagesToSet.map(chapter => ({
            ...chapter,
            averageRating: chapter.averageRating || 0,
            ratingCount: chapter.ratingCount || 0,
          }));
          setStory(augmentedData);
          setCurrentIndex(0);
        } else {
          setStory([]);
        }
      } catch (err: any) { 
        setError(err.message || 'Error al cargar la historia.');
        setStory([]); 
      } finally {
        setIsLoading(false); 
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    const storedAttempts = localStorage.getItem('gallingaAttempts');
    if (storedAttempts !== null) setRemainingAttempts(parseInt(storedAttempts, 10));
    else setRemainingAttempts(REQUEST_LIMIT);
  }, []);

  const stableSortedStoryForSerialNumber = useMemo(() => {
    return [...story].sort((a, b) => getTimestampInSeconds(a.createdAt) - getTimestampInSeconds(b.createdAt));
  }, [story]);

  useEffect(() => {
    const currentImageUrl = story[currentIndex]?.imageUrl;

    if (currentImageUrl && currentImageUrl !== prevImageUrlForEffect) {
      // console.log(`[EFFECT image change] URL cambió de ${prevImageUrlForEffect} a ${currentImageUrl}. Setting loading to true.`);
      setIsCurrentImageLoading(true);
      setPrevImageUrlForEffect(currentImageUrl);
    } else if (!currentImageUrl && prevImageUrlForEffect) {
      // La imagen actual no existe (ej. historia vacía), pero había una antes.
      // console.log(`[EFFECT image change] URL se volvió nula. Previa era ${prevImageUrlForEffect}. Setting loading to false.`);
      setIsCurrentImageLoading(false); 
      setPrevImageUrlForEffect(null);
    }
    // Si currentImageUrl === prevImageUrlForEffect, no hacemos nada aquí.
    // El estado de carga se maneja por onLoad en ese caso.
  }, [currentIndex, story, prevImageUrlForEffect]);


  const handlePlayback = useCallback(() => {
    if (isPlaying) {
      if (playbackInterval.current) clearInterval(playbackInterval.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playbackInterval.current = setInterval(() => {
        setCurrentIndex(prev => (prev === 0 ? story.length - 1 : prev - 1));
      }, 4000);
    }
  }, [isPlaying, story.length]);
  
  useEffect(() => {
    return () => { if (playbackInterval.current) clearInterval(playbackInterval.current); };
  }, []);

  const navigate = (direction: 'next' | 'prev' | 'first' | 'last') => {
    setIsPlaying(false);
    if (playbackInterval.current) clearInterval(playbackInterval.current);
    if (story.length === 0) return;
    if (direction === 'next') setCurrentIndex(prev => (prev > 0 ? prev - 1 : 0));
    if (direction === 'prev') setCurrentIndex(prev => (prev < story.length - 1 ? prev + 1 : story.length - 1));
    if (direction === 'first') setCurrentIndex(story.length - 1);
    if (direction === 'last') setCurrentIndex(0);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading || !prompt.trim() || (remainingAttempts !== null && remainingAttempts <= 0)) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(GENERATE_IMAGE_ENDPOINT, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ prompt, creatorName, creatorInstagram }) 
      });
      const result = await response.json();

      if (result.remainingAttempts !== undefined) {
        setRemainingAttempts(result.remainingAttempts);
        localStorage.setItem('gallingaAttempts', result.remainingAttempts.toString());
      }

      if (!response.ok) throw new Error(result.error || 'Algo salió mal.');

      const jobId = result.jobId;
      if (jobId) {
        pollJobStatus(jobId, prompt, creatorName, creatorInstagram);
      } else {
        throw new Error("No se recibió jobId para iniciar el sondeo de la imagen.");
      }

    } catch (err: any) { 
      setError(err.message); 
      setIsLoading(false);
    }
  };

  const pollJobStatus = async (jobId: string, originalPrompt: string, originalCreatorName: string, originalCreatorInstagram?: string) => {
    const STATUS_ENDPOINT = `${STATUS_ENDPOINT_BASE}?jobId=${jobId}`;
    const intervalTime = 5000;
    const maxAttempts = 36;
    let attempts = 0;

    const intervalId = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(intervalId);
        setError("La generación de la imagen está tardando demasiado. Por favor, intenta de nuevo más tarde.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(STATUS_ENDPOINT);
        const statusResult = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            clearInterval(intervalId);
            setError(statusResult.error || "El trabajo de generación no fue encontrado.");
            setIsLoading(false);
          } else {
            console.warn("[Polling] Error temporal al sondear el estado del trabajo, reintentando...", statusResult.error);
          }
          return;
        }

        if (statusResult.status === 'COMPLETE' && statusResult.imageUrlFromLeonardo) {
          clearInterval(intervalId);
          setPendingApprovalImage({
            leonardoGenerationId: jobId,
            imageUrlFromLeonardo: statusResult.imageUrlFromLeonardo,
            prompt: originalPrompt,
            creatorName: originalCreatorName,
            creatorInstagram: originalCreatorInstagram
          });
          setIsLoading(false);
        } else if (statusResult.status === 'FAILED') {
          clearInterval(intervalId);
          setError(statusResult.failureReason || "La generación de la imagen falló.");
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("[Polling] Error durante el sondeo:", err.message);
      }
    }, intervalTime);
  };

  const handleApproveImage = async () => {
    if (!pendingApprovalImage) return;
    setIsProcessingAction(true);
    setError(null);
    try {
      const response = await fetch(APPROVE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrlFromLeonardo: pendingApprovalImage.imageUrlFromLeonardo,
          prompt: pendingApprovalImage.prompt,
          creatorName: pendingApprovalImage.creatorName,
          creatorInstagram: pendingApprovalImage.creatorInstagram,
          leonardoGenerationId: pendingApprovalImage.leonardoGenerationId,
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al aprobar la imagen.');

      const newChapter: StoryChapter = {
        id: result.firestoreId, 
        imageUrl: result.finalImageUrl, 
        prompt: pendingApprovalImage.prompt,
        creatorName: pendingApprovalImage.creatorName,
        creatorInstagram: pendingApprovalImage.creatorInstagram,
        createdAt: new Date(),
        averageRating: 0,
        ratingCount: 0,
      };
      setStory(prevStory => [newChapter, ...prevStory]);
      setCurrentIndex(0);
      setPrompt(""); 
    } catch (err: any) { setError(err.message); } 
    finally { 
      setIsProcessingAction(false);
      setPendingApprovalImage(null);
    }
  };

  const handleDeleteImage = async () => {
    if (!pendingApprovalImage) return;
    setIsProcessingAction(true);
    setError(null);
    try {
      const response = await fetch(DELETE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leonardoGenerationId: pendingApprovalImage.leonardoGenerationId,
        })
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({error: 'Error al eliminar la imagen.'}));
        throw new Error(result.error || 'Error al eliminar la imagen.');
      }
      setPrompt("");
    } catch (err: any) { setError(err.message); } 
    finally { 
      setIsProcessingAction(false);
      setPendingApprovalImage(null);
    }
  };

  const handleRateImage = async (chapterId: string, newRating: number): Promise<void> => {
    if (ratingImageId === chapterId) return;
    setRatingImageId(chapterId);
    try {
      const response = await fetch(RATE_IMAGE_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: chapterId, rating: newRating }),
      });
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Error al guardar la calificación.');
      }
      const result = await response.json();
      setStory(prevStory =>
        prevStory.map(chapter =>
          chapter.id === chapterId 
            ? { ...chapter, averageRating: result.newAverageRating, ratingCount: result.newRatingCount }
            : chapter
        )
      );
    } catch (err: any) {
      console.error("Error al calificar la imagen:", err.message);
    } finally {
      setRatingImageId(null);
    }
  };

  const currentChapter = story.length > 0 ? story[currentIndex] : null;
  const currentChapterGlobalIndex = currentChapter 
    ? stableSortedStoryForSerialNumber.findIndex((s: StoryChapter) => s.id === currentChapter.id) 
    : -1;
  const currentSerialNumber = currentChapterGlobalIndex !== -1 ? `01-${String(currentChapterGlobalIndex + 1).padStart(4, '0')}` : null;

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigate('next'),
    onSwipedRight: () => navigate('prev'),
    trackMouse: false,
    preventScrollOnSwipe: true,
  });

  // if (currentChapter) {
  //   console.log(`[RENDER] isCurrentImageLoading: ${isCurrentImageLoading}, currentChapter URL: ${currentChapter.imageUrl}`);
  // }

  const handleSharePlatformClick = (e: React.MouseEvent, platform: 'twitter' | 'facebook') => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentChapter) return;
    handleSocialShare(platform, `¡Mira mi Kasaka! "${currentChapter.prompt}" por ${currentChapter.creatorName} en Historias de la Gallinga.`, `${APP_BASE_URL}/gallery/${currentChapter.id}`);
  };

  const handleCopyClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Buena práctica para consistencia
    e.stopPropagation(); 
    if (isCopied || !currentChapter) return;

    const success = await handleSocialShare(
      'copy',
      `¡Mira mi Kasaka! "${currentChapter.prompt}" por ${currentChapter.creatorName} en Historias de la Gallinga.`,
      `${APP_BASE_URL}/gallery/${currentChapter.id}`
    );

    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500); // Reset after 2.5 seconds
    } else {
      alert("Error al copiar el enlace."); // Fallback for rare cases
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentChapter) return;
    handleDownload(currentChapter.imageUrl, currentChapter.id);
  };

  return (
    <>
      {/* GEO: Schemas para WebApplication, WebPage y FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "@id": `${APP_BASE_URL}#app`,
          "name": "Historias de la Gallinga",
          "alternateName": "Gallinga App",
          "url": APP_BASE_URL,
          "applicationCategory": ["GameApplication", "EntertainmentApplication", "SoftwareApplication"],
          "operatingSystem": "Web",
          "description": "Es una aplicación web diseñada como un motor de engagement comunitario. Los usuarios continúan una historia en curso, proponiendo texto que la IA interpreta para generar una imagen.",
          "featureList": [
              "Generación de imágenes por IA a partir de prompts de texto.",
            "Creación colaborativa de historias visuales.", // Keep as is
            "Galería de escenas creadas por la comunidad.", // Keep as is
            "Sistema de calificación de imágenes."
          ],
            "screenshot": `${APP_BASE_URL}/assets/images/screenshot-gallinga.jpg`,
          "creator": {
            "@type": "Organization",
            "@id": `${PURAKASAKA_URL}#organization`
          },
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "url": APP_BASE_URL, // Canonical URL for the homepage
          "name": "Jugar a Historias de la Gallinga",
          "description": "Página principal para jugar y crear nuevas escenas en la historia colaborativa de Brujilda la Gallina.",
          "isPartOf": { "@type": "WebSite", "@id": APP_BASE_URL }
        }) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "¿Qué es Historias de la Gallinga?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "\"Historias de la Gallinga\" es un juego web gratuito y colaborativo desarrollado por Pura Kasaka. En él, los usuarios continúan una historia de forma colectiva, escribiendo el siguiente fragmento narrativo, que luego una IA interpreta para generar una imagen única."
              }
            },
            {
              "@type": "Question",
              "name": "¿Cómo funciona la app de Brujilda la Gallina?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Para jugar, primero observas la última escena creada por otro usuario. Luego, escribes un texto breve para continuar la historia. Al enviarlo, una IA genera una nueva imagen basada en tu texto, y tu contribución se añade a la galería. Puedes firmar tu creación con tu nombre y un perfil social si lo deseas."
              }
            }
          ]
        }) }}
      />
      {/* Envolvemos PromptHandler con Suspense */}
      <Suspense fallback={null}> {/* Puedes poner un spinner o null como fallback */}
        <PromptHandler setPromptForParent={setPrompt} />
      </Suspense>
      <div className="flex flex-col h-screen bg-background text-foreground"> {/* Restaurado con bg-background y text-foreground semánticos */}
      <header className="fixed top-0 left-0 right-0 z-30 flex justify-between items-center p-2 md:p-4 dark:bg-black/50 ">
        <a href="https://purakasaka.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 hover:scale-110 active:scale-95 transition-transform duration-150">
          <Lottie animationData={lottieAnimationData} loop={true} />
        </a>
        <div className="flex items-center gap-2 ">
            <Link href="/gallery">
              <Button variant="ghost" size="icon" title="Galería" className="text-slate-200 dark:text-slate-200 hover:text-slate-600 dark:hover:text-primary-light hover:scale-110 transition-transform rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                <GalleryIcon className="h-5 w-5 "/>
              </Button>
            </Link>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4 pt-20 pb-60 md:pb-52">
          {isLoading && story.length === 0 ? ( <LoadingGiphy title="loading animation" className="w-48 h-48 relative mb-4" /> ) : currentChapter ? (
              <div className="w-full max-w-md md:max-w-sm text-center space-y-3" >
                  <div {...swipeHandlers} className="relative aspect-square bg-slate-200 dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden group cursor-grab active:cursor-grabbing" tabIndex={0}>
                      <div className="absolute top-2 left-2 right-2 z-10 flex justify-between items-start">
                        <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-auto">
                          <StarRating
                            rating={currentChapter.averageRating || 0}
                            onRate={(newRating) => handleRateImage(currentChapter.id, newRating)}
                            size={5}
                            readonly={ratingImageId === currentChapter.id}
                          />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex flex-col items-end space-y-1 pointer-events-auto">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleDownloadClick}
                          title="Descargar imagen"
                          className="h-9 w-9 bg-slate-200 dark:bg-gray-800 hover:bg-slate-100 border-slate-400 hover:border-slate-200 text-slate-800 dark:text-slate-200 hover:text-white hover:scale-110 active:scale-95 transition-transform duration-150"
                        >
                          <DownloadIcon className="h-4 w-4 p-2" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                                                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              title="Compartir historia"
                              className="h-9 w-9 bg-slate-200 dark:bg-gray-800 hover:bg-slate-100 border-slate-400 hover:border-slate-200 text-slate-800 dark:text-slate-200 hover:text-white hover:scale-110 active:scale-95 transition-transform duration-150"
                            >
                              <ShareIcon className="h-4 w-4 p-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="bg-gray-800 border-transparent text-slate-50" >
                            <DropdownMenuItem onClick={(e) => handleSharePlatformClick(e, 'twitter')} className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"><TwitterIcon className="h-4 w-4 mr-2 p-2.5 fill-current text-slate-50" />Compartir en X</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleSharePlatformClick(e, 'facebook')} className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"><FacebookIcon className="h-4 w-4 mr-2 p-2 text-slate-50" />Compartir en Facebook</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopyClick} className="hover:bg-gray-700 focus:bg-gray-700 cursor-pointer">
                              {isCopied ? <CheckIcon className="h-4 w-4 mr-2 p-2 text-green-400"/> : <CopyIcon className="h-4 w-4 mr-2 p-2 text-slate-50"/>}
                              {isCopied ? '¡Copiado!' : 'Copiar Enlace'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      </div>
                      <ImageSerialNumber 
                        serialNumber={currentSerialNumber}
                        className="bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                      />
                      {isCurrentImageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-gray-800"><LoadingGiphy title="loading animation" className="w-32 h-32 relative" /></div>
                      )}
                      <Image src={currentChapter.imageUrl} alt={currentChapter.prompt} fill 
                        key={currentChapter.imageUrl} // Añadir key para forzar re-evaluación si la URL cambia
                        className={`object-cover pointer-events-none transition-opacity duration-500 ease-in-out ${isCurrentImageLoading ? 'opacity-0' : 'opacity-100'}`} 
                        priority sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
                        onLoad={() => {
                          // console.log(`[HomePage Image] onLoad triggered for: ${currentChapter?.imageUrl}. Setting isCurrentImageLoading to false.`);
                          setIsCurrentImageLoading(false);
                        }}
                        onError={(e) => {
                          console.error(`[HomePage Image] onError triggered for: ${currentChapter?.imageUrl}`, e);
                          setIsCurrentImageLoading(false); // También ocultar Giphy si hay error en la carga de la imagen
                        }}
                      />
                  </div>
                  <div className=" dark:bg-black/50 p-3 text-slate-300 rounded-lg backdrop-blur-sm">
                      <p className="text-sm italic">"{currentChapter.prompt}"</p>
                      <p className="text-xs font-semibold mt-1 opacity-70">por {currentChapter.creatorName}</p>
                  </div>
                  <div className="flex justify-center items-center gap-2 md:gap-4 text-slate-200 dark:text-slate-400">
                      <Button variant="ghost" size="icon" onClick={() => navigate('last')} title="Retrocede" className="hover:scale-110 active:scale-95 transition-transform duration-150"><SkipBackIcon className="w-5 h-5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate('prev')} title="Retrocede" className="hover:scale-110 active:scale-95 transition-transform duration-150"><ChevronLeftIcon className="w-6 h-6" /></Button>
                      <Button variant="ghost" size="icon" className="w-12 h-12 hover:scale-110 active:scale-95 transition-transform duration-150" onClick={handlePlayback} title={isPlaying ? "Pausar" : "Reproducir"}>{isPlaying ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}</Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate('next')} title="Adelanta" className="hover:scale-110 active:scale-95 transition-transform duration-150"><ChevronRightIcon className="w-6 h-6" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate('first')} title="Adelanta" className="hover:scale-110 active:scale-95 transition-transform duration-150"><SkipForwardIcon className="w-5 h-5" /></Button>
                  </div>
              </div>
          ) : ( <LoadingSpinner className="animate-spin w-12 h-12"/> )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 p-4">
        <div className="w-full max-w-2xl mx-auto space-y-2">
          {remainingAttempts !== null && (
            <div className="flex items-center justify-start text-xs text-slate-200 dark:text-slate-400 mb-2 px-2">
              <EggIcon className="h-4 w-4 mr-1" /> {/* Asegúrate de que EggIcon esté importado */}
              <span>{remainingAttempts} {remainingAttempts === 1 ? "huevo / egg" : "huevos / eggs"}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="p-2 bg-white text-slate-50 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 space-y-2">
            <Textarea placeholder="Continúa la historia (tu Kasaka)... / Continue the story (your Kasaka)..." value={prompt} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)} className="w-full p-2 text-base bg-transparent border-none focus:ring-0 focus:outline-none resize-none" rows={2} required minLength={10} maxLength={500} disabled={isLoading}/>
            <div className="flex items-center gap-2 border-t  border-slate-200 dark:border-gray-700 pt-2">
              <Input placeholder="Tu nombre / Your name" value={creatorName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreatorName(e.target.value)} required disabled={isLoading} className="bg-slate-100 dark:bg-gray-800 border-none h-9"/>
              <Input placeholder="@usuario.instagram (opcional)" value={creatorInstagram} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreatorInstagram(e.target.value)} disabled={isLoading} className="bg-slate-100 dark:bg-gray-800 border-none h-9"/>
              <Button
                type="submit" 
                size="icon" 
                className="h-9 w-12 flex-shrink-0 
                           enabled:hover:bg-primary/90 enabled:hover:scale-105 
                           enabled:active:bg-primary/80 enabled:active:scale-95 
                           transition-all duration-150 relative overflow-hidden" // Añadido relative y overflow-hidden
                disabled={isLoading || !prompt.trim() || (remainingAttempts !== null && remainingAttempts <= 0)}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isLoading ? (
                    <motion.div key="spinner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                      <LoadingSpinner className="animate-spin h-4 w-4" />
                    </motion.div>
                  ) : (
                    <motion.div key="arrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                      <UpArrow className="w-4 h-4 p-0.5"/>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </form>
          {error && <p className="text-center text-red-500 text-sm mt-1 animate__animated animate__fadeInUp animate__faster">{error === 'errorTooLong' ? 'La generación de la imagen está tardando demasiado. Por favor, intenta de nuevo más tarde.' : error === 'errorJobNotFound' ? 'El trabajo de generación no fue encontrado.' : error === 'errorGeneric' ? 'Algo salió mal.' : error}</p>}
          <div className="text-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:bg-slate-500/70 active:bg-slate-50/20 transition-colors">
                  <InfoIcon className="h-3 w-3 mr-1 p-1"/>
                  Leer Info / Read Info
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md text-blue-600 dark:text-blue-600  bg-slate-700 dark:bg-gray-900" showCloseButton={true}> {/* Asegúrate de que showCloseButton sea true si quieres el botón de cerrar por defecto */}
                <DialogHeader className="items-center">
                  <div className="w-15 h-15" id="instructions-dialog-title">
                    <Lottie animationData={lottieAnimationData} loop={true} />
                  </div>
                  <DialogTitle>{instructionsContent[instructionsLang].title}</DialogTitle>
                </DialogHeader>
                <div className="text-sm space-y-4 p-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-800">
                  {instructionsContent[instructionsLang].steps.map((step) => (
                    // Modificación para incluir el icono
                    // Se envuelve en una función para poder declarar IconComponent
                    (() => {
                      const IconComponent = step.icon;
                      return (
                        <div key={step.id}> {/* El space-y-4 del div padre maneja el espaciado entre steps */}
                          {step.heading && (
                            <div className="flex items-center mb-1"> {/* Contenedor para alinear icono y título */}
                              {IconComponent && (
                                <IconComponent className="h-5 w-5 mr-2 text-blue-700 dark:text-blue-600" /> /* Icono */
                              )}
                              <h4 className="font-semibold text-blue-700 dark:text-blue-700 mb-0"> {/* Título, mb-0 porque el div padre tiene mb-1 */}
                                {step.heading}
                              </h4>
                            </div>
                          )}
                          <p id={`instructions-step-${step.id}-description`} className={`text-blue-600 dark:text-blue-600 ${IconComponent && step.heading ? 'ml-7' : ''}`}> {/* Texto con indentación condicional */}
                            {step.text}
                          </p>
                        </div>
                      );
                    })()
                  ))}
                  {instructionsContent[instructionsLang].outro && (
                    <p className="mt-6 pt-3 border-0 border-slate-600/0 dark:border-gray-700 font-semibold text-center text-blue-600 dark:text-blue-600">
                      {instructionsContent[instructionsLang].outro}
                    </p>
                  )}
                </div>
                <DialogFooter className="flex justify-center sm:justify-center mt-4">
                  <div className="flex gap-2 ">
                    <Button
                      onClick={() => setInstructionsLang('es')}
                      className={`text-xs px-3 h-8 rounded-md transition-colors duration-150 ease-in-out
                        ${instructionsLang === 'es'
                          ? 'bg-green-600 text-blue-600 hover:bg-green-600  focus-visible:ring-blue-600' // Estilo activo
                          : 'bg-transparent border border-blue-600 text-blue-600 hover:bg-green-600 hover:text-blue-600 focus-visible:ring-blue-600' // Estilo inactivo
                        }`
                      }
                    >
                      Español
                    </Button>
                    <Button
                      onClick={() => setInstructionsLang('en')}
                      className={`text-xs px-3 h-8 rounded-md transition-colors duration-150 ease-in-out
                        ${instructionsLang === 'en'
                          ? 'bg-green-600 text-blue-600 hover:bg-green-600  focus-visible:ring-blue-600' // Estilo activo
                          : 'bg-transparent border border-blue-600 text-blue-600 hover:bg-green-600 hover:text-blue-600 focus-visible:ring-blue-600' // Estilo inactivo
                        }`
                      }
                    >
                      English
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </footer>

      {pendingApprovalImage && (
        <Dialog open={!!pendingApprovalImage} onOpenChange={(isOpen) => { if (!isOpen && !isProcessingAction) setPendingApprovalImage(null); }} aria-labelledby="approval-dialog-title" aria-describedby="approval-dialog-description">
          <DialogContent className="bg-white dark:bg-gray-900 data-[state=open]:animate__animated data-[state=open]:animate__zoomIn data-[state=open]:animate__faster" showCloseButton={false}>
            {/* Añadir DialogHeader, DialogTitle y DialogDescription para accesibilidad */}
            <DialogHeader>
              <DialogTitle id="approval-dialog-title">Confirmar / Confirm</DialogTitle>
              <DialogDescription id="approval-dialog-description">
                {pendingApprovalImage.prompt
                  ? `Revisa la imagen generada para: "${pendingApprovalImage.prompt.substring(0, 50)}${pendingApprovalImage.prompt.length > 50 ? '...' : ''}" y aprueba o elimina.`
                  : "Revisa la imagen generada y aprueba o elimina."}
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 text-center">
              <Image
                src={pendingApprovalImage.imageUrlFromLeonardo}
                alt={pendingApprovalImage.prompt ? `Imagen generada para aprobación: ${pendingApprovalImage.prompt}` : "Imagen generada para aprobación"}
                width={512} height={512} className="rounded-md mx-auto object-contain" />
              <p className="text-sm text-gray-600 dark:text-gray-600 mt-2 italic text-center">"{pendingApprovalImage.prompt}"</p>
            </div>
            <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <Button 
                variant="destructive" 
                onClick={handleDeleteImage} 
                disabled={isProcessingAction}
                className={`w-full relative overflow-hidden hover:brightness-110 active:brightness-90 hover:scale-105 active:scale-95 transition-all duration-150
                           bg-slate-50 hover:bg-slate-500 
                           text-slate-200 dark:text-slate-200 
                           border-1 border-slate-50 hover:border-slate-50
                           focus-visible:ring-slate-50`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isProcessingAction ? (
                    <motion.div key="spinner-delete" className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <LoadingSpinner className="h-4 w-4 animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.span key="text-delete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-center gap-1.5">
                      <CancelIcon className="h-4 w-4 p-1 " /> Eliminar
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
              <Button 
                onClick={handleApproveImage} 
                disabled={isProcessingAction}
                className={`w-full relative overflow-hidden hover:brightness-110 active:brightness-90 hover:scale-105 active:scale-95 transition-all duration-150 
                           bg-primary hover:bg-primary/90 
                           text-primary-foreground dark:text-primary-foreground
                           border-1 border-primary hover:border-primary/90
                           focus-visible:ring-primary`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isProcessingAction ? (
                    <motion.div key="spinner-approve" className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <LoadingSpinner className="h-4 w-4 animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.span key="text-approve" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-center gap-1.5"> 
                      <ApproveIcon className="h-4 w-4 p-1" /> ¡Publicar Kasaka!
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </>
  );
}