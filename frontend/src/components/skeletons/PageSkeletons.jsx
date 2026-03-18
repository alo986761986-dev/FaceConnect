/**
 * Page-Specific Loading Skeletons
 * Provides instant visual feedback while pages load
 */
import { motion } from "framer-motion";

// Base skeleton shimmer animation
const shimmerClass = "animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]";

// Reusable skeleton primitives
export const SkeletonBox = ({ className = "", ...props }) => (
  <div className={`${shimmerClass} rounded-lg ${className}`} {...props} />
);

export const SkeletonCircle = ({ className = "", size = "w-10 h-10" }) => (
  <div className={`${shimmerClass} rounded-full ${size} ${className}`} />
);

export const SkeletonText = ({ className = "", lines = 1, width = "w-full" }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i} 
        className={`${shimmerClass} h-3 rounded ${i === lines - 1 && lines > 1 ? 'w-3/4' : width}`} 
      />
    ))}
  </div>
);

// ============================================
// HOME FEED SKELETON
// ============================================
export function HomeFeedSkeleton() {
  return (
    <div className="space-y-4">
      {/* Create Post Widget Skeleton */}
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mx-4 lg:mx-0">
        <div className="flex items-center gap-3">
          <SkeletonCircle size="w-10 h-10" />
          <SkeletonBox className="flex-1 h-10 rounded-full" />
        </div>
        <div className="flex justify-around mt-3 pt-3 border-t border-white/5">
          <SkeletonBox className="w-24 h-8" />
          <SkeletonBox className="w-24 h-8" />
          <SkeletonBox className="w-24 h-8" />
        </div>
      </div>

      {/* Stories Bar Skeleton */}
      <div className="flex gap-3 px-4 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
            <SkeletonCircle size="w-16 h-16" />
            <SkeletonBox className="w-14 h-2" />
          </div>
        ))}
      </div>

      {/* Post Skeletons */}
      {[...Array(3)].map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

// Single post skeleton
export function PostSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[var(--bg-secondary)] border-y md:border md:rounded-xl border-white/5"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <SkeletonCircle size="w-10 h-10" />
        <div className="flex-1">
          <SkeletonBox className="w-32 h-4 mb-2" />
          <SkeletonBox className="w-20 h-3" />
        </div>
        <SkeletonBox className="w-8 h-8 rounded-full" />
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <SkeletonText lines={2} />
      </div>

      {/* Image */}
      <SkeletonBox className="w-full aspect-square" />

      {/* Actions */}
      <div className="flex items-center justify-between p-4">
        <div className="flex gap-4">
          <SkeletonBox className="w-16 h-8" />
          <SkeletonBox className="w-16 h-8" />
          <SkeletonBox className="w-16 h-8" />
        </div>
        <SkeletonBox className="w-8 h-8" />
      </div>
    </motion.div>
  );
}

// ============================================
// GAMING PAGE SKELETON
// ============================================
export function GamingSkeleton() {
  return (
    <div className="p-4 space-y-6">
      {/* Featured Game Banner */}
      <SkeletonBox className="w-full h-48 rounded-2xl" />

      {/* Categories */}
      <div className="flex gap-2 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <SkeletonBox key={i} className="flex-shrink-0 w-20 h-8 rounded-full" />
        ))}
      </div>

      {/* Section Title */}
      <SkeletonBox className="w-32 h-6" />

      {/* Games Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function GameCardSkeleton() {
  return (
    <div>
      <SkeletonBox className="aspect-[4/3] rounded-xl" />
      <div className="mt-2 space-y-2">
        <SkeletonBox className="w-full h-4" />
        <SkeletonBox className="w-2/3 h-3" />
      </div>
    </div>
  );
}

// ============================================
// MARKETPLACE SKELETON
// ============================================
export function MarketplaceSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <SkeletonBox className="flex-1 h-10 rounded-full" />
        <SkeletonBox className="w-10 h-10 rounded-full" />
        <SkeletonBox className="w-10 h-10 rounded-full" />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-hidden pb-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1">
            <SkeletonBox className="w-14 h-14 rounded-xl" />
            <SkeletonBox className="w-12 h-2" />
          </div>
        ))}
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function ListingCardSkeleton() {
  return (
    <div>
      <SkeletonBox className="aspect-square rounded-xl" />
      <div className="mt-2 space-y-1">
        <SkeletonBox className="w-20 h-5" />
        <SkeletonBox className="w-full h-4" />
        <SkeletonBox className="w-2/3 h-3" />
      </div>
    </div>
  );
}

// ============================================
// GROUPS SKELETON
// ============================================
export function GroupsSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <SkeletonBox className="w-full h-10 rounded-full" />

      {/* Tabs */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <SkeletonBox key={i} className="flex-1 h-10 rounded-full" />
        ))}
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <GroupCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function GroupCardSkeleton() {
  return (
    <div className="bg-white/5 rounded-xl overflow-hidden">
      <SkeletonBox className="h-24" />
      <div className="p-3 space-y-2">
        <SkeletonBox className="w-3/4 h-5" />
        <SkeletonBox className="w-full h-3" />
        <SkeletonBox className="w-1/2 h-3" />
        <SkeletonBox className="w-full h-9 mt-3 rounded-lg" />
      </div>
    </div>
  );
}

// ============================================
// EVENTS SKELETON
// ============================================
export function EventsSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <SkeletonBox key={i} className="flex-1 h-10 rounded-full" />
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function EventCardSkeleton() {
  return (
    <div className="bg-white/5 rounded-xl overflow-hidden">
      <SkeletonBox className="h-40" />
      <div className="p-3 space-y-2">
        <SkeletonBox className="w-1/3 h-3" />
        <SkeletonBox className="w-3/4 h-5" />
        <SkeletonBox className="w-1/2 h-3" />
        <div className="flex gap-2 mt-3">
          <SkeletonBox className="flex-1 h-9 rounded-lg" />
          <SkeletonBox className="flex-1 h-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// WATCH/VIDEO SKELETON
// ============================================
export function WatchSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <SkeletonBox className="w-full h-10 rounded-full" />

      {/* Categories */}
      <div className="flex gap-2 overflow-hidden">
        {[...Array(7)].map((_, i) => (
          <SkeletonBox key={i} className="flex-shrink-0 w-24 h-10 rounded-full" />
        ))}
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function VideoCardSkeleton() {
  return (
    <div>
      <SkeletonBox className="aspect-video rounded-xl" />
      <div className="flex gap-3 mt-3">
        <SkeletonCircle size="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="w-full h-4" />
          <SkeletonBox className="w-3/4 h-3" />
          <SkeletonBox className="w-1/2 h-3" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// MEMORIES SKELETON
// ============================================
export function MemoriesSkeleton() {
  return (
    <div className="p-4 space-y-6">
      {/* Date Navigator */}
      <div className="flex items-center justify-between">
        <SkeletonBox className="w-10 h-10 rounded-full" />
        <div className="text-center space-y-1">
          <SkeletonBox className="w-24 h-5 mx-auto" />
          <SkeletonBox className="w-16 h-3 mx-auto" />
        </div>
        <SkeletonBox className="w-10 h-10 rounded-full" />
      </div>

      {/* Memory Sections */}
      {[...Array(2)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center gap-3">
            <SkeletonCircle size="w-12 h-12" />
            <div className="space-y-2">
              <SkeletonBox className="w-24 h-4" />
              <SkeletonBox className="w-32 h-3" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SkeletonBox className="aspect-square rounded-xl" />
            <SkeletonBox className="aspect-square rounded-xl" />
          </div>
          <SkeletonBox className="w-full h-10 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// CHAT SKELETON
// ============================================
export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 p-4 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`flex gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
            <SkeletonCircle size="w-8 h-8" />
            <SkeletonBox className={`${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} h-12 rounded-2xl`} />
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <SkeletonBox className="w-10 h-10 rounded-full" />
          <SkeletonBox className="flex-1 h-10 rounded-full" />
          <SkeletonBox className="w-10 h-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// PROFILE SKELETON
// ============================================
export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      {/* Cover */}
      <SkeletonBox className="w-full h-32 md:h-48" />

      {/* Avatar & Info */}
      <div className="px-4 -mt-12 relative">
        <SkeletonCircle size="w-24 h-24" className="border-4 border-[var(--bg-primary)]" />
        <div className="mt-3 space-y-2">
          <SkeletonBox className="w-40 h-6" />
          <SkeletonBox className="w-24 h-4" />
          <SkeletonBox className="w-full h-12" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-around px-4 py-4 border-y border-white/10">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center space-y-1">
            <SkeletonBox className="w-12 h-5 mx-auto" />
            <SkeletonBox className="w-16 h-3 mx-auto" />
          </div>
        ))}
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-3 gap-1 px-1">
        {[...Array(9)].map((_, i) => (
          <SkeletonBox key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// REELS SKELETON
// ============================================
export function ReelsSkeleton() {
  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="relative w-full max-w-md aspect-[9/16]">
        <SkeletonBox className="absolute inset-0 rounded-none" />
        
        {/* Right side actions */}
        <div className="absolute right-4 bottom-24 space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <SkeletonCircle size="w-10 h-10" />
              <SkeletonBox className="w-8 h-2" />
            </div>
          ))}
        </div>

        {/* Bottom info */}
        <div className="absolute left-4 bottom-24 right-16 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonCircle size="w-10 h-10" />
            <SkeletonBox className="w-24 h-4" />
          </div>
          <SkeletonBox className="w-full h-10" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPLORE SKELETON
// ============================================
export function ExploreSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="p-4">
        <SkeletonBox className="w-full h-10 rounded-full" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-1">
        {[...Array(15)].map((_, i) => {
          const isLarge = i === 0 || i === 5 || i === 10;
          return (
            <SkeletonBox 
              key={i} 
              className={`${isLarge ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'}`} 
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// SIDEBAR SKELETONS
// ============================================
export function LeftSidebarSkeleton() {
  return (
    <div className="p-3 space-y-2">
      {/* User */}
      <div className="flex items-center gap-3 p-2">
        <SkeletonCircle size="w-9 h-9" />
        <SkeletonBox className="w-24 h-4" />
      </div>

      {/* Nav Items */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <SkeletonCircle size="w-9 h-9" />
          <SkeletonBox className="w-20 h-4" />
        </div>
      ))}

      <div className="h-px bg-white/10 my-3" />

      {/* Shortcuts */}
      <SkeletonBox className="w-24 h-3 mb-2" />
      {[...Array(2)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <SkeletonBox className="w-9 h-9 rounded-lg" />
          <SkeletonBox className="w-28 h-3" />
        </div>
      ))}
    </div>
  );
}

export function RightSidebarSkeleton() {
  return (
    <div className="p-4 space-y-5">
      {/* Sponsored */}
      <div>
        <SkeletonBox className="w-20 h-3 mb-3" />
        <div className="flex gap-3">
          <SkeletonBox className="w-32 h-32 rounded-lg" />
          <div className="flex-1 space-y-2">
            <SkeletonBox className="w-full h-4" />
            <SkeletonBox className="w-2/3 h-3" />
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* Friend Suggestions */}
      <div>
        <div className="flex justify-between mb-3">
          <SkeletonBox className="w-32 h-3" />
          <SkeletonBox className="w-12 h-3" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <SkeletonCircle size="w-10 h-10" />
            <div className="flex-1 space-y-1">
              <SkeletonBox className="w-24 h-4" />
              <SkeletonBox className="w-16 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Default export with all skeletons
export default {
  HomeFeedSkeleton,
  PostSkeleton,
  GamingSkeleton,
  MarketplaceSkeleton,
  GroupsSkeleton,
  EventsSkeleton,
  WatchSkeleton,
  MemoriesSkeleton,
  ChatSkeleton,
  ProfileSkeleton,
  ReelsSkeleton,
  ExploreSkeleton,
  LeftSidebarSkeleton,
  RightSidebarSkeleton,
  SkeletonBox,
  SkeletonCircle,
  SkeletonText
};
