import { motion } from "framer-motion";

// Shimmer animation for loading states
const shimmer = {
  initial: { x: "-100%" },
  animate: { 
    x: "100%",
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: "linear"
    }
  }
};

// Base skeleton component with shimmer
function Skeleton({ className = "", rounded = "rounded" }) {
  return (
    <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 ${rounded} ${className}`}>
      <motion.div
        variants={shimmer}
        initial="initial"
        animate="animate"
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent"
      />
    </div>
  );
}

// Post skeleton - Facebook style
export function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10" rounded="rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" rounded="rounded" />
          <Skeleton className="h-3 w-24" rounded="rounded" />
        </div>
        <Skeleton className="w-8 h-8" rounded="rounded-full" />
      </div>
      
      {/* Content */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-full" rounded="rounded" />
        <Skeleton className="h-4 w-4/5" rounded="rounded" />
        <Skeleton className="h-4 w-2/3" rounded="rounded" />
      </div>
      
      {/* Image placeholder */}
      <Skeleton className="h-64 w-full mb-4" rounded="rounded-lg" />
      
      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <Skeleton className="h-8 w-20" rounded="rounded" />
        <Skeleton className="h-8 w-24" rounded="rounded" />
        <Skeleton className="h-8 w-16" rounded="rounded" />
      </div>
    </div>
  );
}

// Story skeleton
export function StorySkeleton() {
  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-2">
      <Skeleton className="w-16 h-16" rounded="rounded-full" />
      <Skeleton className="h-3 w-14" rounded="rounded" />
    </div>
  );
}

// Comment skeleton
export function CommentSkeleton() {
  return (
    <div className="flex gap-2 py-2">
      <Skeleton className="w-8 h-8 flex-shrink-0" rounded="rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-16 w-full" rounded="rounded-2xl" />
        <div className="flex gap-4 mt-1 ml-3">
          <Skeleton className="h-3 w-8" rounded="rounded" />
          <Skeleton className="h-3 w-10" rounded="rounded" />
          <Skeleton className="h-3 w-8" rounded="rounded" />
        </div>
      </div>
    </div>
  );
}

// Notification skeleton
export function NotificationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-12 h-12" rounded="rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-full mb-2" rounded="rounded" />
        <Skeleton className="h-3 w-20" rounded="rounded" />
      </div>
      <Skeleton className="w-12 h-12" rounded="rounded-lg" />
    </div>
  );
}

// Chat message skeleton
export function MessageSkeleton({ isOwn = false }) {
  return (
    <div className={`flex gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && <Skeleton className="w-8 h-8 flex-shrink-0" rounded="rounded-full" />}
      <Skeleton 
        className={`h-10 ${isOwn ? 'w-40' : 'w-48'}`} 
        rounded="rounded-2xl" 
      />
    </div>
  );
}

// Profile card skeleton
export function ProfileCardSkeleton() {
  return (
    <div className="p-4 w-80">
      {/* Cover */}
      <Skeleton className="h-24 w-full mb-8" rounded="rounded-t-lg" />
      
      {/* Avatar - overlapping cover */}
      <div className="relative -mt-16 mb-3 flex justify-center">
        <Skeleton className="w-20 h-20 border-4 border-white dark:border-gray-800" rounded="rounded-full" />
      </div>
      
      {/* Name & Info */}
      <div className="text-center space-y-2">
        <Skeleton className="h-5 w-32 mx-auto" rounded="rounded" />
        <Skeleton className="h-3 w-24 mx-auto" rounded="rounded" />
      </div>
      
      {/* Stats */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="text-center">
          <Skeleton className="h-4 w-8 mx-auto mb-1" rounded="rounded" />
          <Skeleton className="h-3 w-12" rounded="rounded" />
        </div>
        <div className="text-center">
          <Skeleton className="h-4 w-8 mx-auto mb-1" rounded="rounded" />
          <Skeleton className="h-3 w-16" rounded="rounded" />
        </div>
        <div className="text-center">
          <Skeleton className="h-4 w-8 mx-auto mb-1" rounded="rounded" />
          <Skeleton className="h-3 w-14" rounded="rounded" />
        </div>
      </div>
      
      {/* Buttons */}
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-9 flex-1" rounded="rounded-lg" />
        <Skeleton className="h-9 flex-1" rounded="rounded-lg" />
      </div>
    </div>
  );
}

// Feed skeleton (multiple posts)
export function FeedSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

// Stories bar skeleton
export function StoriesBarSkeleton({ count = 6 }) {
  return (
    <div className="flex gap-4 overflow-hidden p-4">
      {Array.from({ length: count }).map((_, i) => (
        <StorySkeleton key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
