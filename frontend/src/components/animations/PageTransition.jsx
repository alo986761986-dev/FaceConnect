import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Animation variants for different page types
const pageVariants = {
  // Default fade and slide up
  default: {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.98 }
  },
  
  // Slide from right (for forward navigation)
  slideRight: {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 }
  },
  
  // Slide from left (for back navigation)
  slideLeft: {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 30 }
  },
  
  // Scale up (for modals, detail views)
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  },
  
  // Slide up (for bottom sheets, create screens)
  slideUp: {
    initial: { opacity: 0, y: '100%' },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: '100%' }
  },
  
  // Fade only (for subtle transitions)
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  
  // None (instant)
  none: {
    initial: {},
    animate: {},
    exit: {}
  }
};

// Transition configurations
const transitions = {
  default: {
    type: 'tween',
    duration: 0.25,
    ease: [0.4, 0, 0.2, 1]
  },
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30
  },
  fast: {
    type: 'tween',
    duration: 0.15,
    ease: [0.4, 0, 0.2, 1]
  },
  slow: {
    type: 'tween',
    duration: 0.35,
    ease: [0.4, 0, 0.2, 1]
  }
};

// Determine animation based on route
function getVariantForRoute(pathname) {
  // Detail/modal views
  if (pathname.includes('/post/') || pathname.includes('/story/') || pathname.includes('/profile/')) {
    return 'scale';
  }
  
  // Create screens
  if (pathname.includes('/create') || pathname.includes('/new')) {
    return 'slideUp';
  }
  
  // Settings, preferences
  if (pathname.includes('/settings') || pathname.includes('/edit')) {
    return 'slideRight';
  }
  
  // Default
  return 'default';
}

// Main PageTransition wrapper
export function PageTransition({ children, variant = 'auto', transition = 'default' }) {
  const location = useLocation();
  
  const selectedVariant = variant === 'auto' 
    ? getVariantForRoute(location.pathname) 
    : variant;
  
  const variants = pageVariants[selectedVariant] || pageVariants.default;
  const transitionConfig = transitions[transition] || transitions.default;
  
  return (
    <motion.div
      key={location.pathname}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transitionConfig}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

// Wrapper for AnimatePresence at route level
export function PageTransitionWrapper({ children }) {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// List item animation for staggered lists
export function AnimatedListItem({ children, index = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'tween',
        duration: 0.25,
        delay: index * 0.05,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Card animation
export function AnimatedCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        delay
      }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Fade in animation
export function FadeIn({ children, delay = 0, duration = 0.25, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale in animation
export function ScaleIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide up animation (for bottom sheets)
export function SlideUp({ children, isOpen, className = '' }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Pop animation (for notifications, badges)
export function PopIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 25,
        delay
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered container
export function StaggerContainer({ children, staggerDelay = 0.05, className = '' }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered item (use inside StaggerContainer)
export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            type: 'tween',
            duration: 0.25,
            ease: [0.4, 0, 0.2, 1]
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Tap animation wrapper
export function TapScale({ children, scale = 0.96, className = '' }) {
  return (
    <motion.div
      whileTap={{ scale }}
      transition={{ duration: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Hover lift effect
export function HoverLift({ children, y = -2, className = '' }) {
  return (
    <motion.div
      whileHover={{ y, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
