// Page transition animations for smooth window switching
// Enhanced fade and slide animations for mobile app

// Main page transition variants - used for all route changes
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuad
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.55, 0.055, 0.675, 0.19], // easeInQuad
    },
  },
};

// Slide from right (for forward navigation)
export const slideRightVariants = {
  initial: {
    opacity: 0,
    x: 100,
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: {
      duration: 0.25,
      ease: [0.55, 0.055, 0.675, 0.19],
    },
  },
};

// Slide from left (for back navigation)
export const slideLeftVariants = {
  initial: {
    opacity: 0,
    x: -100,
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    x: 50,
    transition: {
      duration: 0.25,
      ease: [0.55, 0.055, 0.675, 0.19],
    },
  },
};

// Fade only (for modals and overlays)
export const fadeVariants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

// Scale up with fade (for modals)
export const modalVariants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  enter: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

// Panel slide variants (left panel)
export const leftPanelVariants = {
  initial: {
    opacity: 0,
    x: -280,
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 350,
    },
  },
  exit: {
    opacity: 0,
    x: -280,
    transition: {
      duration: 0.25,
      ease: "easeIn",
    },
  },
};

// Panel slide variants (right panel)
export const rightPanelVariants = {
  initial: {
    opacity: 0,
    x: 280,
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 350,
    },
  },
  exit: {
    opacity: 0,
    x: 280,
    transition: {
      duration: 0.25,
      ease: "easeIn",
    },
  },
};

// Backdrop fade
export const backdropVariants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.25,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

// Staggered children animation
export const staggerContainer = {
  enter: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: {
    opacity: 0,
    y: 10,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
    },
  },
};

// List item animation for feeds
export const listItemVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

// Button press animation
export const buttonTap = {
  scale: 0.95,
  transition: {
    duration: 0.1,
  },
};

// Hover animation
export const buttonHover = {
  scale: 1.02,
  transition: {
    duration: 0.2,
  },
};
