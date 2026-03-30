/**
 * Attachment Menu Component
 * WhatsApp-style attachment menu for sending files, photos, contacts, location
 */
import { Image as ImageIcon, Camera, File, Contact, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

export function AttachmentMenu({
  isOpen,
  onOpenChange,
  isDark,
  onPhotosVideos,
  onCamera,
  onDocument,
  onContact,
  onLocation,
  sendingLocation = false
}) {
  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`rounded-full transition-transform ${isOpen ? 'rotate-45' : ''}`}
          data-testid="attach-btn"
        >
          <Paperclip className="w-6 h-6 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        side="top"
        sideOffset={8}
        className={`w-56 rounded-2xl p-2 ${isDark ? 'bg-[#233138] border-[#3a4a5a]' : 'bg-white border-gray-200'}`}
      >
        {/* Photos & Videos */}
        <DropdownMenuItem 
          onClick={onPhotosVideos}
          className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer ${
            isDark ? 'hover:bg-[#2a3a4a]' : 'hover:bg-gray-100'
          }`}
          data-testid="attach-photos"
        >
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-purple-500" />
          </div>
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Photos & Videos
          </span>
        </DropdownMenuItem>
        
        {/* Camera */}
        <DropdownMenuItem 
          onClick={onCamera}
          className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer ${
            isDark ? 'hover:bg-[#2a3a4a]' : 'hover:bg-gray-100'
          }`}
          data-testid="attach-camera"
        >
          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-pink-500" />
          </div>
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Camera
          </span>
        </DropdownMenuItem>
        
        {/* Document */}
        <DropdownMenuItem 
          onClick={onDocument}
          className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer ${
            isDark ? 'hover:bg-[#2a3a4a]' : 'hover:bg-gray-100'
          }`}
          data-testid="attach-document"
        >
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <File className="w-5 h-5 text-blue-500" />
          </div>
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Document
          </span>
        </DropdownMenuItem>
        
        {/* Contact */}
        <DropdownMenuItem 
          onClick={onContact}
          className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer ${
            isDark ? 'hover:bg-[#2a3a4a]' : 'hover:bg-gray-100'
          }`}
          data-testid="attach-contact"
        >
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <Contact className="w-5 h-5 text-cyan-500" />
          </div>
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Contact
          </span>
        </DropdownMenuItem>
        
        {/* Location */}
        <DropdownMenuItem 
          onClick={onLocation}
          disabled={sendingLocation}
          className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer ${
            isDark ? 'hover:bg-[#2a3a4a]' : 'hover:bg-gray-100'
          } ${sendingLocation ? 'opacity-50' : ''}`}
          data-testid="attach-location"
        >
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-green-500" />
          </div>
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {sendingLocation ? 'Getting location...' : 'Location'}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AttachmentMenu;
