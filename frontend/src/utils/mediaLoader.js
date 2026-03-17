/**
 * Media Content Loader with auto-refresh and caching
 * Handles automatic loading and updating of all media content
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedApiCall, clearCache, preloadImages, onConnectionChange } from './network';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Auto-refresh intervals
const REFRESH_INTERVALS = {
  feed: 30000,      // 30 seconds
  stories: 60000,   // 1 minute
  reels: 60000,     // 1 minute
  messages: 10000,  // 10 seconds (when chat is open)
  notifications: 30000, // 30 seconds
};

// Media preload queue
const preloadQueue = [];
let isPreloading = false;

/**
 * Hook for auto-refreshing feed content
 */
export function useFeedLoader(token) {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);
  const isOnlineRef = useRef(true);

  const fetchFeed = useCallback(async (silent = false) => {
    if (!token) return;
    
    if (!silent) setLoading(true);
    setError(null);

    try {
      const data = await cachedApiCall(`/api/feed?token=${token}`);
      setFeed(data);
      setLastUpdate(new Date());

      // Preload images for better UX
      const imageUrls = [];
      if (data.posts) {
        data.posts.forEach(post => {
          if (post.media_url) imageUrls.push(post.media_url);
          if (post.user?.avatar) imageUrls.push(post.user.avatar);
        });
      }
      if (data.stories) {
        data.stories.forEach(story => {
          if (story.media_url) imageUrls.push(story.media_url);
          if (story.user?.avatar) imageUrls.push(story.user.avatar);
        });
      }
      
      // Preload in background
      queuePreload(imageUrls);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Auto-refresh
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (isOnlineRef.current && document.visibilityState === 'visible') {
        fetchFeed(true); // Silent refresh
      }
    }, REFRESH_INTERVALS.feed);

    return () => clearInterval(intervalRef.current);
  }, [fetchFeed]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isOnlineRef.current) {
        fetchFeed(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchFeed]);

  // Handle connection change
  useEffect(() => {
    return onConnectionChange(({ isOnline }) => {
      isOnlineRef.current = isOnline;
      if (isOnline) {
        fetchFeed(true); // Refresh when back online
      }
    });
  }, [fetchFeed]);

  const refresh = useCallback(() => {
    clearCache('/api/feed');
    return fetchFeed();
  }, [fetchFeed]);

  return { feed, loading, error, lastUpdate, refresh };
}

/**
 * Hook for auto-refreshing stories
 */
export function useStoriesLoader(token) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    if (!token) return;

    try {
      const data = await cachedApiCall(`/api/stories?token=${token}`);
      setStories(data.stories || []);

      // Preload story media
      const urls = data.stories?.map(s => s.media_url).filter(Boolean) || [];
      queuePreload(urls);
    } catch (err) {
      console.error('Failed to load stories:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, REFRESH_INTERVALS.stories);
    return () => clearInterval(interval);
  }, [fetchStories]);

  return { stories, loading, refresh: fetchStories };
}

/**
 * Hook for auto-refreshing reels
 */
export function useReelsLoader(token) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchReels = useCallback(async (pageNum = 0, append = false) => {
    if (!token) return;

    try {
      const data = await cachedApiCall(`/api/reels?token=${token}&skip=${pageNum * 10}&limit=10`);
      
      if (append) {
        setReels(prev => [...prev, ...(data.reels || [])]);
      } else {
        setReels(data.reels || []);
      }
      
      setHasMore((data.reels || []).length === 10);

      // Preload video thumbnails
      const urls = data.reels?.map(r => r.thumbnail_url).filter(Boolean) || [];
      queuePreload(urls);
    } catch (err) {
      console.error('Failed to load reels:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(nextPage, true);
    }
  }, [hasMore, loading, page, fetchReels]);

  const refresh = useCallback(() => {
    clearCache('/api/reels');
    setPage(0);
    return fetchReels(0);
  }, [fetchReels]);

  return { reels, loading, hasMore, loadMore, refresh };
}

/**
 * Hook for auto-refreshing notifications
 */
export function useNotificationsLoader(token) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    try {
      const data = await cachedApiCall(`/api/notifications?token=${token}`);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, REFRESH_INTERVALS.notifications);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return { notifications, unreadCount, refresh: fetchNotifications };
}

/**
 * Queue images for background preloading
 */
function queuePreload(urls) {
  const uniqueUrls = urls.filter(url => url && !preloadQueue.includes(url));
  preloadQueue.push(...uniqueUrls);
  processPreloadQueue();
}

/**
 * Process preload queue in batches
 */
async function processPreloadQueue() {
  if (isPreloading || preloadQueue.length === 0) return;
  
  isPreloading = true;
  
  while (preloadQueue.length > 0) {
    const batch = preloadQueue.splice(0, 5); // Load 5 at a time
    try {
      await preloadImages(batch);
    } catch (err) {
      // Ignore preload errors
    }
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isPreloading = false;
}

/**
 * Lazy image component with loading state
 */
export function LazyImage({ src, alt, className, placeholder, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = src;
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <div className={`relative ${className}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
      )}
      <img
        ref={imgRef}
        alt={alt}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        {...props}
      />
      {error && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded">
          {placeholder}
        </div>
      )}
    </div>
  );
}

export default {
  useFeedLoader,
  useStoriesLoader,
  useReelsLoader,
  useNotificationsLoader,
  LazyImage,
};
