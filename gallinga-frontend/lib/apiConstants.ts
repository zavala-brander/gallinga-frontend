/**
 * Este archivo centraliza todas las constantes de la API y las URLs base de la aplicación.
 * Utiliza variables de entorno (con prefijo NEXT_PUBLIC_) para que puedan ser configuradas
 * en diferentes entornos (desarrollo, producción) sin cambiar el código.
 * Proporciona valores por defecto para un funcionamiento básico si las variables no están definidas.
 */

export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://gallinga.purakasaka.com";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://europe-west1-gallinga-project.cloudfunctions.net";
export const PURAKASAKA_URL = process.env.NEXT_PUBLIC_PURAKASAKA_URL || "https://purakasaka.com";

export const GENERATE_IMAGE_ENDPOINT = `${API_BASE_URL}/generarImagenGallinga`;
export const APPROVE_ENDPOINT = `${API_BASE_URL}/finalizarCreacionGallinga`;
export const DELETE_ENDPOINT = `${API_BASE_URL}/eliminarCreacionGallinga`;
export const STATUS_ENDPOINT_BASE = `${API_BASE_URL}/getGallingaJobStatus`;
export const GALLERY_API_ENDPOINT = `${API_BASE_URL}/obtenerGaleria`;
export const RATE_IMAGE_API_ENDPOINT = `${API_BASE_URL}/rateImageGallinga`;

// El REQUEST_LIMIT también podría venir de una variable de entorno si necesitas configurarlo dinámicamente.
export const REQUEST_LIMIT = parseInt(process.env.NEXT_PUBLIC_REQUEST_LIMIT || "2", 10);