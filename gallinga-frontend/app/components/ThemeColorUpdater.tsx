"use client";

import { useEffect } from 'react';

const ThemeColorUpdater = () => {
  useEffect(() => {
    const updateMetaThemeColor = () => {
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
    };

    document.documentElement.addEventListener('themeApplied', updateMetaThemeColor);
    // Llama una vez por si el tema ya se aplicó
    if (document.documentElement.getAttribute('data-initial-theme-applied') === 'true') {
      updateMetaThemeColor();
    }

    return () => {
      document.documentElement.removeEventListener('themeApplied', updateMetaThemeColor);
    };
  }, []);

  return null; // Este componente no renderiza nada
};

export default ThemeColorUpdater;