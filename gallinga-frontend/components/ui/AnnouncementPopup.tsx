"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Lottie from "lottie-react";
import gallingaLogo from "@/assets/lottie/gallinga-logo.json";
import { useLottieThemer } from '@/hooks/useLottieThemer';

// Usamos una clave versionada en localStorage. Si en el futuro cambias el anuncio,
// puedes cambiar la clave (ej. a '..._v2') para que se muestre de nuevo a todos los usuarios.
const ANNOUNCEMENT_STORAGE_KEY = 'gallingaAnnouncementDismissed_v1';

interface AnnouncementPopupProps {
  title: string;
  message: string;
}

export function AnnouncementPopup({ title, message }: AnnouncementPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lottieAnimationData = useLottieThemer(gallingaLogo);

  useEffect(() => {
    const isDismissed = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
    if (!isDismissed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-slate-700 dark:bg-slate-700 text-slate-200 border-slate-600" showCloseButton={true}>
        <DialogHeader className="items-center text-center pt-4">
          <div className="w-20 h-20"><Lottie animationData={lottieAnimationData} loop={true} /></div>
          <DialogTitle className="text-primary-light text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-slate-300 pt-2 px-4">{message.split('/').map((line, index) => (<p key={index} className={index > 0 ? 'mt-3 text-sm' : 'text-base'}>{line.trim()}</p>))}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button onClick={handleClose} className="w-full bg-primary hover:bg-primary/90">Seguir explorando / Continue Exploring</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}