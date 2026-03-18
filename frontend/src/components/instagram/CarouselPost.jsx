import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Circle } from "lucide-react";

export function CarouselPost({ mediaItems, className = "" }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);

  const goToSlide = (index) => {
    if (index < 0 || index >= mediaItems.length) return;
    setCurrentIndex(index);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToSlide(currentIndex + 1);
      } else {
        goToSlide(currentIndex - 1);
      }
    }
    
    setTouchStart(null);
  };

  if (!mediaItems || mediaItems.length === 0) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Media Container */}
      <div
        ref={containerRef}
        className="relative aspect-square"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {mediaItems[currentIndex].type === "video" ? (
              <video
                src={mediaItems[currentIndex].url}
                className="w-full h-full object-cover"
                style={{ filter: mediaItems[currentIndex].filter || "" }}
                controls
              />
            ) : (
              <img
                src={mediaItems[currentIndex].url}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: mediaItems[currentIndex].filter || "" }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows (desktop) */}
        {mediaItems.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={() => goToSlide(currentIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors z-10"
              >
                <ChevronLeft className="w-5 h-5 text-gray-800" />
              </button>
            )}
            {currentIndex < mediaItems.length - 1 && (
              <button
                onClick={() => goToSlide(currentIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors z-10"
              >
                <ChevronRight className="w-5 h-5 text-gray-800" />
              </button>
            )}
          </>
        )}

        {/* Slide Counter */}
        {mediaItems.length > 1 && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium z-10">
            {currentIndex + 1}/{mediaItems.length}
          </div>
        )}
      </div>

      {/* Dot Indicators */}
      {mediaItems.length > 1 && (
        <div className="flex justify-center gap-1.5 py-3">
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-[var(--primary)] w-4"
                  : "bg-[var(--border)]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Carousel creator for upload
export function CarouselCreator({ mediaItems, onReorder, onRemove, onAddFilter }) {
  const [dragIndex, setDragIndex] = useState(null);

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    
    const newItems = [...mediaItems];
    const [removed] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, removed);
    
    onReorder(newItems);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <div className="flex gap-2 overflow-x-auto p-2">
      {mediaItems.map((item, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden cursor-move ${
            dragIndex === index ? "opacity-50" : ""
          }`}
        >
          {item.type === "video" ? (
            <video src={item.url} className="w-full h-full object-cover" />
          ) : (
            <img
              src={item.url}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: item.filter || "" }}
            />
          )}
          
          {/* Index badge */}
          <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">
            {index + 1}
          </div>
          
          {/* Remove button */}
          <button
            onClick={() => onRemove(index)}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-red-500"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default CarouselPost;
