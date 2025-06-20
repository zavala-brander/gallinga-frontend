import type { Metadata, Viewport } from "next";
import { Inter as FontInter } from "next/font/google"; // Renamed to avoid potential naming conflicts, and to clarify it's a font loader
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import React from "react";
import DynamicThemeHandler from "./components/DynamicThemeHandler"; // Client Component
import ThemeColorUpdater from "./components/ThemeColorUpdater"; // Client Component

const inter = FontInter({ // Instantiate the Inter font
  subsets: ['latin'],
  variable: '--font-inter', // Define a CSS variable name for Inter
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Gallinga: La Historia Sin Fin", // Texto en español
    description: "Crea y explora una historia visual sin fin generada por IA.", // Texto en español
    // Añadir la configuración de iconos aquí
    icons: {
      icon: [ // Puedes proporcionar un array para múltiples formatos o tamaños
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', type: 'image/x-icon', sizes: 'any' } // Fallback
      ],
      apple: '/apple-icon.png', // Si tienes un apple-touch-icon, colócalo en app/ y referéncialo
    },
  };
}

export const viewport: Viewport = {
  themeColor: [ // Para manejar el theme-color en light y dark mode
    { media: '(prefers-color-scheme: light)', color: '#ffffff' }, // O el color de fondo claro
    { media: '(prefers-color-scheme: dark)', color: '#000000' },  // O el color de fondo oscuro
  ],
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <DynamicThemeHandler />
      <ThemeColorUpdater />
      <body className={`${GeistSans.variable} ${inter.variable} font-sans antialiased relative`} suppressHydrationWarning>
        {children}
      </body>
    </html>

  );
}
