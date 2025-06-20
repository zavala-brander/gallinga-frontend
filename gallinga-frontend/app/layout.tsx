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

const APP_BASE_URL = 'https://gallinga.purakasaka.com';
const PURAKASAKA_URL = 'https://purakasaka.com';

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(APP_BASE_URL),
    title: {
      default: "Historias de la Gallinga: Juego de Creatividad Colaborativa con IA | Pura Kasaka",
      template: "%s | Historias de la Gallinga - Pura Kasaka", // Consistent with new default
    },
    description: "Juego web colaborativo de Pura Kasaka que utiliza IA para que los usuarios co-creen una historia animada, escena por escena.",
    icons: {
      // 'icon.svg' y 'favicon.ico' en la carpeta /app son detectados automáticamente.
      apple: '/apple-icon.png', // Mantenemos esta línea si apple-icon.png está en /public
    },
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: "Historias de la Gallinga: Cocrea la Historia de Brujilda la Gallina con IA",
      description: "Únete a la comunidad y ayuda a escribir y visualizar la historia de Brujilda la Gallina usando IA. Un proyecto de Pura Kasaka.", // Refined description
      url: APP_BASE_URL,
      siteName: 'Historias de la Gallinga (App de Pura Kasaka)',
      images: [
        {
          url: '/og-image-gallinga.png', // Asegúrate de crear esta imagen
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
      title: "Historias de la Gallinga: Crea con IA | Pura Kasaka", // Consistent with new default
      description: "Participa en la creación colaborativa de la historia de Brujilda la Gallina.", // Consistent with new default
      images: [`${APP_BASE_URL}/og-image-gallinga.png`],
      creator: '@PuraKasaka', // Tu usuario de X (Twitter)
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
            "@id": `${PURAKASAKA_URL}#organization`,
            "name": "Pura Kasaka",
            "alternateName": "Gallinero de Animación", // Keep this as per refined entities
            "url": PURAKASAKA_URL,
            "logo": `${PURAKASAKA_URL}/wp-content/uploads/2023/10/logo-purakasaka-original.svg`,
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
            "url": APP_BASE_URL,
            "name": "Historias de la Gallinga (App de Pura Kasaka)", // More specific name
            "description": "Juego web colaborativo de Pura Kasaka que utiliza IA para que los usuarios co-creen una historia animada, escena por escena.",
            "publisher": {
              "@type": "Organization",
              "@id": `${PURAKASAKA_URL}#organization`
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
