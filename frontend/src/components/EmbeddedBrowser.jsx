import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ArrowLeft, ArrowRight, RotateCw, Home, ExternalLink,
  Globe, Lock, Search, Maximize2, Minimize2, Chrome, Star,
  Plus, Copy, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Built-in Browser Component for Electron
export function EmbeddedBrowser({ isOpen, onClose, initialUrl, isDark }) {
  const [url, setUrl] = useState(initialUrl || 'https://www.google.com');
  const [inputUrl, setInputUrl] = useState(initialUrl || 'https://www.google.com');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [pageTitle, setPageTitle] = useState('New Tab');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [favorites, setFavorites] = useState([
    { name: 'Google', url: 'https://www.google.com', icon: '🔍' },
    { name: 'YouTube', url: 'https://www.youtube.com', icon: '📺' },
    { name: 'Facebook', url: 'https://www.facebook.com', icon: '👥' },
    { name: 'Instagram', url: 'https://www.instagram.com', icon: '📷' },
    { name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: '💬' },
    { name: 'Twitter', url: 'https://twitter.com', icon: '🐦' },
  ]);
  
  const webviewRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialUrl && isOpen) {
      setUrl(initialUrl);
      setInputUrl(initialUrl);
    }
  }, [initialUrl, isOpen]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStartLoading = () => setIsLoading(true);
    const handleStopLoading = () => setIsLoading(false);
    const handleDidNavigate = (e) => {
      setUrl(e.url);
      setInputUrl(e.url);
      setIsSecure(e.url.startsWith('https://'));
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    };
    const handleTitleUpdate = (e) => setPageTitle(e.title || 'New Tab');
    const handleNewWindow = (e) => {
      // Open new windows in the same webview
      e.preventDefault();
      webview.loadURL(e.url);
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate);
    webview.addEventListener('page-title-updated', handleTitleUpdate);
    webview.addEventListener('new-window', handleNewWindow);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
      webview.removeEventListener('page-title-updated', handleTitleUpdate);
      webview.removeEventListener('new-window', handleNewWindow);
    };
  }, [isOpen]);

  const navigate = (newUrl) => {
    let finalUrl = newUrl;
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      // Check if it's a search query or URL
      if (newUrl.includes('.') && !newUrl.includes(' ')) {
        finalUrl = 'https://' + newUrl;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(newUrl)}`;
      }
    }
    setUrl(finalUrl);
    setInputUrl(finalUrl);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(inputUrl);
  };

  const goBack = () => webviewRef.current?.goBack();
  const goForward = () => webviewRef.current?.goForward();
  const reload = () => webviewRef.current?.reload();
  const goHome = () => navigate('https://www.google.com');

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const openExternal = () => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
      toast.success('Opened in system browser');
    }
  };

  const addToFavorites = () => {
    const newFav = { name: pageTitle, url: url, icon: '⭐' };
    setFavorites(prev => [...prev, newFav]);
    toast.success('Added to favorites');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`fixed inset-0 z-[200] flex flex-col ${
          isDark ? 'bg-[#1a1a1a]' : 'bg-white'
        }`}
      >
        {/* Browser Header */}
        <div className={`flex items-center gap-2 px-2 py-2 border-b ${
          isDark ? 'bg-[#202020] border-[#333]' : 'bg-gray-100 border-gray-200'
        }`}>
          {/* Window Controls */}
          <div className="flex items-center gap-1.5 px-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            />
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
            />
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              disabled={!canGoBack}
              className={`h-8 w-8 rounded-full ${isDark ? 'hover:bg-[#333]' : ''}`}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goForward}
              disabled={!canGoForward}
              className={`h-8 w-8 rounded-full ${isDark ? 'hover:bg-[#333]' : ''}`}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={reload}
              className={`h-8 w-8 rounded-full ${isDark ? 'hover:bg-[#333]' : ''}`}
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goHome}
              className={`h-8 w-8 rounded-full ${isDark ? 'hover:bg-[#333]' : ''}`}
            >
              <Home className="w-4 h-4" />
            </Button>
          </div>

          {/* URL Bar */}
          <form onSubmit={handleSubmit} className="flex-1 max-w-3xl">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              isDark ? 'bg-[#333]' : 'bg-white border border-gray-300'
            }`}>
              {isSecure ? (
                <Lock className="w-4 h-4 text-green-500" />
              ) : (
                <Globe className="w-4 h-4 text-gray-400" />
              )}
              <Input
                ref={inputRef}
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Search or enter URL"
                className={`flex-1 border-0 bg-transparent focus-visible:ring-0 h-7 text-sm ${
                  isDark ? 'text-white placeholder:text-gray-500' : ''
                }`}
              />
              {isLoading && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={addToFavorites}
              className={`h-8 w-8 rounded-full ${isDark ? 'hover:bg-[#333]' : ''}`}
              title="Add to favorites"
            >
              <Star className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyUrl}
              className={`h-8 w-8 rounded-full ${isDark ? 'hover:bg-[#333]' : ''}`}
              title="Copy URL"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={openExternal}
              className={`h-8 w-8 rounded-full ${isDark ? 'hover:bg-[#333]' : ''}`}
              title="Open in system browser"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={`h-8 w-8 rounded-full ${isDark ? 'hover:bg-[#333]' : ''}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Bookmarks Bar */}
        <div className={`flex items-center gap-1 px-4 py-1.5 border-b overflow-x-auto ${
          isDark ? 'bg-[#252525] border-[#333]' : 'bg-gray-50 border-gray-200'
        }`}>
          {favorites.map((fav, index) => (
            <button
              key={index}
              onClick={() => navigate(fav.url)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                isDark 
                  ? 'hover:bg-[#333] text-gray-300' 
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span>{fav.icon}</span>
              <span>{fav.name}</span>
            </button>
          ))}
          <button
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
              isDark ? 'hover:bg-[#333] text-gray-500' : 'hover:bg-gray-200 text-gray-400'
            }`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Browser Content - Webview */}
        <div className="flex-1 relative">
          {/* For Electron: Use webview tag */}
          {window.electronAPI ? (
            <webview
              ref={webviewRef}
              src={url}
              className="w-full h-full"
              allowpopups="true"
              webpreferences="contextIsolation=yes"
            />
          ) : (
            /* For Web: Use iframe with limitations */
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <Chrome className="w-16 h-16 text-blue-500" />
              <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Built-in Browser
              </h3>
              <p className={`text-center max-w-md ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                The embedded browser is available in the desktop app (.exe).
                <br />
                Links will open in your default browser.
              </p>
              <Button
                onClick={() => {
                  window.open(url, '_blank');
                  onClose();
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open {new URL(url).hostname} in Browser
              </Button>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: '0%' }}
                animate={{ width: '90%' }}
                transition={{ duration: 2 }}
              />
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className={`flex items-center justify-between px-4 py-1 text-xs border-t ${
          isDark ? 'bg-[#202020] border-[#333] text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-500'
        }`}>
          <div className="flex items-center gap-2">
            <Chrome className="w-3 h-3" />
            <span>FaceConnect Browser</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{isSecure ? '🔒 Secure' : '⚠️ Not Secure'}</span>
            <span>{pageTitle}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default EmbeddedBrowser;
