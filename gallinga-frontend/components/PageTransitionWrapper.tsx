"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React from 'react';

interface PageTransitionWrapperProps {
  children: React.ReactNode;
}

const PageTransitionWrapper: React.FC<PageTransitionWrapperProps> = ({ children }) => {
  const pathname = usePathname();

  const pageVariants = {
    initialState: {
      opacity: 0,
      y: 10, // Comienza ligeramente abajo
    },
    animateState: {
      opacity: 1,
      y: 0,
    },
    exitState: {
      opacity: 0,
      y: -10, // Se va ligeramente hacia arriba
    },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname} // Clave única para cada ruta, crucial para que AnimatePresence detecte cambios
        initial="initialState"
        animate="animateState"
        exit="exitState"
        variants={pageVariants}
        className="bg-background relative z-0" // Añadir position relative y z-index
        transition={{ duration: 0.3, ease: "easeInOut" }} // Ajusta duración y tipo de easing
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransitionWrapper;