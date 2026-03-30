// Desktop Layout Components
export { default as ChatListItem } from './ChatListItem';
export { default as CopilotPanel } from './CopilotPanel';
export { default as AIPanel } from './AIPanel';
export { default as DesktopSidebar, getSidebarItems } from './DesktopSidebar';
export { default as GamesPanel } from './GamesPanel';
export { default as MediaPanel } from './MediaPanel';
export { default as TranslationPanel } from './TranslationPanel';
export { default as DictionaryLookup, DictionaryPopup } from './DictionaryLookup';
export { default as CustomTitleBar } from './CustomTitleBar';

// New extracted components
export { default as ContactInfoPanel } from './ContactInfoPanel';
export { default as AccountPanel } from './AccountPanel';
export { default as NewGroupPanel } from './NewGroupPanel';
export { default as EmptyState } from './EmptyState';

// Phase 2 extracted components
export { default as ChatHeader } from './ChatHeader';
export { default as ArchivedChatsPanel } from './ArchivedChatsPanel';
export { default as StarredMessagesPanel } from './StarredMessagesPanel';
export { default as SocialMediaPopup } from './SocialMediaPopup';

// WhatsApp-style Status Panel
export { default as StatusPanel, StatusCreationModal, StatusViewer } from './StatusPanel';

// Animation variants for fade and slide effects
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.3 }
};

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 }
};
