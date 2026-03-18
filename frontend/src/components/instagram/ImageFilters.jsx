import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Lock } from "lucide-react";
import { usePremium } from "@/context/PremiumContext";

const API = process.env.REACT_APP_BACKEND_URL;

// Instagram-style filters with CSS
export const FILTERS = [
  { id: "none", name: "Normal", css: "", premium: false },
  { id: "clarendon", name: "Clarendon", css: "contrast(1.2) saturate(1.35)", premium: false },
  { id: "gingham", name: "Gingham", css: "brightness(1.05) hue-rotate(-10deg)", premium: false },
  { id: "moon", name: "Moon", css: "grayscale(1) contrast(1.1) brightness(1.1)", premium: false },
  { id: "lark", name: "Lark", css: "contrast(0.9) brightness(1.1) saturate(0.85)", premium: false },
  { id: "reyes", name: "Reyes", css: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)", premium: false },
  { id: "juno", name: "Juno", css: "sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.8)", premium: true },
  { id: "slumber", name: "Slumber", css: "saturate(0.66) brightness(1.05)", premium: true },
  { id: "crema", name: "Crema", css: "sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9)", premium: true },
  { id: "ludwig", name: "Ludwig", css: "sepia(0.25) contrast(1.05) brightness(1.05) saturate(2)", premium: true },
  { id: "aden", name: "Aden", css: "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)", premium: true },
  { id: "perpetua", name: "Perpetua", css: "contrast(1.1) brightness(1.25) saturate(1.1)", premium: true },
  { id: "valencia", name: "Valencia", css: "contrast(1.08) brightness(1.08) sepia(0.08)", premium: true },
  { id: "xpro2", name: "X-Pro II", css: "sepia(0.3) contrast(1.2) saturate(1.3)", premium: true },
  { id: "willow", name: "Willow", css: "grayscale(0.5) contrast(0.95) brightness(0.9)", premium: true },
  { id: "inkwell", name: "Inkwell", css: "sepia(0.3) contrast(1.1) brightness(1.1) grayscale(1)", premium: true },
];

// Premium filters (for gating)
export const PREMIUM_FILTERS = FILTERS.filter(f => f.premium);
export const FREE_FILTERS = FILTERS.filter(f => !f.premium);

export function ImageFilterPicker({ imageUrl, selectedFilter, onSelectFilter, onPremiumRequired }) {
  const { isPremium } = usePremium();
  
  const handleFilterSelect = (filter) => {
    if (filter.premium && !isPremium) {
      onPremiumRequired?.("themes");
      return;
    }
    onSelectFilter(filter);
  };
  
  return (
    <div className="py-4">
      <p className="text-sm text-[var(--text-muted)] mb-3 px-4">Filters</p>
      
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {FILTERS.map((filter) => {
          const isLocked = filter.premium && !isPremium;
          
          return (
            <button
              key={filter.id}
              onClick={() => handleFilterSelect(filter)}
              className={`flex-shrink-0 flex flex-col items-center ${isLocked ? 'opacity-75' : ''}`}
            >
              <div className={`relative w-20 h-20 rounded-lg overflow-hidden ${
                selectedFilter?.id === filter.id ? "ring-2 ring-[var(--primary)]" : ""
              }`}>
                <img
                  src={imageUrl}
                  alt={filter.name}
                  className={`w-full h-full object-cover ${isLocked ? 'blur-[1px]' : ''}`}
                  style={{ filter: filter.css }}
                />
                {selectedFilter?.id === filter.id && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                )}
                {isLocked && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white" />
                  </div>
                )}
                {filter.premium && !isLocked && (
                  <div className="absolute top-1 right-1">
                    <Crown className="w-3 h-3 text-yellow-400" />
                  </div>
                )}
              </div>
              <span className={`text-xs mt-2 flex items-center gap-1 ${
                selectedFilter?.id === filter.id 
                  ? "text-[var(--primary)] font-medium" 
                  : "text-[var(--text-muted)]"
              }`}>
                {filter.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Preview component with filter applied
export function FilteredImage({ src, filter, className = "", style = {} }) {
  const filterCSS = filter?.css || "";
  
  return (
    <img
      src={src}
      className={className}
      style={{ ...style, filter: filterCSS }}
      alt=""
    />
  );
}

// Adjustments panel (brightness, contrast, etc.)
export function ImageAdjustments({ adjustments, onChange }) {
  const [values, setValues] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 0,
    fade: 0,
    highlights: 0,
    shadows: 0,
    vignette: 0,
    sharpen: 0,
    ...adjustments
  });

  const handleChange = (key, value) => {
    const newValues = { ...values, [key]: value };
    setValues(newValues);
    onChange?.(newValues);
  };

  const adjustmentsList = [
    { key: "brightness", label: "Brightness", min: 0, max: 200, unit: "%" },
    { key: "contrast", label: "Contrast", min: 0, max: 200, unit: "%" },
    { key: "saturation", label: "Saturation", min: 0, max: 200, unit: "%" },
    { key: "warmth", label: "Warmth", min: -100, max: 100, unit: "" },
    { key: "fade", label: "Fade", min: 0, max: 100, unit: "" },
    { key: "highlights", label: "Highlights", min: -100, max: 100, unit: "" },
    { key: "shadows", label: "Shadows", min: -100, max: 100, unit: "" },
    { key: "vignette", label: "Vignette", min: 0, max: 100, unit: "" },
    { key: "sharpen", label: "Sharpen", min: 0, max: 100, unit: "" },
  ];

  return (
    <div className="py-4 px-4 space-y-4">
      <p className="text-sm text-[var(--text-muted)] mb-3">Adjust</p>
      
      {adjustmentsList.map((adj) => (
        <div key={adj.key} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">{adj.label}</span>
            <span className="text-[var(--text-muted)]">
              {values[adj.key]}{adj.unit}
            </span>
          </div>
          <input
            type="range"
            min={adj.min}
            max={adj.max}
            value={values[adj.key]}
            onChange={(e) => handleChange(adj.key, parseInt(e.target.value))}
            className="w-full h-1 bg-[var(--muted)] rounded-full appearance-none cursor-pointer"
          />
        </div>
      ))}
    </div>
  );
}

// Convert adjustments to CSS filter string
export function adjustmentsToCSS(adjustments) {
  if (!adjustments) return "";
  
  const filters = [];
  
  if (adjustments.brightness !== 100) {
    filters.push(`brightness(${adjustments.brightness}%)`);
  }
  if (adjustments.contrast !== 100) {
    filters.push(`contrast(${adjustments.contrast}%)`);
  }
  if (adjustments.saturation !== 100) {
    filters.push(`saturate(${adjustments.saturation}%)`);
  }
  if (adjustments.warmth > 0) {
    filters.push(`sepia(${adjustments.warmth / 2}%)`);
  } else if (adjustments.warmth < 0) {
    filters.push(`hue-rotate(${adjustments.warmth}deg)`);
  }
  if (adjustments.fade > 0) {
    const opacity = 1 - (adjustments.fade / 200);
    filters.push(`opacity(${opacity})`);
  }
  
  return filters.join(" ");
}

export default ImageFilterPicker;
