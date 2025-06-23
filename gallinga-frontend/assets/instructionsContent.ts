// /home/welcome/gallinga-app/gallinga-frontend/assets/instructionsContent.ts

import React, { SVGProps } from 'react';
import {
  EyeIcon,
  LightbulbIcon,
  PencilIcon,
  MailIcon,
  SearchIcon, // Este es tu icono de lupa personalizado
} from '@/components/ui/icons';

interface InstructionStep {
  id: string;
  icon?: React.FC<SVGProps<SVGSVGElement>>;
  heading?: string;
  text: string;
}

interface LanguageInstructions {
  title: string;
  steps: InstructionStep[];
  outro: string;
  projectLinkText: string;
  projectUrl: string;
}

export const instructionsContent: { [key: string]: LanguageInstructions } = {
  es: {
    title: "Continúa la Historia de Brujilda la Gallina",
    steps: [
      {
        id: "intro",
        text: "En Pura kaSaka estamos bloqueados y necesitamos tu ayuda para escribir la historia de Brujilda la Gallina."
      },
      {
        id: "observe",
        icon: EyeIcon,
        heading: "¿Cómo funciona?",
        text: "Mira lo que creó tu anterior colega (está en la página principal, ¡no tiene pierde!). Tu misión es darle continuidad."
      },
      {
        id: "write",
        icon: LightbulbIcon,
        heading: "¡Inspírate y Escribe!",
        text: "Cuando la inspiración te ataque, escribe la continuación de la historia."
      },
      {
        id: "sign",
        icon: PencilIcon,
        heading: "Firma tu Obra",
        text: "Pon tu nombre. Si quieres más \"fama\", añade tu Instagram."
      },
      {
        id: "submit",
        icon: MailIcon,
        heading: "¡Envía y Aprueba!",
        text: "Dale a enviar y aprobar."
      },
      {
        id: "gallery",
        icon: SearchIcon,
        heading: "Explora la Galería",
        text: "Visita la galería para ver las demás escenas creadas para la historia, califica, descarga y comparte. Las mejor puntuadas serán las elegidas para el corte final."
      }
    ],
    outro: "¡Cocinemos juntos una buena historia!",
    projectLinkText: "Conoce el proyecto",
    projectUrl: "https://purakasaka.com/proyecto/historias-de-la-gallinga/"
  },
  en: {
    title: "The Story of Brujilda the Hen Continues",
    steps: [
      {
        id: "intro",
        text: "At Pura kaSaka, we're stuck, and we need your help to cook up the story of Brujilda the Hen."
      },
      {
        id: "observe",
        icon: EyeIcon,
        heading: "How Does It Work?",
        text: "Check out what your previous colleague created (it's on the main page, you can't miss it!). Your mission is to continue the story."
      },
      {
        id: "write",
        icon: LightbulbIcon,
        heading: "Get Inspired & Write!",
        text: "When inspiration strikes, write the next part of the story."
      },
      {
        id: "sign",
        icon: PencilIcon,
        heading: "Sign Your Work",
        text: "Put your name. If you want more \"fame,\" add your Instagram."
      },
      {
        id: "submit",
        icon: MailIcon,
        heading: "Send & Approve!",
        text: "Click send and approve."
      },
      {
        id: "gallery",
        icon: SearchIcon,
        heading: "Explore the Gallery",
        text: "Visit the gallery to see the other scenes created for the story, rate, download, and share. The highest-rated scenes will be chosen for the final cut."
      }
    ],
    outro: "Let's cook up a great story together!",
    projectLinkText: "Learn about the project",
    projectUrl: "https://purakasaka.com/proyecto/historias-de-la-gallinga/"
  }
};

export type InstructionsLang = keyof typeof instructionsContent;
