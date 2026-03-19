import { useState } from 'react';
import { Download, RefreshCw, Check, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isElectron, getElectronAPI } from '@/utils/electron';

// GitHub repository for releases - update this to your actual repo
const GITHUB_RELEASES_URL = 'https://github.com/alo986761986-dev/FaceConnect/releases/latest';

export default function ElectronUpdateButton({ variant = "outline", size = "sm", showLabel = true, showDirectLink = false }) {
  const [status, setStatus] = useState('idle'); // idle, checking, available, downloading, ready, up-to-date, error
  const [progress, setProgress] = useState(0);

  const handleCheckForUpdates = async () => {
    const api = getElectronAPI();
    if (!api) return;

    setStatus('checking');

    // Set up listeners
    api.onUpdateStatus?.((data) => {
      if (data.status === 'checking') {
        setStatus('checking');
      }
    });

    api.onUpdateAvailable?.(() => {
      setStatus('available');
    });

    api.onDownloadProgress?.((data) => {
      setStatus('downloading');
      setProgress(data.percent || 0);
    });

    api.onUpdateDownloaded?.(() => {
      setStatus('ready');
    });

    api.onUpdateError?.(() => {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    });

    try {
      const result = await api.checkForUpdates?.();
      if (result && !result.success) {
        // No update available or in dev mode
        setStatus('up-to-date');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (e) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleInstallUpdate = () => {
    const api = getElectronAPI();
    api?.installUpdate?.();
  };

  const openGitHubReleases = () => {
    const api = getElectronAPI();
    if (api?.openExternal) {
      api.openExternal(GITHUB_RELEASES_URL);
    } else {
      window.open(GITHUB_RELEASES_URL, '_blank');
    }
  };

  // Don't render if not in Electron (unless showing direct link for web)
  if (!isElectron() && !showDirectLink) return null;

  // If showing direct link mode (for settings page)
  if (showDirectLink) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={openGitHubReleases}
        className="gap-2"
      >
        <ExternalLink className="w-4 h-4" />
        {showLabel && <span>Download from GitHub</span>}
      </Button>
    );
  }

  const getButtonContent = () => {
    switch (status) {
      case 'checking':
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {showLabel && <span>Checking...</span>}
          </>
        );
      case 'available':
      case 'downloading':
        return (
          <>
            <Download className="w-4 h-4 animate-bounce" />
            {showLabel && <span>{Math.round(progress)}%</span>}
          </>
        );
      case 'ready':
        return (
          <>
            <RefreshCw className="w-4 h-4" />
            {showLabel && <span>Install Update</span>}
          </>
        );
      case 'up-to-date':
        return (
          <>
            <Check className="w-4 h-4 text-green-500" />
            {showLabel && <span>Up to date</span>}
          </>
        );
      case 'error':
        return (
          <>
            <RefreshCw className="w-4 h-4 text-red-500" />
            {showLabel && <span>Retry</span>}
          </>
        );
      default:
        return (
          <>
            <Download className="w-4 h-4" />
            {showLabel && <span>Check Updates</span>}
          </>
        );
    }
  };

  const handleClick = () => {
    if (status === 'ready') {
      handleInstallUpdate();
    } else if (status === 'idle' || status === 'error' || status === 'up-to-date') {
      handleCheckForUpdates();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={status === 'checking' || status === 'downloading'}
        className="gap-2"
      >
        {getButtonContent()}
      </Button>
      {/* Always show direct download link as fallback */}
      {(status === 'error' || status === 'idle') && (
        <Button
          variant="ghost"
          size={size}
          onClick={openGitHubReleases}
          className="gap-1 text-xs opacity-70 hover:opacity-100"
          title="Download directly from GitHub"
        >
          <ExternalLink className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
