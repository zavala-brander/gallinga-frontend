"use client";

import { useEffect, useCallback } from 'react'; // Importa useCallback
import { usePathname } from 'next/navigation'; // Importa usePathname

const ThemeColorUpdater = () => {
// Define updateMetaThemeColor fuera de useEffect para que sea accesible para ambos.
// Envuelve la función en useCallback para asegurar que sea estable entre renders.
const updateMetaThemeColor = useCallback(() => {
  if (typeof window !== "undefined") {
    // Usaremos --color-secondary-V1 para el theme-color, puedes ajustarlo
    // a la variable que mejor represente el color de fondo de tu barra de navegación/UI principal.
    const themeColorCssVar = getComputedStyle(document.documentElement).getPropertyValue('--color-secondary-V1').trim();
    
    if (themeColorCssVar) {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.getElementsByTagName('head')[0].appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', themeColorCssVar);
      console.log('[ThemeColorUpdater] Updated meta theme-color to:', themeColorCssVar);
    }
  }
}, []); // No necesita dependencias ya que solo accede a objetos globales (window, document).

  useEffect(() => {
    document.documentElement.addEventListener('themeApplied', updateMetaThemeColor);
    // Llama una vez por si el tema ya se aplicó
    if (document.documentElement.getAttribute('data-initial-theme-applied') === 'true') {
      updateMetaThemeColor();
    }

    return () => {
      document.documentElement.removeEventListener('themeApplied', updateMetaThemeColor);
    };
  }, [updateMetaThemeColor]); // Este useEffect se mantiene para la lógica inicial y el listener del evento.

  const pathname = usePathname(); // Obtiene la ruta actual
  useEffect(() => { updateMetaThemeColor(); }, [pathname, updateMetaThemeColor]); // Vuelve a ejecutar la actualización cuando la ruta cambia

  return null; // Este componente no renderiza nada
};

export default ThemeColorUpdater;