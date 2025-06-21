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

import { APP_BASE_URL, PURAKASAKA_URL } from '@/lib/apiConstants';

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(APP_BASE_URL),
    title: {
      default: "Historias de la Gallinga: Crea Cuentos con IA | Pura Kasaka",
      template: "%s | Historias de la Gallinga - Pura Kasaka",
    },
    description: "Participa en la creación de una historia visual sin fin con Brujilda la Gallina. Genera imágenes con IA y colabora en esta aventura creativa de Pura Kasaka.",
    icons: {
      icon: [
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', type: 'image/x-icon', sizes: 'any' }
      ],
      apple: '/assets/images/apple-icon.png',
    },
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: "Historias de la Gallinga por Pura Kasaka",
      description: "Únete a la comunidad y ayuda a escribir y visualizar la historia de Brujilda la Gallina usando IA. Un proyecto de Pura Kasaka.",
      url: APP_BASE_URL,
      siteName: 'Historias de la Gallinga (App de Pura Kasaka)',
      images: [
        {
          url: '/assets/images/og-image-gallinga.png',
          width: 1200,
          height: 630,
          alt: 'Brujilda la Gallina en la App Historias de la Gallinga de Pura Kasaka',
        },
      ],
      locale: 'es_ES',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: "Historias de la Gallinga: Crea con IA | Pura Kasaka",
      description: "Participa en la creación colaborativa de la historia de Brujilda la Gallina.",
      images: [`${APP_BASE_URL}/assets/images/og-image-gallinga.png`],
      creator: '@PuraKasaka',
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
      <head>
        {/* GEO: Schema para Organization (Pura Kasaka) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${PURAKASAKA_URL}#organization`, // ID único para tu organización
            "name": "Pura Kasaka",
            "alternateName": "Gallinero de Animación",
            "url": PURAKASAKA_URL,
            "logo": "https://purakasaka.com/wp-content/uploads/2025/06/logo-purakasaka-original.svg",
            "description": "Pura Kasaka es un estudio creativo especializado en servicios de animación para storytelling. Utiliza tecnología, incluyendo IA, para desarrollar proyectos para redes sociales y sitios web.",
            "sameAs": [
              "https://www.instagram.com/pura.kasaka/",
              "https://www.tiktok.com/@pura.kasaka",
              "https://www.youtube.com/@purakasaka",
              "https://www.threads.com/@pura.kasaka",
              "https://x.com/PuraKasaka",
              "https://www.linkedin.com/company/pura-kasaka"
            ]
          }) }}
        />
        {/* GEO: Schema para WebSite (Gallinga App) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": APP_BASE_URL, // ID único para este sitio web
            "url": APP_BASE_URL,
            "name": "Historias de la Gallinga",
            "description": "Juego web colaborativo de Pura Kasaka que utiliza IA para que los usuarios co-creen una historia animada, escena por escena.",
            "publisher": {
              "@type": "Organization",
              "@id": `${PURAKASAKA_URL}#organization` // Referencia a la entidad Organization
            },
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${APP_BASE_URL}/gallery?q={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          }) }}
        />
      </head>
      <DynamicThemeHandler />
      <ThemeColorUpdater />
      <body className={`${GeistSans.variable} ${inter.variable} font-sans antialiased relative`} suppressHydrationWarning>
        {children}
      </body>
    </html>

  );
}
