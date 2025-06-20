/**
 * Obtiene el valor de una variable de entorno del lado del cliente.
 * Las variables de entorno accesibles en el navegador DEBEN comenzar con NEXT_PUBLIC_.
 * @param varName - El nombre de la variable de entorno (ej. NEXT_PUBLIC_API_BASE_URL).
 * @param defaultValue - Un valor opcional por defecto si la variable no está definida.
 * @returns El valor de la variable de entorno o el valor por defecto.
 * @throws Error si la variable es requerida y no está definida y no se proporciona un valor por defecto.
 */
function getClientEnvVar(varName: string, defaultValue?: string): string {
  const value = process.env[varName];

  if (value !== undefined) {
    return value;
  }

  if (defaultValue !== undefined) {
    // Podrías añadir un console.warn aquí si quieres ser notificado durante el desarrollo
    // console.warn(`Advertencia: La variable de entorno '${varName}' no está definida. Usando valor por defecto: '${defaultValue}'`);
    return defaultValue;
  }

  // Si llegamos aquí, la variable es requerida pero no está definida y no hay valor por defecto.
  // Esto es un error de configuración crítico para la aplicación.
  throw new Error(
    `Error de configuración: Falta la variable de entorno requerida '${varName}'. ` +
    `Asegúrate de que esté definida en tu archivo .env.local (para desarrollo) o en la configuración de Vercel (para producción).`
  );
}

export const APP_BASE_URL = getClientEnvVar("NEXT_PUBLIC_APP_BASE_URL", "https://gallinga.purakasaka.com");
export const API_BASE_URL = getClientEnvVar("NEXT_PUBLIC_API_BASE_URL", "https://europe-west1-gallinga-project.cloudfunctions.net");

export const GENERATE_IMAGE_ENDPOINT = `${API_BASE_URL}/generarImagenGallinga`;
export const APPROVE_ENDPOINT = `${API_BASE_URL}/finalizarCreacionGallinga`;
export const DELETE_ENDPOINT = `${API_BASE_URL}/eliminarCreacionGallinga`;
export const STATUS_ENDPOINT_BASE = `${API_BASE_URL}/getGallingaJobStatus`;
export const GALLERY_API_ENDPOINT = `${API_BASE_URL}/obtenerGaleria`;
export const RATE_IMAGE_API_ENDPOINT = `${API_BASE_URL}/rateImageGallinga`;

// El REQUEST_LIMIT también podría venir de una variable de entorno si necesitas configurarlo dinámicamente.
export const REQUEST_LIMIT = parseInt(getClientEnvVar("NEXT_PUBLIC_REQUEST_LIMIT", "2"), 10);