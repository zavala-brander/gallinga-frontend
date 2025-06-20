"use client";
import React from 'react';

interface ImageSerialNumberProps {
  serialNumber: string | null;
  className?: string; // Para permitir clases de posicionamiento y hover desde el padre
}

export const ImageSerialNumber: React.FC<ImageSerialNumberProps> = ({ serialNumber, className = '' }) => {
  if (!serialNumber) return null;

  return (
    <div className={`absolute p-1 px-2 bg-slate-100 text-slate-700 text-xs font-mono rounded-sm  ${className}`}>
      {serialNumber}
    </div>
  );
};