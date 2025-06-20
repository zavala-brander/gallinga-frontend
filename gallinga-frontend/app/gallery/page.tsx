"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Lottie from "lottie-react";
import gallingaLogo from "@/assets/lottie/gallinga-logo.json"; // Actualizado para la nueva ruta
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Importar useRouter
import { useSwipeable } from "react-swipeable"; // Para navegación por swipe
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// prettier-ignore
import { TwitterIcon, FacebookIcon, CopyIcon, ShareIcon, UserIcon, SearchIcon, DownloadIcon, PurakasakaIcon, ChevronLeftIcon, ChevronRightIcon, StarIcon, GallingaHenIcon, LoadingSpinner } from "@/components/ui/icons"; // Añadir StarIcon, GallingaHenIcon y LoadingSpinner
import { StarRating } from "@/components/ui/StarRating"; // Importar StarRating
import { useLottieThemer } from '@/hooks/useLottieThemer'; // Importar el custom hook
import { ImageSerialNumber } from "@/components/ui/ImageSerialNumber"; // Importar el nuevo componente
import { StoryChapter as GalleryImage, TimestampValue } from '@/lib/types'; // Reutilizar el tipo StoryChapter y TimestampValue
import { GalleryImageCard } from "@/components/ui/GalleryImageCard"; // Importar el nuevo componente de tarjeta
import { LoadingGiphy } from '@/components/ui/LoadingGiphy'; // Importar LoadingGiphy
import { AnimatePresence, motion } from 'framer-motion'; // Para animaciones en botones del diálogo
import { GALLERY_API_ENDPOINT, RATE_IMAGE_API_ENDPOINT } from '@/lib/apiConstants';
import { getTimestampInSeconds, handleDownload, handleSocialShare } from '@/lib/utils';


export default function GalleryPage() {
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const lottieAnimationData = useLottieThemer(gallingaLogo); // Usar el hook
  const router = useRouter(); // Inicializar useRouter
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [ratingImageId, setRatingImageId] = useState<string | null>(null); // Para deshabilitar estrellas
  const [selectedInstagramUser, setSelectedInstagramUser] = useState<string | null>(null);
  const [isDialogImageLoading, setIsDialogImageLoading] = useState(true); // Para la imagen del diálogo

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [error, setError] = useState<string | null>(null); // Estado para manejar errores
  // Definir cuántas imágenes cargar por página/bloque
  // Ajusta este valor para que sea COLUMNAS_EN_DESKTOP * 2
  const DESKTOP_PAGE_SIZE = 10; // Ejemplo: 2 filas de 5 columnas
  const MOBILE_PAGE_SIZE = 6;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // md breakpoint
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const initialPageSize = isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
        const response = await fetch(`${GALLERY_API_ENDPOINT}?limit=${initialPageSize}`);
        if (!response.ok) {
          let errorText = "Error desconocido del servidor";
          try { errorText = await response.text(); } catch (e) { /* no hacer nada si falla .text() */ }
          console.error(`[GalleryPage] Error al cargar la galería inicial. Status: ${response.status}, Response: ${errorText}`);
          throw new Error(`Error al cargar la galería (status ${response.status})`);
        }
        const data = await response.json();
        console.log("[GalleryPage] Datos recibidos de la API (carga inicial):", JSON.stringify(data).substring(0, 300) + "...");
        let imagesToProcess: GalleryImage[] = [];
        let cursor: string | null = null;

        if (Array.isArray(data)) {
          // Caso 1: La API devolvió un array directamente (comportamiento antiguo o sin paginación)
          console.warn("La API de galería devolvió un array directamente. Se procesará, pero se espera una estructura paginada { images: [], nextCursor: ... }.");
          imagesToProcess = data;
          cursor = null; // No hay cursor si es un array directo
          // No hay cursor explícito en este caso para la carga inicial.
          // El botón "Cargar Más" dependerá de que las siguientes llamadas sí reciban un cursor.
        } else if (data && data.images && Array.isArray(data.images)) {
          // La API devolvió el objeto esperado con la propiedad 'images'
          console.log("[GalleryPage] API devolvió estructura paginada esperada.");
          imagesToProcess = data.images; // El mapeo para ratings se hará después consistentemente
          cursor = data.nextCursor;
        } else {
          console.error("[GalleryPage] La respuesta de la API (carga inicial) no es un array ni contiene una propiedad 'images' válida. Respuesta recibida:", data);
          setAllImages([]);
          setNextCursor(null);
          setIsLoading(false); // Asegurar que isLoading se ponga en false
          setError("Error: Formato de datos inesperado de la API."); // Opcional: mostrar error al usuario
          return; // Salir temprano si la estructura de datos es incorrecta
        }

        const finalImages = imagesToProcess.map((img: GalleryImage) => ({
            ...img,
            averageRating: img.averageRating || 0,
            ratingCount: img.ratingCount || 0,
          }));

        setAllImages(finalImages);
        setNextCursor(cursor);

      } catch (error: any) { 
        console.error("[GalleryPage] Fallo en fetchImages (bloque catch):", error.message, error); 
        setAllImages([]); // Asegurar que las imágenes se limpien en caso de error
        setNextCursor(null); // Y también el cursor
        setIsLoading(false); 
        setError(error.message || "Error al cargar la galería."); 
      } 
      finally { setIsLoading(false); }
    };

    fetchImages();

    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]); // Volver a ejecutar si cambia entre móvil/escritorio para la carga inicial

  const fetchMoreImages = async () => {
    if (!nextCursor || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const pageSize = isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
      const response = await fetch(`${GALLERY_API_ENDPOINT}?limit=${pageSize}&startAfter=${nextCursor}`);
      if (!response.ok) throw new Error("Error al cargar más imágenes");
      const data = await response.json();
      console.log("[GalleryPage] Datos recibidos de la API (cargar más):", JSON.stringify(data).substring(0, 300) + "...");
      // Asumir que fetchMoreImages SIEMPRE recibe la estructura paginada correcta
      if (data && data.images && Array.isArray(data.images)) {
        if (data.images.length === 0) {
          console.log("[GalleryPage] No hay más imágenes para cargar.");
          setNextCursor(null); // No hay más imágenes
        }
        const augmentedData = data.images.map((img: GalleryImage) => ({
          ...img,
          averageRating: img.averageRating || 0,
          ratingCount: img.ratingCount || 0,
        }));
        setAllImages(prevImages => [...prevImages, ...augmentedData]);
        setNextCursor(data.nextCursor);
      } else {
        console.error("[GalleryPage] Respuesta inesperada al cargar más imágenes:", data);
        setNextCursor(null); // Detener paginación si la respuesta es incorrecta
        setError("Error: Formato de datos inesperado al cargar más imágenes."); // Opcional
      }
    } catch (error: any) {
      console.error("[GalleryPage] Fallo en fetchMoreImages:", error.message, error);
      // Podrías mostrar un error al usuario
      setError(error.message || "Error al cargar más imágenes."); // Opcional
    } finally {
      setIsFetchingMore(false);
    }
  };

  const instagramUsers = useMemo(() => {
    const users = new Set<string>();
    allImages.forEach(img => {
      if (img.creatorInstagram) {
        users.add(img.creatorInstagram);
      }
    });
    return Array.from(users).sort();
  }, [allImages]);

  // Para generar un número de serie estable basado en el orden de creación
  const stableSortedImagesForSerialNumber = useMemo(() => {
    // El objetivo es que la imagen MÁS ANTIGUA tenga el índice 0 en este array,
    // para que así reciba el número de serie más bajo (ej: #1).
    // "Más antigua" significa un timestamp más PEQUEÑO.
    // Por lo tanto, necesitamos ordenar en orden ASCENDENTE.

    // if (allImages.length > 0) {
      // Logueamos el objeto createdAt completo para inspección
      // console.log("[DEBUG] Imágenes ANTES de ordenar (primera imagen):", { id: allImages[0].id, createdAt: allImages[0].createdAt });
    // }
    const sortedImages = [...allImages].sort((a, b) => getTimestampInSeconds(a.createdAt) - getTimestampInSeconds(b.createdAt));
    // if (sortedImages.length > 0) {
      // console.log("[DEBUG] Imágenes DESPUÉS de ordenar (primera imagen):", { id: sortedImages[0].id, createdAt: sortedImages[0].createdAt, timestampUsed: getTimestampInSeconds(sortedImages[0].createdAt) });
    // }
    return sortedImages;
  }, [allImages]);

  const filteredAndSortedImages = useMemo(() => {
    return allImages
      .filter(img => {
        const searchTermLower = searchTerm.toLowerCase();
        const matchesSearch = 
          img.prompt.toLowerCase().includes(searchTermLower) ||
          img.creatorName.toLowerCase().includes(searchTermLower) ||
          (img.creatorInstagram && `@${img.creatorInstagram}`.toLowerCase().includes(searchTermLower));

        const matchesInstagramFilter = selectedInstagramUser ? img.creatorInstagram === selectedInstagramUser : true;
        return matchesSearch && matchesInstagramFilter;
      })
      .sort((a, b) => {
        if (sortOrder === 'popular') {
          const ratingA = a.averageRating || 0;
          const ratingB = b.averageRating || 0;
          const countA = a.ratingCount || 0;
          const countB = b.ratingCount || 0;

          if (ratingB !== ratingA) {
            return ratingB - ratingA; // Mayor rating primero
          }
          return countB - countA; // Si ratings iguales, mayor número de votos primero
        }
        // Ordenación por fecha (newest/oldest)
        return sortOrder === 'newest' ? getTimestampInSeconds(b.createdAt) - getTimestampInSeconds(a.createdAt) : getTimestampInSeconds(a.createdAt) - getTimestampInSeconds(b.createdAt);
      });
  }, [allImages, searchTerm, sortOrder, selectedInstagramUser]);

  const handleUseAsTemplate = useCallback((prompt: string) => {
    router.push(`/?prompt=${encodeURIComponent(prompt)}`);
    setSelectedImage(null); // Cerrar el diálogo
  }, [router]);

  const handleRateImageInDialog = async (imageId: string, newRating: number): Promise<void> => {
    // console.log(`Intentando calificar imagen ${imageId} con ${newRating} estrellas desde el diálogo.`);
    // Añadir esta comprobación para evitar envíos duplicados
    if (ratingImageId === imageId) {
      // console.warn(`[GalleryPage] La calificación para la imagen ${imageId} ya está en progreso. Clic duplicado ignorado.`);
      return;
    }
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
      // Actualizar la imagen seleccionada en el diálogo y también en la lista general
      setSelectedImage(prev => prev ? { ...prev, averageRating: result.newAverageRating, ratingCount: result.newRatingCount } : null);
      setAllImages(prevImages =>
        prevImages.map(img =>
          img.id === imageId ? { ...img, averageRating: result.newAverageRating, ratingCount: result.newRatingCount } : img
        )
      );
    } catch (err: any) {
      console.error("Error al calificar la imagen desde el diálogo:", err.message);
      // Podrías mostrar un error al usuario aquí
    } finally {
      setRatingImageId(null);
    }
  };

  // Navegación para el diálogo y carrusel
  const currentImageIndexInSortedArray = useMemo(() => {
    if (!selectedImage) return -1;
    // Usar filteredAndSortedImages para la navegación del diálogo para que coincida con lo que ve el usuario
    return filteredAndSortedImages.findIndex(img => img.id === selectedImage.id);
  }, [selectedImage, filteredAndSortedImages]);

  const canNavigateBack = currentImageIndexInSortedArray > 0;
  const canNavigateForward = currentImageIndexInSortedArray < filteredAndSortedImages.length - 1 && currentImageIndexInSortedArray !== -1;

  const navigateDialogImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && canNavigateBack) {
      setSelectedImage(filteredAndSortedImages[currentImageIndexInSortedArray - 1]);
    } else if (direction === 'next' && canNavigateForward) {
      setSelectedImage(filteredAndSortedImages[currentImageIndexInSortedArray + 1]);
    }
  };

  useEffect(() => {
    // Cuando la imagen seleccionada para el diálogo cambia, resetear el estado de carga
    if (selectedImage) setIsDialogImageLoading(true);
  }, [selectedImage]);

  // Handlers para swipe en la imagen principal del diálogo (móvil)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigateDialogImage('next'), // Swipe Izquierda = Adelanta
    onSwipedRight: () => navigateDialogImage('prev'), // Swipe Derecha = Retrocede
    trackMouse: false, // Deshabilitar para mouse, solo touch
    preventScrollOnSwipe: true,
  });



  return (
    <div className="w-full min-h-screen bg-background text-foreground"> {/* Restaurado con bg-background y text-foreground semánticos */}
      <header className="fixed top-0 left-0 right-0 z-30 flex justify-between items-center p-2 md:p-4 dark:bg-black/50 ">
        <a href="https://purakasaka.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 hover:scale-110 transition-transform">
          <Lottie animationData={lottieAnimationData} loop={true} />
        </a>
        <Link
          href="/"
          aria-label="Ir a la página principal"
          className="block w-12 h-12 p-1.5 text-slate-200 dark:text-slate-200 hover:text-slate-600 dark:hover:text-primary-light hover:scale-110 transition-transform rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <GallingaHenIcon className="w-full h-full" />
        </Link>
      </header>
      <main className="container mx-auto px-4 pt-20 pb-8"> {/* Ajustado pt-20 para el header fijo */}
        <div className="flex justify-center md:justify-end items-center mb-4">
            <h1 className="text-3xl md:text-3xl font-bold tracking-tight text-left md:text-right w-full text-slate-200 dark:text-slate-200">Brujilda La Gallina</h1>
        </div>
        <div className="w-full h-[1px] bg-slate-200 dark:bg-gray-800 my-6"></div>
        
        {/* Barra de Acciones y Filtros */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
            {/* Izquierda: Botón de Navegación */}
            <div className="w-full md:w-auto">
                <Button asChild variant="outline" className="h-9 w-full md:w-auto text-slate-200 hover:text-slate-200">
                    <Link href="/">← Crear / Make</Link>
                </Button>
            </div>

            {/* Derecha: Controles de Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-start items-center gap-3 w-full md:w-auto md:justify-end md:flex-nowrap ">
                {/* Input de búsqueda */}
                <div className="relative w-full sm:w-auto sm:min-w-[180px] sm:flex-grow md:flex-grow-0 md:min-w-[220px] border border-slate-200  rounded-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-200 "/>
                    <Input 
                        placeholder="Buscar por prompt o autor..."
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-9 text-sm h-9 w-full bg-transparent"
                    />
                </div>

                {/* Filtro de Ordenación */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm font-medium text-slate-200  dark:text-slate-200" >Ordenar:</span>
                    <Select onValueChange={(value: 'newest' | 'oldest' | 'popular') => setSortOrder(value)} defaultValue="newest">
                        <SelectTrigger className="w-full sm:w-auto md:w-[130px] h-9 text-sm border border-slate-200 rounded-md">
                            <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-200 dark:bg-gray-800 ">
                            <SelectItem value="newest">Más Nuevo</SelectItem>
                            <SelectItem value="oldest">Más Viejo</SelectItem>
                            <SelectItem value="popular">Populares</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Filtro de Instagram */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm font-medium text-slate-200 dark:text-slate-200">User:</span>
                    <Select onValueChange={(value) => setSelectedInstagramUser(value === "all" ? null : value)} value={selectedInstagramUser || "all"}>
                        <SelectTrigger className="w-full sm:w-auto md:w-[130px] h-9 text-sm border border-slate-200 rounded-md">
                            <SelectValue placeholder="Todos" /> 
                        </SelectTrigger>
                        <SelectContent className="bg-slate-200 dark:bg-gray-800">
                            <SelectItem value="all">Todos</SelectItem>
                            {instagramUsers.map(user => (
                                <SelectItem key={user} value={user}>@{user}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>

        {/* Grid de la Galería */}
        {isLoading ? ( 
            <div className="flex flex-col items-center justify-center text-center py-10">
                <LoadingGiphy title="loading gallery animation" className="w-48 h-48 relative mb-4" />
                Cargando creaciones...
            </div> 
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {filteredAndSortedImages.map((img, index) => (
                    <GalleryImageCard 
                        key={img.id} 
                        img={img} 
                        index={index} 
                        stableSortedImagesForSerialNumber={stableSortedImagesForSerialNumber}
                        onImageClick={setSelectedImage}
                        onRate={handleRateImageInDialog}
                        ratingImageId={ratingImageId}
                    />
                ))}
            </div>
        )}
        {!isLoading && nextCursor && (
          <div className="mt-12 text-center">
            <Button 
              onClick={fetchMoreImages} 
              disabled={isFetchingMore}
              variant="outline"
              className="text-slate-200 hover:text-slate-200"
            >
              {isFetchingMore ? <LoadingSpinner className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cargar Más
            </Button>
          </div>
        )}
      </main>

      <Dialog open={!!selectedImage} onOpenChange={(isOpen) => !isOpen && setSelectedImage(null)}>
        {selectedImage && (
          <DialogContent className="max-w-xl md:max-w-3xl bg-white dark:bg-gray-900 p-6 flex flex-col
                                 sm:rounded-lg  /* Bordes redondeados para sm y superior */
                                 max-sm:w-screen max-sm:h-screen max-sm:max-w-full max-sm:rounded-none max-sm:p-4 /* Pantalla completa y sin bordes en móvil */
                                 overflow-hidden /* Para evitar que el contenido interno cause scroll en el DialogContent mismo */
                                 ">            
            {/* Añadir DialogHeader, DialogTitle y DialogDescription para accesibilidad */}
            <DialogHeader className="sr-only">
              <DialogTitle>{selectedImage.prompt ? `Detalle de la Imagen: ${selectedImage.prompt.substring(0,50)}...` : "Imagen actual"}</DialogTitle>
              <DialogDescription>{selectedImage.prompt ? `Información detallada y opciones para la imagen generada: ${selectedImage.prompt}` : "Imagen actual"}</DialogDescription>
            </DialogHeader>

            {/* Contenido Principal del Diálogo (Imagen e Info) */}
            <div className="grid md:grid-cols-2 gap-6 flex-grow 
                           overflow-y-auto 
                           md:overflow-y-visible /* En desktop, el scroll general del dialog es menos problemático */ 
                           max-sm:pt-16 /* Aumentado el padding superior para móvil para dar más espacio al botón de cierre */">
              {/* Aplicamos swipeHandlers aquí */}
              <div {...swipeHandlers} className="relative aspect-square w-full overflow-hidden rounded-lg md:cursor-default cursor-grab active:cursor-grabbing">
                {isDialogImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-gray-800"> <LoadingGiphy title="loading dialog image animation" /> </div>
                )}
                <Image 
                    src={selectedImage.imageUrl} 
                    alt={selectedImage.prompt} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 50vw" 
                    className={`object-contain transition-opacity duration-500 ease-in-out ${isDialogImageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsDialogImageLoading(false)}
                    onError={() => setIsDialogImageLoading(false)}
                    key={selectedImage.id} // Key para forzar re-render si cambia la imagen
                />
              </div>

              {/* Columna Derecha: Información y Acciones */}
              <div className="flex flex-col h-full"> {/* Contenedor flex para empujar acciones hacia abajo */}
                <div className="flex-grow space-y-4"> {/* Contenido principal que ocupa el espacio disponible */}
                  <a href="https://purakasaka.com" target="_blank" rel="noopener noreferrer" title="Visita Purakasaka.com" className=" text-slate-50 dark:text-slate-50 hover:text-slate-500 dark:hover:text-primary-light transition-colors self-start">
                    <PurakasakaIcon className="w-8 h-8 p-1" />
                  </a>

                  {/* Rating de estrellas en el diálogo */}
                  <div className="my-2">
                    <StarRating
                        rating={selectedImage.averageRating || 0}
                        onRate={(newRating) => handleRateImageInDialog(selectedImage.id, newRating)}
                        size={6} // Un poco más grande para el diálogo
                        readonly={ratingImageId === selectedImage.id}
                        showRatingCount={true}
                        ratingCount={selectedImage.ratingCount || 0}
                        // Puedes usar las clases por defecto o personalizarlas aquí también:
                        // ratingCountClasses="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-2" 
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Creado por: {selectedImage.creatorName}</p>
                    {selectedImage.creatorInstagram && (
                      <a 
                        href={`https://instagram.com/${selectedImage.creatorInstagram}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-primary dark:text-primary-light hover:underline"
                      >
                        @{selectedImage.creatorInstagram}
                      </a>
                    )}
                  </div>

                  {( () => {
                      const imageGlobalIndex = stableSortedImagesForSerialNumber.findIndex(img => img.id === selectedImage.id);
                      const serialNumber = imageGlobalIndex !== -1 ? `01-${String(imageGlobalIndex + 1).padStart(4, '0')}` : 'N/A';
                      return <p className="text-sm text-slate-100 dark:text-slate-100">Historia: {serialNumber}</p>;
                    })()
                  }

                  <div className="text-sm text-blue-600 dark:text-slate-200 bg-slate-700 dark:bg-gray-700 p-3 rounded-md max-h-32 overflow-y-auto">
                    {selectedImage.prompt}
                  </div>

                  <Button onClick={() => handleUseAsTemplate(selectedImage.prompt)} variant="default" className="w-full border border-slate-50 hover:!bg-slate-500 hover:!border-slate-500 hover:!text-slate-200">
                    <CopyIcon className="h-4 w-4 mr-2 p-2" /> {/* O un icono más adecuado para "template" */}
                    Usar plantilla / Use template
                  </Button>
                </div>

                {/* Línea divisoria */}
                <div className="my-4 border-t border-slate-200 dark:border-gray-700"></div>

                {/* Botones de Acción (Descargar, Compartir) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button onClick={() => handleDownload(selectedImage.imageUrl, selectedImage.id)} variant="outline" className="w-full border-slate-50 hover:!bg-slate-200 hover:!text-slate-500 hover:!border-slate-500">
                    <DownloadIcon className="h-4 w-4 mr-2 p-2"/>
                    Descargar
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full border-slate-50 hover:!bg-slate-200 hover:!text-slate-500 hover:!border-slate-500"><ShareIcon className="h-4 w-4 mr-2 p-2"/>Compartir</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-800 dark:text-slate-100">
                      <DropdownMenuItem onClick={() => handleSocialShare('twitter', selectedImage.prompt, "https://purakasaka.com/gallinga-story")} className="text-slate-200 hover:!bg-slate-100 dark:hover:!bg-gray-700">
                        <TwitterIcon className="h-4 w-4 mr-2 fill-current p-2.5  text-slate-200"/>Compartir en X
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSocialShare('facebook', selectedImage.prompt, "https://purakasaka.com/gallinga-story")} className="text-slate-200 hover:!bg-slate-100 dark:hover:!bg-gray-700">
                        <FacebookIcon className="h-4 w-4 mr-2 fill-current p-2 f text-slate-200"/>Compartir en Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSocialShare('copy', selectedImage.prompt, "https://purakasaka.com/gallinga-story")} className="text-slate-200 hover:!bg-slate-100 dark:hover:!bg-gray-700">
                        <CopyIcon className="h-4 w-4 mr-2 p-2 text-slate-200"/>Copiar Enlace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            
            {/* Sección del Carrusel de Navegación (Solo Desktop) */}
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-gray-700 hidden md:block"> {/* hidden md:block para mostrar solo en desktop */}
              <div className="flex justify-between items-center mb-2 px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDialogImage('prev')}
                  disabled={!canNavigateBack}
                  className="text-xs  border-slate-50 hover:!bg-slate-200 hover:!text-slate-500 hover:!border-slate-500">
                  <ChevronLeftIcon className="h-4 w-4 mr-1 p-1" />
                  ----
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateDialogImage('next')}
                  disabled={!canNavigateForward}
                  className="text-xs  border-slate-50 hover:!bg-slate-200 hover:!text-slate-500 hover:!border-slate-500">
                  ----
                  <ChevronRightIcon className="h-4 w-4 ml-1 p-1" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 ">
                {[currentImageIndexInSortedArray - 1, currentImageIndexInSortedArray, currentImageIndexInSortedArray + 1].map((imageIndex, carouselSlotIndex) => {
                  // Usar filteredAndSortedImages para el carrusel del diálogo
                  const image = filteredAndSortedImages[imageIndex];
                  const isCenter = carouselSlotIndex === 1;
                  const sequenceNumber = imageIndex !== -1 && image ? String(imageIndex + 1).padStart(2, '0') : null;

                  if (!image && (carouselSlotIndex === 0 || carouselSlotIndex === 2)) {
                    // Slot vacío para prev/next si no hay imagen
                    return <div key={`empty-${carouselSlotIndex}`} className="aspect-[3/2] bg-slate-100 dark:bg-gray-800 rounded flex items-center justify-center text-slate-400 dark:text-gray-600 opacity-50"></div>;
                  }
                  if (!image && isCenter) return null; // No debería pasar si selectedImage existe
                  if (!image) return null;

                  return (
                    <div
                      key={image.id}
                      className={`relative aspect-[3/2] rounded overflow-hidden group ${!isCenter ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                      onClick={() => !isCenter && setSelectedImage(image)}
                    >
                      <Image 
                        src={image.imageUrl} 
                        alt={image.prompt} 
                        fill 
                        sizes="(max-width: 768px) 33vw, 10vw" /* Ajusta estos valores según tu layout */
                        className="object-cover" />
                      {isCenter && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center ring-2 ring-primary dark:ring-primary-light rounded" title="Imagen actual">
                        </div>
                      )}
                      {sequenceNumber && (
                        <span className="absolute bottom-1 right-1 text-xs bg-slate-200 text-slate-50 px-1.5 py-0.5 rounded">
                          {sequenceNumber}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}