import { Lock } from "lucide-react";

/**
 * EmptyState - Default state when no chat is selected
 * Extracted from WhatsAppDesktopLayout.jsx for maintainability
 */
export default function EmptyState({ isDark }) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center ${
      isDark ? 'bg-[#222e35]' : 'bg-[#f0f2f5]'
    }`}>
      <div className="w-96 text-center">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#00a884] to-[#0088cc] flex items-center justify-center">
          <span className="text-3xl font-bold text-white">FC</span>
        </div>
        
        <h2 className={`text-3xl font-light mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          FaceConnect Desktop
        </h2>
        <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Send and receive messages without keeping your phone online.
          <br />
          Use FaceConnect on up to 4 linked devices and 1 phone at the same time.
        </p>
        
        <div className={`flex items-center justify-center gap-2 text-xs mb-8 ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <Lock className="w-3 h-3" />
          End-to-end encrypted
        </div>

        {/* Mobile App Download Links */}
        <div className={`p-4 rounded-xl ${
          isDark ? 'bg-[#111b21]' : 'bg-white'
        } border ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
          <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Download the mobile app
          </p>
          <div className="flex gap-3 justify-center">
            <a 
              href="https://play.google.com/store/apps/details?id=com.faceconnect.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDark ? 'bg-[#202c33] hover:bg-[#2a3942]' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              data-testid="download-google-play"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isDark ? '#fff' : '#000'}>
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-left">
                <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  GET IT ON
                </div>
                <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Google Play
                </div>
              </div>
            </a>
            <a 
              href="https://apps.apple.com/app/faceconnect" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDark ? 'bg-[#202c33] hover:bg-[#2a3942]' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              data-testid="download-app-store"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={isDark ? '#fff' : '#000'}>
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <div className="text-left">
                <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Download on the
                </div>
                <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  App Store
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
