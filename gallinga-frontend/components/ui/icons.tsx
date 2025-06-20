import React, { SVGProps } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowUp, // Usaremos ArrowUp para UpArrow
  Egg,
  Download,
  Eye,
  Lightbulb,
  Pencil,
  Mail,
  XCircle,        // Para el icono de Cancelar/Eliminar
  CheckCircle2,   // Para el icono de Aprobar
  // Los siguientes ya los tienes como SVG personalizados, pero si quisieras usar lucide:
  // Image as LucideImage, // Para GalleryIcon
  // Search as LucideSearch, // Para SearchIcon
  // User as LucideUser, // Para UserIcon
} from "lucide-react";

// Icono de carga
export function LoadingSpinner(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// Icono de Galería
export const GalleryIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="3" width="7" height="7" rx="1"></rect>
    <rect x="14" y="3" width="7" height="7" rx="1"></rect>
    <rect x="3" y="14" width="7" height="7" rx="1"></rect>
    <rect x="14" y="14" width="7" height="7" rx="1"></rect>
  </svg>
);

// Icono de Búsqueda
export const SearchIcon = (props: SVGProps<SVGSVGElement>) => ( 
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

// Icono de Usuario
export const UserIcon = (props: SVGProps<SVGSVGElement>) => ( 
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

// --- Iconos para Compartir (CORREGIDOS Y AÑADIDOS) ---
export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}

export function TwitterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>X</title>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
    // Añadido fill="currentColor" para que tome el color del texto por defecto
    return (
        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}>
            <title>Facebook</title>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    )
}

// --- Iconos Adicionales para app/page.tsx (usando lucide-react) ---
export const PlayIcon = (props: SVGProps<SVGSVGElement>) => <Play {...props} />;
export const PauseIcon = (props: SVGProps<SVGSVGElement>) => <Pause {...props} />;
export const SkipBackIcon = (props: SVGProps<SVGSVGElement>) => <SkipBack {...props} />;
export const SkipForwardIcon = (props: SVGProps<SVGSVGElement>) => <SkipForward {...props} />;
export const ChevronLeftIcon = (props: SVGProps<SVGSVGElement>) => <ChevronLeft {...props} />;
export const ChevronRightIcon = (props: SVGProps<SVGSVGElement>) => <ChevronRight {...props} />;
export const InfoIcon = (props: SVGProps<SVGSVGElement>) => <Info {...props} />;
export const UpArrow = (props: SVGProps<SVGSVGElement>) => <ArrowUp {...props} />; // Renombrado para coincidir con tu import
export const EggIcon = (props: SVGProps<SVGSVGElement>) => <Egg {...props} />;
export const DownloadIcon = (props: SVGProps<SVGSVGElement>) => <Download {...props} />;

// --- Iconos para Instrucciones (usando lucide-react) ---
export const EyeIcon = (props: SVGProps<SVGSVGElement>) => <Eye {...props} />;
export const LightbulbIcon = (props: SVGProps<SVGSVGElement>) => <Lightbulb {...props} />;
export const PencilIcon = (props: SVGProps<SVGSVGElement>) => <Pencil {...props} />;
export const MailIcon = (props: SVGProps<SVGSVGElement>) => <Mail {...props} />;

// --- Iconos para Acciones de Aprobación (usando lucide-react) ---
export const CancelIcon = (props: SVGProps<SVGSVGElement>) => <XCircle {...props} />;
export const ApproveIcon = (props: SVGProps<SVGSVGElement>) => <CheckCircle2 {...props} />;


export function CopyIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
    )
}

// Icono Purakasaka (nuevo)
export function PurakasakaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg id="Layer_2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86.96 100" {...props}>
      <defs>
        {/* El estilo .cls-1 se aplicará directamente al path. Si necesitas cambiar el color dinámicamente, considera usar fill="currentColor" y controlar el color con clases de Tailwind en el componente que lo usa. */}
      </defs>
      <g id="Layer_1-2">
        <path d="M86.96,98.88v1.12h-37.87v-1.12l3.42-7.04-17.57-27.41-3.97,3.14v24.27l9.27,7.04v1.12H0v-1.12l8.09-7.04V9.14L0,1.19V0h30.96v63.74l26.85-21.13-7.11-13.74v-1.12h32.29v.98l-20.01,13.88-10.46,8.09,25.87,39.89,8.58,8.3Z" style={{ fill: 'currentColor' }}/>
      </g>
    </svg>
  );
}

// Icono de Estrella (para el sistema de calificación)
export const StarIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = "h-5 w-5", ...props }) => (
  <svg {...props} className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354l-4.597 2.829c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z" clipRule="evenodd" />
  </svg>
);

// Add the new GallingaHenIcon:
export const GallingaHenIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" aria-hidden="true" {...props}>
    <path
      d="M70.26,12.66c-.72-.05-4.83-.26-7.44,2.98-2.44,3.02-1.7,6.7-1.59,7.22,1.34,10.83-2.61,21.11-10.54,26.59-5.23,3.62-10.76,4.15-13.71,4.18.22-1.15.44-3.03,0-5.26-.32-1.61-.64-3.27-1.89-4.56-2.42-2.5-7.66-2.85-10.45,0-1.57,1.61-1.83,3.68-1.88,4.54.31-1.44.65-3.9,0-6.79-.36-1.58-.63-2.81-1.6-3.87-2.58-2.83-8.42-2.74-11.02,0-1.3,1.37-1.52,3.13-1.6,3.85-2.71,27.62,11.37,39.37,11.37,39.37,10.63,8.87,25.31,10.07,35.88,6.11,19.07-7.15,31.39-33.6,24.66-63.6-1.34-6.11-5.58-10.4-10.2-10.74Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="7"
    />
    <path
      d="M61.43,18.27c.27-.87.7-1.77,1.38-2.62,2.61-3.24,6.72-3.03,7.44-2.98,2.77.2,5.4,1.83,7.35,4.42,1.3-1.24,2.31-2.65,2.89-4.05.23-.55,1.7-4.15.07-5.86-.62-.65-1.79-1.12-2.9-1.01-1.32.14-1.68,1.02-2.39.81-1.11-.32-.56-2.52-2.01-3.69-1.15-.93-3.17-.9-4.42-.08-1.51.99-1.25,2.73-2.27,2.94-1.18.24-1.81-2.03-3.79-2.67-1.98-.64-4.71.54-5.74,2.17-1.77,2.79.06,9.04,4.38,12.63Z"
      fill="currentColor"
    />
    <path
      d="M79.76,22.12c6.92-.29,11.68,2.38,11.84,4.67.15,2.17-3.78,5.13-9.6,6.24-.75-3.64-1.49-7.27-2.24-10.91Z"
      fill="currentColor"
    />
    <circle cx="71.09" cy="25.16" r="3.14" fill="currentColor" />
  </svg>
);
