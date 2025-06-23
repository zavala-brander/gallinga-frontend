"use client";
import { useState, useEffect, useMemo } from "react";
import { Metadata } from 'next';
import { usePathname } from 'next/navigation';
import Lottie from "lottie-react";
import gallingaLogo from "@/assets/lottie/gallinga-logo.json"; // Actualizado para la nueva ruta
import Link from "next/link";
import { useRouter } from "next/navigation"; // Importar useRouter
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// prettier-ignore
import { SearchIcon, GallingaHenIcon, LoadingSpinner } from "@/components/ui/icons"; // Añadir StarIcon, GallingaHenIcon y LoadingSpinner
import { useLottieThemer } from '@/hooks/useLottieThemer'; // Importar el custom hook
import { StoryChapter as GalleryImage, TimestampValue } from '@/lib/types'; // Reutilizar el tipo StoryChapter y TimestampValue
import { GalleryImageCard } from "@/components/ui/GalleryImageCard"; // Importar el nuevo componente de tarjeta
import { LoadingGiphy } from '@/components/ui/LoadingGiphy';
import { GALLERY_API_ENDPOINT, RATE_IMAGE_API_ENDPOINT, APP_BASE_URL, PURAKASAKA_URL } from '@/lib/apiConstants';
import { getTimestampInSeconds } from '@/lib/utils';


export default function GalleryPage() {
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lottieAnimationData = useLottieThemer(gallingaLogo); // Usar el hook
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [ratingImageId, setRatingImageId] = useState<string | null>(null); // Para deshabilitar estrellas
  const [selectedInstagramUser, setSelectedInstagramUser] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

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

  const handleRateImage = async (imageId: string, newRating: number): Promise<void> => {
    if (ratingImageId === imageId) {
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
      setAllImages(prevImages =>
        prevImages.map(img =>
          img.id === imageId ? { ...img, averageRating: result.newAverageRating, ratingCount: result.newRatingCount } : img
        )
      );
    } catch (err: any) {
      console.error("Error al calificar la imagen desde el diálogo:", err.message);
      setError(err.message || "Error al guardar la calificación.");
    } finally {
      setRatingImageId(null);
    }
  };



  return (
    <>
      {/* GEO: Schema para CollectionPage (Galería) y ImageObject para las imágenes visibles */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Galería de Historias de Gallinga",
          "url": `${APP_BASE_URL}${pathname}`,
          "description": "Explora todas las escenas creadas por la comunidad para la historia de Brujilda la Gallina.",
          "isPartOf": { "@type": "WebSite", "@id": APP_BASE_URL },
          // Listar ImageObjects para las imágenes actualmente cargadas.
          // Esto es crucial para E-E-A-T, mostrando la experiencia de primera mano de los usuarios.
          "mainEntity": {
            "@type": "ItemList",
            "itemListElement": filteredAndSortedImages.slice(0, 25).map((img, index) => {
              const authorSchema: any = {
                "@type": "Person",
                "name": img.creatorName || "Gallo Anónimo"
              };
              if (img.creatorInstagram) {
                authorSchema.sameAs = `https://instagram.com/${img.creatorInstagram.replace('@', '')}`;
              }

              const imageObject: any = {
                "@type": "ImageObject",
                "position": index + 1,
                "@id": `${APP_BASE_URL}/gallery/${img.id}#image`,
                "contentUrl": img.imageUrl,
                "name": `Escena de la historia de Gallinga: "${img.prompt}"`,
                "description": `Contribución a la historia colaborativa 'Historias de la Gallinga'. Prompt: "${img.prompt}" por ${img.creatorName}.`,
                "author": authorSchema, // "Los Gallos" como co-creadores
                "datePublished": img.createdAt ? new Date(getTimestampInSeconds(img.createdAt) * 1000).toISOString() : undefined,
                "copyrightHolder": {
                  "@type": "Organization",
                  "@id": `${PURAKASAKA_URL}#organization`
                },
                "license": "https://creativecommons.org/licenses/by-nc/4.0/" // Ejemplo de licencia, ajusta si es necesario
              };

              if (img.ratingCount && img.ratingCount > 0 && img.averageRating) {
                imageObject.aggregateRating = {
                  "@type": "AggregateRating",
                  "ratingValue": img.averageRating.toFixed(2).toString(),
                  "ratingCount": img.ratingCount.toString(),
                  "bestRating": "5",
                  "worstRating": "1"
                };
              }
              
              return imageObject;
            })
          }
        }) }}
      />
      <div className="w-full min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-30 flex justify-between items-center p-2 md:p-4 dark:bg-black/50 ">
        <a href="https://purakasaka.com/proyecto/historias-de-la-gallinga/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 hover:scale-110 transition-transform">
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
                        className="pl-9 text-sm h-9 w-full bg-slate-500"
                    />
                </div>

                {/* Filtro de Ordenación */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm font-medium text-slate-200  dark:text-slate-200" >Ordenar:</span>
                    <Select onValueChange={(value: 'newest' | 'oldest' | 'popular') => setSortOrder(value)} defaultValue="newest">
                        <SelectTrigger className="w-full sm:w-auto md:w-[130px] h-9 text-sm border border-slate-200 rounded-md bg-slate-500">
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
                        <SelectTrigger className="w-full sm:w-auto md:w-[130px] h-9 text-sm border border-slate-200 rounded-md bg-slate-500">
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
                        onRate={handleRateImage}
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
      </div>
    </>
  );
}