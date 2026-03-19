import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUserAndToken } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processOAuthCallback = async () => {
      // Try to get session_id from URL hash (fragment) or query params
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const queryParams = new URLSearchParams(window.location.search);
      
      const sessionId = hashParams.get('session_id') || queryParams.get('session_id');
      
      // Get the provider from localStorage (set before redirect)
      const provider = localStorage.getItem('oauth_pending') || 'google';
      localStorage.removeItem('oauth_pending');

      if (!sessionId) {
        toast.error("Authentication failed - no session");
        navigate('/auth');
        return;
      }

      try {
        // Exchange session_id for user data via backend
        const response = await fetch(`${API}/auth/${provider}?session_id=${encodeURIComponent(sessionId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Authentication failed');
        }

        const data = await response.json();
        
        // Store token and user data
        localStorage.setItem('auth_token', data.token);
        
        // Update auth context if the function exists
        if (setUserAndToken) {
          setUserAndToken(data.user, data.token);
        }

        toast.success(`Welcome, ${data.user.display_name || data.user.username}!`);
        
        // Navigate to home page
        navigate('/', { replace: true });
        
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast.error(error.message || 'Authentication failed');
        navigate('/auth');
      }
    };

    processOAuthCallback();
  }, [navigate, setUserAndToken]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#00F0FF] animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Signing you in...</p>
        <p className="text-gray-500 text-sm mt-2">Please wait while we verify your account</p>
      </div>
    </div>
  );
}
