import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUserAndToken } = useAuth();
  const hasProcessed = useRef(false);
  const [status, setStatus] = useState("Verifying your account...");
  const [error, setError] = useState(null);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processOAuthCallback = async () => {
      try {
        // Log the full URL for debugging
        console.log("OAuth Callback URL:", window.location.href);
        console.log("Hash:", window.location.hash);
        console.log("Search:", window.location.search);
        
        // Try to get session_id from URL hash (fragment) - Emergent Auth returns it in hash
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        const queryParams = new URLSearchParams(window.location.search);
        
        const sessionId = hashParams.get('session_id') || queryParams.get('session_id');
        const code = queryParams.get('code');
        const state = queryParams.get('state'); // Used to identify provider (facebook, apple)
        const idToken = hashParams.get('id_token'); // Apple can return this directly
        
        console.log("Session ID:", sessionId);
        console.log("Code:", code);
        console.log("State:", state);
        
        // Determine which provider we're dealing with
        const pendingProvider = localStorage.getItem('oauth_pending');
        const provider = state || pendingProvider || 'google';
        
        // Clean up localStorage
        localStorage.removeItem('oauth_pending');

        // Build request based on what we received
        let endpoint = `${API}/auth/${provider}`;
        let requestUrl = endpoint;

        if (sessionId) {
          // Emergent session flow (primarily Google)
          setStatus("Exchanging session credentials...");
          requestUrl = `${endpoint}?session_id=${encodeURIComponent(sessionId)}`;
        } else if (code) {
          // Direct OAuth code flow (Facebook, Apple)
          setStatus("Processing authorization code...");
          const redirectUri = window.location.origin + '/auth/callback';
          requestUrl = `${endpoint}?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        } else if (idToken) {
          // Apple ID token flow
          setStatus("Verifying ID token...");
          requestUrl = `${endpoint}?id_token=${encodeURIComponent(idToken)}`;
        } else {
          setError("No authentication credentials received. Please try again.");
          toast.error("Authentication failed - no credentials received");
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        console.log("Request URL:", requestUrl);
        setStatus("Signing you in...");

        // Exchange credentials for user data via our backend
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Auth error response:", errorData);
          throw new Error(errorData.detail || 'Authentication failed');
        }

        const data = await response.json();
        console.log("Auth success, user:", data.user?.email);
        
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
        setError(error.message || 'Authentication failed. Please try again.');
        toast.error(error.message || 'Authentication failed');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    processOAuthCallback();
  }, [navigate, setUserAndToken]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">!</span>
            </div>
            <p className="text-red-400 text-lg">{error}</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting to login...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-[#00F0FF] animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">{status}</p>
            <p className="text-gray-500 text-sm mt-2">Please wait while we verify your account</p>
          </>
        )}
      </div>
    </div>
  );
}
