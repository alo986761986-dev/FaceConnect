import { useRef } from "react";
import { ArrowLeft, Plus, ImageIcon, Video, File, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MediaPanel({ 
  isDark, 
  onBack, 
  mediaFiles, 
  setMediaFiles,
  onUpload 
}) {
  const fileInputRef = useRef(null);

  const handleMediaUpload = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files);
    }
  };

  const handleDelete = (fileId) => {
    setMediaFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <ScrollArea className="flex-1" data-testid="media-panel">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Media Files</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onBack}
            className="text-[#00a884]"
            data-testid="media-back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
        
        {/* Upload Button */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleMediaUpload} 
          multiple 
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden" 
        />
        <Button 
          className="w-full mb-4 bg-[#00a884] hover:bg-[#00a884]/90"
          onClick={() => fileInputRef.current?.click()}
          data-testid="media-upload-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> Upload Media from Computer
        </Button>
        
        <div className="flex gap-2 mb-4">
          {['All', 'Photos', 'Videos', 'Documents'].map(tab => (
            <button
              key={tab}
              className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-[#202c33] text-gray-300 hover:bg-[#2a3942]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Uploaded Files */}
        {mediaFiles.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {mediaFiles.map(file => (
              <div 
                key={file.id}
                className={`aspect-square rounded-lg overflow-hidden relative group ${isDark ? 'bg-[#202c33]' : 'bg-gray-100'}`}
              >
                {file.type.startsWith('image/') ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                ) : file.type.startsWith('video/') ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className={`w-8 h-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2">
                    <File className={`w-8 h-8 mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`text-xs truncate w-full text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{file.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white" 
                    onClick={() => handleDelete(file.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No media yet</p>
            <p className="text-sm mt-2">Upload photos, videos and documents to see them here</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
