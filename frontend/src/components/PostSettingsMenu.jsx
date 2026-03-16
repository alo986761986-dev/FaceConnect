import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreHorizontal, Edit3, Star, Trash2, Share2, Archive,
  EyeOff, MessageSquareOff, Image, Grid, X, Heart, 
  Lock, Globe, Users, Copy, Flag, Bell, BellOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { haptic } from "@/utils/mobile";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PostSettingsMenu({
  post,
  isOwner,
  token,
  isDark = true,
  onEdit,
  onDelete,
  onHighlight,
  onShare,
  onArchive,
  onSettingsChange,
  onRefresh
}) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editContent, setEditContent] = useState(post?.content || "");
  const [loading, setLoading] = useState(false);
  
  // Post settings state
  const [settings, setSettings] = useState({
    hideLikes: post?.hide_likes || false,
    hideShares: post?.hide_shares || false,
    disableComments: post?.disable_comments || false,
    isPinned: post?.is_pinned || false
  });

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    
    setLoading(true);
    haptic.medium();
    
    try {
      const response = await fetch(
        `${API_URL}/api/posts/${post.id}?token=${token}&content=${encodeURIComponent(editContent)}`,
        { method: "PUT" }
      );
      
      if (response.ok) {
        const updatedPost = await response.json();
        toast.success("Post updated!");
        setShowEditDialog(false);
        onEdit?.(post.id, updatedPost);
        onRefresh?.();
      } else {
        toast.error("Failed to update post");
      }
    } catch (error) {
      toast.error("Failed to update post");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    haptic.warning();
    
    try {
      const response = await fetch(`${API_URL}/api/posts/${post.id}?token=${token}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        toast.success("Post deleted");
        setShowDeleteConfirm(false);
        onDelete?.(post.id);
        onRefresh?.();
      } else {
        toast.error("Failed to delete post");
      }
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setLoading(false);
    }
  };

  const handleHighlight = async () => {
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/posts/${post.id}/highlight?token=${token}`, {
        method: "POST"
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.is_highlighted ? "Post highlighted!" : "Highlight removed");
        onHighlight?.(post.id, data.is_highlighted);
        onRefresh?.();
      }
    } catch (error) {
      toast.error("Failed to highlight post");
    }
  };

  const handleArchive = async () => {
    haptic.medium();
    
    try {
      const response = await fetch(`${API_URL}/api/posts/${post.id}/archive?token=${token}`, {
        method: "POST"
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.is_archived ? "Post archived" : "Post restored");
        onArchive?.(post.id, data.is_archived);
        onRefresh?.();
      }
    } catch (error) {
      toast.error("Failed to archive post");
    }
  };

  const handleSettingChange = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    haptic.light();
    
    try {
      const response = await fetch(`${API_URL}/api/posts/${post.id}/settings?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
      
      if (response.ok) {
        toast.success("Setting updated");
        onSettingsChange?.(post.id, { [key]: value });
      }
    } catch (error) {
      // Revert on error
      setSettings(prev => ({ ...prev, [key]: !value }));
      toast.error("Failed to update setting");
    }
  };

  const handleCopyLink = async () => {
    haptic.light();
    const url = `${window.location.origin}/posts/${post.id}`;
    
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}
            data-testid={`post-menu-${post?.id}`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className={`w-56 ${isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-gray-200'}`}
        >
          {isOwner && (
            <>
              <DropdownMenuItem
                onClick={() => setShowEditDialog(true)}
                className={`cursor-pointer ${isDark ? 'text-white hover:bg-white/10' : 'hover:bg-gray-50'}`}
              >
                <Edit3 className="w-4 h-4 mr-3" />
                Edit post
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={handleHighlight}
                className={`cursor-pointer ${isDark ? 'text-[#FFD700] hover:bg-white/10' : 'text-amber-600 hover:bg-gray-50'}`}
              >
                <Star className={`w-4 h-4 mr-3 ${post?.is_highlighted ? 'fill-current' : ''}`} />
                {post?.is_highlighted ? 'Remove from featured' : 'Add to featured'}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setShowSettingsDialog(true)}
                className={`cursor-pointer ${isDark ? 'text-white hover:bg-white/10' : 'hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4 mr-3" />
                Edit grid preview
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className={isDark ? 'bg-white/10' : 'bg-gray-200'} />
              
              <DropdownMenuItem
                onClick={handleArchive}
                className={`cursor-pointer ${isDark ? 'text-white hover:bg-white/10' : 'hover:bg-gray-50'}`}
              >
                <Archive className="w-4 h-4 mr-3" />
                {post?.is_archived ? 'Restore from archive' : 'Archive'}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleSettingChange('hideLikes', !settings.hideLikes)}
                className={`cursor-pointer ${isDark ? 'text-white hover:bg-white/10' : 'hover:bg-gray-50'}`}
              >
                <EyeOff className="w-4 h-4 mr-3" />
                {settings.hideLikes ? 'Show like count' : 'Hide like count'}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleSettingChange('hideShares', !settings.hideShares)}
                className={`cursor-pointer ${isDark ? 'text-white hover:bg-white/10' : 'hover:bg-gray-50'}`}
              >
                <Share2 className="w-4 h-4 mr-3" />
                {settings.hideShares ? 'Show share count' : 'Hide share count'}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleSettingChange('disableComments', !settings.disableComments)}
                className={`cursor-pointer ${isDark ? 'text-white hover:bg-white/10' : 'hover:bg-gray-50'}`}
              >
                <MessageSquareOff className="w-4 h-4 mr-3" />
                {settings.disableComments ? 'Turn on comments' : 'Turn off comments'}
              </DropdownMenuItem>

              <DropdownMenuSeparator className={isDark ? 'bg-white/10' : 'bg-gray-200'} />
              
              <DropdownMenuItem
                onClick={() => setShowDeleteConfirm(true)}
                className="cursor-pointer text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-3" />
                Delete
              </DropdownMenuItem>
            </>
          )}
          
          {!isOwner && (
            <>
              <DropdownMenuItem
                onClick={() => toast.info("Post reported")}
                className={`cursor-pointer ${isDark ? 'text-white hover:bg-white/10' : 'hover:bg-gray-50'}`}
              >
                <Flag className="w-4 h-4 mr-3" />
                Report
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => toast.info("Notifications turned off")}
                className={`cursor-pointer ${isDark ? 'text-white hover:bg-white/10' : 'hover:bg-gray-50'}`}
              >
                <BellOff className="w-4 h-4 mr-3" />
                Turn off notifications
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator className={isDark ? 'bg-white/10' : 'bg-gray-200'} />
          
          <DropdownMenuItem
            onClick={() => onShare?.(post)}
            className={`cursor-pointer ${isDark ? 'text-white hover:bg-white/10' : 'hover:bg-gray-50'}`}
          >
            <Share2 className="w-4 h-4 mr-3" />
            Share
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={handleCopyLink}
            className={`cursor-pointer ${isDark ? 'text-white hover:bg-white/10' : 'hover:bg-gray-50'}`}
          >
            <Copy className="w-4 h-4 mr-3" />
            Copy link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white'}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>Edit Post</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="What's on your mind?"
            className={`min-h-[120px] ${isDark ? 'bg-[#0A0A0A] border-white/10 text-white' : ''}`}
          />
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setShowEditDialog(false)}
              className={isDark ? 'text-gray-400' : ''}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEdit}
              disabled={loading || !editContent.trim()}
              className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white'}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : ''}>Post Settings</DialogTitle>
            <DialogDescription>
              Manage visibility and interaction settings for this post
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Hide Likes */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className={isDark ? 'text-white' : ''}>Hide like count</Label>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Others won't see how many likes this post has
                </p>
              </div>
              <Switch
                checked={settings.hideLikes}
                onCheckedChange={(val) => handleSettingChange('hideLikes', val)}
              />
            </div>
            
            {/* Hide Shares */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className={isDark ? 'text-white' : ''}>Hide share count</Label>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Others won't see how many times this was shared
                </p>
              </div>
              <Switch
                checked={settings.hideShares}
                onCheckedChange={(val) => handleSettingChange('hideShares', val)}
              />
            </div>
            
            {/* Disable Comments */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className={isDark ? 'text-white' : ''}>Turn off commenting</Label>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  No one will be able to comment on this post
                </p>
              </div>
              <Switch
                checked={settings.disableComments}
                onCheckedChange={(val) => handleSettingChange('disableComments', val)}
              />
            </div>

            {/* Pin to Grid */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className={isDark ? 'text-white' : ''}>Pin to profile grid</Label>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  This post will appear at the top of your profile
                </p>
              </div>
              <Switch
                checked={settings.isPinned}
                onCheckedChange={(val) => handleSettingChange('isPinned', val)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowSettingsDialog(false)}
              className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className={isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white'}>
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setShowDeleteConfirm(false)}
              className={isDark ? 'text-gray-400' : ''}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
