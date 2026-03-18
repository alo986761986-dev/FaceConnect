/**
 * FaceConnect Animation System
 * Reusable animation components and variants using Framer Motion
 */
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

// ============== ANIMATION VARIANTS ==============

// Page transition variants
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// Fade variants (simple)
export const fadeVariants = {
  initial: { opacity: 0 },
  enter: { 
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

// Slide up variants
export const slideUpVariants = {
  initial: { opacity: 0, y: 30 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

// Slide from right (for modals/sidebars)
export const slideRightVariants = {
  initial: { opacity: 0, x: 50 },
  enter: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    x: 30,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

// Scale variants (for cards, buttons)
export const scaleVariants = {
  initial: { opacity: 0, scale: 0.9 },
  enter: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

// Stagger children variants
export const staggerContainerVariants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1
    }
  }
};

export const staggerItemVariants = {
  initial: { opacity: 0, y: 20 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  }
};

// Modal/Overlay variants
export const overlayVariants = {
  initial: { opacity: 0 },
  enter: { 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

export const modalVariants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  enter: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      duration: 0.3, 
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

// ============== ANIMATION COMPONENTS ==============

/**
 * Page wrapper with fade transition
 */
export function PageTransition({ children, className = "" }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Fade in/out wrapper
 */
export function FadeIn({ children, delay = 0, duration = 0.3, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Slide up animation
 */
export function SlideUp({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scale animation (good for cards)
 */
export function ScaleIn({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered list container
 */
export function StaggerContainer({ children, className = "" }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={staggerContainerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered list item
 */
export function StaggerItem({ children, className = "" }) {
  return (
    <motion.div
      variants={staggerItemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated route wrapper for page transitions
 */
export function AnimatedRoutes({ children }) {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hover scale effect
 */
export function HoverScale({ children, scale = 1.02, className = "" }) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Pulse animation (for notifications, badges)
 */
export function Pulse({ children, className = "" }) {
  return (
    <motion.div
      animate={{ 
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1]
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Shimmer loading effect
 */
export function Shimmer({ className = "" }) {
  return (
    <motion.div
      className={`bg-gradient-to-r from-transparent via-white/10 to-transparent ${className}`}
      animate={{ x: ["-100%", "100%"] }}
      transition={{ 
        duration: 1.5, 
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
}

// ============== ANIMATION HOOKS ==============

/**
 * Hook for scroll-triggered animations
 */
export function useScrollAnimation() {
  return {
    initial: { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.5, ease: "easeOut" }
  };
}

/**
 * Common animation presets
 */
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3 }
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3 }
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3 }
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.3 }
  },
  pop: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { type: "spring", stiffness: 300, damping: 20 }
  }
};

export default {
  PageTransition,
  FadeIn,
  SlideUp,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
  AnimatedRoutes,
  HoverScale,
  Pulse,
  Shimmer,
  animations,
  pageVariants,
  fadeVariants,
  slideUpVariants,
  scaleVariants,
  staggerContainerVariants,
  staggerItemVariants,
  modalVariants,
  overlayVariants
};
