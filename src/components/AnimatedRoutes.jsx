import React from 'react';
import { Routes, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Wrapper para Routes que adiciona animações de slide-in/out
 * Cada rota transition com suavidade
 */
export default function AnimatedRoutes({ children }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <Routes>{children}</Routes>
      </motion.div>
    </AnimatePresence>
  );
}