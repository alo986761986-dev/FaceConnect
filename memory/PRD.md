# FaceConnect PRD

## Tech Stack
- React (lazy loading), Framer Motion, Capacitor
- FastAPI, MongoDB
- GitHub Actions

## Performance Optimizations (Dec 2024)
- React.lazy() for 18+ pages
- Suspense with spinner fallback
- GPU-accelerated animations
- Faster page transitions (0.25s)

## Page-Specific Skeletons
- HomeFeedSkeleton, PostSkeleton
- GamingSkeleton, WatchSkeleton, MarketplaceSkeleton
- GroupsSkeleton, EventsSkeleton, MemoriesSkeleton
- ProfileSkeleton, ChatSkeleton, ReelsSkeleton, ExploreSkeleton
- LeftSidebarSkeleton, RightSidebarSkeleton

## Responsive Design
- Desktop: Three-column (280px + flex + 320px)
- Ultra-wide: 1920px, 2560px+
- Tablet/Mobile: Responsive breakpoints
- Touch: 48px targets

## Social Pages (MOCKED)
- Watch, Marketplace, Groups, Events, Memories, Gaming

## Pending
- Backend APIs for new pages
- server.py refactor
- iOS build

## Last Updated
December 2024 - Added page-specific loading skeletons
