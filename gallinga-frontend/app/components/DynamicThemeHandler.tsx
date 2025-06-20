"use client";

import { useEffect, useState } from 'react';

interface ColorPalette {
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
}

// Define tus paletas de colores aquí
const palettes: ColorPalette[] = [
    {
        name: 'BlueGreen',
        primary: 'var(--e-global-color-blue)',
        primaryDark: 'var(--e-global-color-blue-dark)',
        primaryLight: 'var(--e-global-color-blue-light)',
        secondary: 'var(--e-global-color-green)',
        secondaryDark: 'var(--e-global-color-green-dark)',
        secondaryLight: 'var(--e-global-color-green-light)',
      },
      {
        name: 'RedYellow',
        primary: 'var(--e-global-color-red)',
        primaryDark: 'var(--e-global-color-red-dark)',
        primaryLight: 'var(--e-global-color-red-light)',
        secondary: 'var(--e-global-color-yellow)',
        secondaryDark: 'var(--e-global-color-yellow-dark)',
        secondaryLight: 'var(--e-global-color-yellow-light)',
      },
      {
        name: 'GreenBlue',
        primary: 'var(--e-global-color-green)',
        primaryDark: 'var(--e-global-color-green-dark)',
        primaryLight: 'var(--e-global-color-green-light)',
        secondary: 'var(--e-global-color-blue)',
        secondaryDark: 'var(--e-global-color-blue-dark)',
        secondaryLight: 'var(--e-global-color-blue-light)',
      },
      {
        name: 'YellowRed',
        primary: 'var(--e-global-color-yellow)',
        primaryDark: 'var(--e-global-color-yellow-dark)',
        primaryLight: 'var(--e-global-color-yellow-light)',
        secondary: 'var(--e-global-color-red)',
        secondaryDark: 'var(--e-global-color-red-dark)',
        secondaryLight: 'var(--e-global-color-red-light)',
      },
      {
        name: 'BlueYellow',
        primary: 'var(--e-global-color-blue)',
        primaryDark: 'var(--e-global-color-blue-dark)',
        primaryLight: 'var(--e-global-color-blue-light)',
        secondary: 'var(--e-global-color-yellow)',
        secondaryDark: 'var(--e-global-color-yellow-dark)',
        secondaryLight: 'var(--e-global-color-yellow-light)',
      },
      {
        name: 'RedGreen',
        primary: 'var(--e-global-color-red)',
        primaryDark: 'var(--e-global-color-red-dark)',
        primaryLight: 'var(--e-global-color-red-light)',
        secondary: 'var(--e-global-color-green)',
        secondaryDark: 'var(--e-global-color-green-dark)',
        secondaryLight: 'var(--e-global-color-green-light)',
      },
      {
        name: 'GreenRed',
        primary: 'var(--e-global-color-green)',
        primaryDark: 'var(--e-global-color-green-dark)',
        primaryLight: 'var(--e-global-color-green-light)',
        secondary: 'var(--e-global-color-red)',
        secondaryDark: 'var(--e-global-color-red-dark)',
        secondaryLight: 'var(--e-global-color-red-light)',
      },
      {
        name: 'YellowBlue',
        primary: 'var(--e-global-color-yellow)',
        primaryDark: 'var(--e-global-color-yellow-dark)',
        primaryLight: 'var(--e-global-color-yellow-light)',
        secondary: 'var(--e-global-color-blue)',
        secondaryDark: 'var(--e-global-color-blue-dark)',
        secondaryLight: 'var(--e-global-color-blue-light)',
      },
];

const DynamicThemeHandler = () => {
  // 1. Añadimos un estado para saber si el componente ya se montó en el cliente.
  const [isMounted, setIsMounted] = useState(false);

  // 2. Este useEffect se ejecuta una sola vez en el cliente, justo después del montaje inicial.
  useEffect(() => {
    // Cuando se ejecuta, actualizamos el estado para indicar que ya estamos en el cliente.
    setIsMounted(true);
  }, []); // El array vacío asegura que se ejecute solo una vez.

  // 3. Este segundo useEffect contiene tu lógica original, pero ahora depende de `isMounted`.
  useEffect(() => {
    // Solo ejecutamos la lógica de cambio de tema si el componente ya se ha montado.
    // Esto evita el error de hidratación, porque el primer render en el cliente será idéntico al del servidor.
    if (isMounted) {
      // Selecciona una paleta al azar
      const randomIndex = Math.floor(Math.random() * palettes.length);
      const selectedPalette = palettes[randomIndex];

      const root = document.documentElement;

      // Aplica los colores de la paleta seleccionada
      root.style.setProperty('--color-primary', selectedPalette.primary);
      root.style.setProperty('--color-secondary', selectedPalette.secondary);
      root.style.setProperty('--color-primary-V1', selectedPalette.primaryDark);
      root.style.setProperty('--color-primary-V2', selectedPalette.primaryLight);
      root.style.setProperty('--color-secondary-V1', selectedPalette.secondaryDark);
      root.style.setProperty('--color-secondary-V2', selectedPalette.secondaryLight);

      // Indicar que el tema inicial ha sido aplicado y disparar un evento
      root.setAttribute('data-initial-theme-applied', 'true');
      const event = new CustomEvent('themeApplied', { detail: { paletteName: selectedPalette.name } });
      document.documentElement.dispatchEvent(event);
      console.log(`[DynamicThemeHandler] Theme applied: ${selectedPalette.name}. Event dispatched. Attribute 'data-initial-theme-applied' set.`);
    }
  }, [isMounted]); // Se ejecutará cada vez que `isMounted` cambie (es decir, una vez, a `true`).

  return null; // Este componente no renderiza nada, solo ejecuta lógica.
};

export default DynamicThemeHandler;