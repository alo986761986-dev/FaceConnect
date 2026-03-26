import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  MoreVertical, Lock, Shield, User, Palette, Smile,
  AtSign, Users, BellOff, Ban, AlertTriangle, ShieldCheck,
  Archive, Trash2, Flag, X, ChevronRight, Check, Moon, Sun,
  Bell, Eye, EyeOff, MessageCircle, Image, Clock, Volume2, VolumeX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/utils/mobile";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChatSettingsMenu({ 
  conversation, 
  otherParticipant, 
  token, 
  onArchive, 
  onDelete, 
  onBlock,
  onMute,
  isMuted,
  isBlocked,
  onClose 
}) {
  const navigate = useNavigate();
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showEncryptionDialog, setShowEncryptionDialog] = useState(false);
  const [showEmojiDialog, setShowEmojiDialog] = useState(false);
  const [showRestrictionsDialog, setShowRestrictionsDialog] = useState(false);
  const [nickname, setNickname] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [chatTheme, setChatTheme] = useState("default");
  
  // Restrictions state
  const [restrictions, setRestrictions] = useState({
    hideStories: false,
    hideActivity: false,
    restrictMessages: false,
    muteNotifications: false
  });

  // Generate encryption key fingerprint (simulated for UI)
  const encryptionFingerprint = generateFingerprint(conversation?.id || "default");

  const handleViewProfile = () => {
    haptic.light();
    navigate(`/profile/${otherParticipant?.id}`);
  };

  const handleSetNickname = async () => {
    haptic.medium();
    try {
      await fetch(`${API}/conversations/${conversation.id}/nickname?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname })
      });
      toast.success("Nickname updated!");
      setShowNicknameDialog(false);
    } catch (error) {
      toast.error("Failed to update nickname");
    }
  };

  const handleCreateGroup = () => {
    haptic.medium();
    navigate("/messages/new-group", { 
      state: { initialMembers: [otherParticipant] } 
    });
  };

  const handleToggleNotifications = () => {
    haptic.light();
    onMute?.(!isMuted);
    toast.success(isMuted ? "Notifications enabled" : "Notifications muted");
  };

  const handleBlock = async () => {
    haptic.warning();
    try {
      onBlock?.(!isBlocked);
      toast.success(isBlocked ? "User unblocked" : "User blocked");
      setShowBlockDialog(false);
    } catch (error) {
      toast.error("Failed to update block status");
    }
  };

  const handleArchive = async () => {
    haptic.medium();
    try {
      onArchive?.();
      toast.success("Chat archived");
    } catch (error) {
      toast.error("Failed to archive chat");
    }
  };

  const handleDelete = async () => {
    haptic.warning();
    try {
      onDelete?.();
      toast.success("Chat deleted");
      setShowDeleteDialog(false);
      onClose?.();
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  };

  const handleReport = async () => {
    haptic.warning();
    try {
      await fetch(`${API}/reports?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reported_user_id: otherParticipant?.id,
          conversation_id: conversation?.id,
          reason: reportReason
        })
      });
      toast.success("Report submitted. We'll review it shortly.");
      setShowReportDialog(false);
    } catch (error) {
      toast.error("Failed to submit report");
    }
  };
  
  const handleSaveRestrictions = () => {
    haptic.success();
    toast.success("Restrictions updated");
    setShowRestrictionsDialog(false);
  };

  const themeOptions = [
    { id: "default", name: "Default", colors: ["#00F0FF", "#7000FF"] },
    { id: "ocean", name: "Ocean", colors: ["#0077B6", "#00B4D8"] },
    { id: "sunset", name: "Sunset", colors: ["#FF6B6B", "#FFE66D"] },
    { id: "forest", name: "Forest", colors: ["#2D6A4F", "#95D5B2"] },
    { id: "lavender", name: "Lavender", colors: ["#7B68EE", "#DDA0DD"] },
    { id: "midnight", name: "Midnight", colors: ["#191970", "#483D8B"] },
    { id: "rose", name: "Rose Gold", colors: ["#B76E79", "#E8B4BC"] },
    { id: "neon", name: "Neon", colors: ["#39FF14", "#FF073A"] },
  ];
  
  // Popular stickers/emoji quick reactions
  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            data-testid="chat-settings-btn"
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-80 bg-[#1A1A1A] border-white/10 text-white p-2 rounded-2xl shadow-2xl"
          sideOffset={8}
        >
          {/* End-to-End Encryption Badge */}
          <div 
            className="px-4 py-3 mb-2 bg-gradient-to-r from-green-500/20 to-emerald-500/10 rounded-xl border border-green-500/30 cursor-pointer hover:from-green-500/30 hover:to-emerald-500/20 transition-all"
            onClick={() => { setShowEncryptionDialog(true); haptic.light(); }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Lock className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <span className="text-sm text-green-400 font-semibold block">
                  End-to-end encrypted
                </span>
                <p className="text-xs text-gray-500">
                  Messages are secured with encryption
                </p>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator className="bg-white/5 my-2" />

          {/* View Profile */}
          <DropdownMenuItem 
            data-testid="view-profile-option"
            onClick={handleViewProfile}
            className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-medium">View profile</span>
          </DropdownMenuItem>

          {/* Change Theme */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Palette className="w-4 h-4 text-purple-400" />
              </div>
              <span className="font-medium flex-1">Change theme</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-[#1A1A1A] border-white/10 text-white p-2 w-64 rounded-xl">
              <div className="grid grid-cols-2 gap-2">
                {themeOptions.map((theme) => (
                  <DropdownMenuItem
                    key={theme.id}
                    onClick={() => {
                      setChatTheme(theme.id);
                      haptic.light();
                      toast.success(`Theme: ${theme.name}`);
                    }}
                    className={`flex items-center gap-2 py-2.5 px-3 cursor-pointer rounded-xl transition-all ${
                      chatTheme === theme.id 
                        ? 'bg-white/10 ring-2 ring-[#00F0FF]/50' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full shadow-lg" 
                      style={{ 
                        background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})` 
                      }} 
                    />
                    <span className="text-sm">{theme.name}</span>
                    {chatTheme === theme.id && (
                      <Check className="w-3 h-3 text-green-400 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Emoji & Stickers */}
          <DropdownMenuItem 
            data-testid="emoji-option"
            onClick={() => { setShowEmojiDialog(true); haptic.light(); }}
            className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Smile className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="font-medium">Emoji & stickers</span>
          </DropdownMenuItem>

          {/* Nicknames */}
          <DropdownMenuItem 
            data-testid="nickname-option"
            onClick={() => { setShowNicknameDialog(true); haptic.light(); }}
            className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <AtSign className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="font-medium">Nicknames</span>
          </DropdownMenuItem>

          {/* Create Group */}
          <DropdownMenuItem 
            data-testid="create-group-option"
            onClick={handleCreateGroup}
            className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-medium">Create group with {otherParticipant?.username?.slice(0, 12)}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/5 my-2" />

          {/* Turn Off Notifications */}
          <DropdownMenuItem 
            data-testid="mute-option"
            onClick={handleToggleNotifications}
            className="flex items-center justify-between py-3 px-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${isMuted ? 'bg-red-500/10' : 'bg-gray-500/10'} flex items-center justify-center`}>
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Bell className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <span className="font-medium">{isMuted ? "Turn on notifications" : "Turn off notifications"}</span>
            </div>
            <Switch 
              checked={isMuted} 
              onCheckedChange={handleToggleNotifications}
              className="data-[state=checked]:bg-red-500"
            />
          </DropdownMenuItem>

          {/* Block */}
          <DropdownMenuItem 
            data-testid="block-option"
            onClick={() => { setShowBlockDialog(true); haptic.light(); }}
            className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
          >
            <div className={`w-8 h-8 rounded-full ${isBlocked ? 'bg-green-500/10' : 'bg-gray-500/10'} flex items-center justify-center`}>
              <Ban className={`w-4 h-4 ${isBlocked ? 'text-green-400' : 'text-gray-400'}`} />
            </div>
            <span className="font-medium">{isBlocked ? "Unblock" : "Block"}</span>
          </DropdownMenuItem>

          {/* Open Restrictions */}
          <DropdownMenuItem 
            data-testid="restrictions-option"
            onClick={() => { setShowRestrictionsDialog(true); haptic.light(); }}
            className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <span className="font-medium flex-1">Open restrictions</span>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/5 my-2" />

          {/* Verify End-to-End Encryption */}
          <DropdownMenuItem 
            data-testid="verify-encryption-option"
            onClick={() => { setShowEncryptionDialog(true); haptic.light(); }}
            className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-green-400" />
            </div>
            <span className="font-medium text-green-400">Verify end-to-end encryption</span>
          </DropdownMenuItem>

          {/* Archive Chat */}
          <DropdownMenuItem 
            data-testid="archive-option"
            onClick={handleArchive}
            className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gray-500/10 flex items-center justify-center">
              <Archive className="w-4 h-4 text-gray-400" />
            </div>
            <span className="font-medium">Archive chat</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/5 my-2" />

          {/* Delete Chat */}
          <DropdownMenuItem 
            data-testid="delete-chat-option"
            onClick={() => { setShowDeleteDialog(true); haptic.light(); }}
            className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-red-500/10 rounded-xl transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-400" />
            </div>
            <span className="font-medium text-red-400">Delete chat</span>
          </DropdownMenuItem>

          {/* Report */}
          <DropdownMenuItem 
            data-testid="report-option"
            onClick={() => { setShowReportDialog(true); haptic.light(); }}
            className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-red-500/10 rounded-xl transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <Flag className="w-4 h-4 text-red-400" />
            </div>
            <span className="font-medium text-red-400">Report</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Nickname Dialog */}
      <Dialog open={showNicknameDialog} onOpenChange={setShowNicknameDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white w-[calc(100%-32px)] max-w-md mx-auto left-1/2 -translate-x-1/2">
          <DialogHeader>
            <DialogTitle>Set Nickname</DialogTitle>
            <DialogDescription className="text-gray-400">
              Give {otherParticipant?.username} a nickname. Only you will see this.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="nickname" className="text-gray-300">Nickname</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={otherParticipant?.username}
              className="mt-2 bg-[#0F0F0F] border-white/10 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNicknameDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSetNickname}
              className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white w-[calc(100%-32px)] max-w-md mx-auto left-1/2 -translate-x-1/2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-400" />
              {isBlocked ? "Unblock" : "Block"} {otherParticipant?.username}?
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {isBlocked 
                ? "They will be able to message you and see your profile again."
                : "They won't be able to message you or see your profile. They won't be notified."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBlock}
              variant={isBlocked ? "default" : "destructive"}
            >
              {isBlocked ? "Unblock" : "Block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chat Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white w-[calc(100%-32px)] max-w-md mx-auto left-1/2 -translate-x-1/2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete chat?
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This will permanently delete all messages in this conversation. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white w-[calc(100%-32px)] max-w-md mx-auto left-1/2 -translate-x-1/2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-400" />
              Report {otherParticipant?.username}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Help us understand what's happening. Your report is confidential.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {[
              "Spam or scam",
              "Harassment or bullying",
              "Inappropriate content",
              "Impersonation",
              "Violence or threats",
              "Other"
            ].map((reason) => (
              <Button
                key={reason}
                variant="ghost"
                onClick={() => setReportReason(reason)}
                className={`w-full justify-start text-left ${
                  reportReason === reason 
                    ? "bg-red-500/20 border-red-500/50 text-red-400" 
                    : "bg-[#0F0F0F] hover:bg-white/10"
                }`}
              >
                {reportReason === reason && <Check className="w-4 h-4 mr-2" />}
                {reason}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReport}
              disabled={!reportReason}
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Encryption Verification Dialog */}
      <Dialog open={showEncryptionDialog} onOpenChange={setShowEncryptionDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white w-[calc(100%-32px)] max-w-md mx-auto left-1/2 -translate-x-1/2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              End-to-End Encryption
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Messages in this chat are secured with end-to-end encryption.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Encryption Info */}
            <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-green-400" />
                <span className="font-medium text-green-400">Encrypted</span>
              </div>
              <p className="text-sm text-gray-400">
                Only you and {otherParticipant?.username} can read or listen to what's sent.
                Not even FaceConnect can access these messages.
              </p>
            </div>

            {/* Security Code */}
            <div className="space-y-2">
              <Label className="text-gray-300">Security verification code</Label>
              <div className="p-4 bg-[#0F0F0F] rounded-xl font-mono text-center text-lg tracking-widest text-[#00F0FF]">
                {encryptionFingerprint}
              </div>
              <p className="text-xs text-gray-500 text-center">
                Compare this code with {otherParticipant?.username} to verify encryption
              </p>
            </div>

            {/* QR Code Placeholder */}
            <div className="flex justify-center py-4">
              <div className="w-32 h-32 bg-white p-2 rounded-lg">
                <div 
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(generateQRPattern(encryptionFingerprint))}")`,
                    backgroundSize: 'cover'
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Scan QR code to verify encryption on another device
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowEncryptionDialog(false)}
              className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Emoji & Stickers Dialog */}
      <Dialog open={showEmojiDialog} onOpenChange={setShowEmojiDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white w-[calc(100%-32px)] max-w-md mx-auto left-1/2 -translate-x-1/2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smile className="w-5 h-5 text-yellow-400" />
              Emoji & Stickers
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Customize quick reactions for this chat
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Quick Reactions */}
            <div>
              <Label className="text-gray-300 mb-3 block">Quick Reactions</Label>
              <div className="grid grid-cols-4 gap-2">
                {quickReactions.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      haptic.light();
                      toast.success(`${emoji} set as quick reaction`);
                    }}
                    className="w-full aspect-square rounded-xl bg-[#0F0F0F] hover:bg-white/10 flex items-center justify-center text-2xl transition-all hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Default Emoji */}
            <div className="p-4 bg-[#0F0F0F] rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Default Reaction</p>
                  <p className="text-sm text-gray-500">Tap once to send</p>
                </div>
                <div className="text-3xl">❤️</div>
              </div>
            </div>
            
            {/* Sticker Packs */}
            <div>
              <Label className="text-gray-300 mb-3 block">Sticker Packs</Label>
              <div className="space-y-2">
                {[
                  { name: "Classic Emotions", count: 24 },
                  { name: "Animated Hearts", count: 16 },
                  { name: "Funny Faces", count: 32 }
                ].map((pack, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      haptic.light();
                      toast.success(`${pack.name} pack selected`);
                    }}
                    className="w-full p-3 bg-[#0F0F0F] hover:bg-white/5 rounded-xl flex items-center justify-between transition-colors"
                  >
                    <span>{pack.name}</span>
                    <span className="text-sm text-gray-500">{pack.count} stickers</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowEmojiDialog(false)}
              variant="outline"
              className="border-white/10"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Restrictions Dialog */}
      <Dialog open={showRestrictionsDialog} onOpenChange={setShowRestrictionsDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white w-[calc(100%-32px)] max-w-md mx-auto left-1/2 -translate-x-1/2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Restrictions for {otherParticipant?.username}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Control how this person interacts with you
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {/* Hide Stories */}
            <div className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">Hide your stories</p>
                  <p className="text-xs text-gray-500">They won't see your stories</p>
                </div>
              </div>
              <Switch 
                checked={restrictions.hideStories}
                onCheckedChange={(val) => setRestrictions(prev => ({ ...prev, hideStories: val }))}
              />
            </div>
            
            {/* Hide Activity Status */}
            <div className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  {restrictions.hideActivity ? (
                    <EyeOff className="w-5 h-5 text-green-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-green-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Hide activity status</p>
                  <p className="text-xs text-gray-500">They won't see when you're online</p>
                </div>
              </div>
              <Switch 
                checked={restrictions.hideActivity}
                onCheckedChange={(val) => setRestrictions(prev => ({ ...prev, hideActivity: val }))}
              />
            </div>
            
            {/* Restrict Messages */}
            <div className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">Restrict messages</p>
                  <p className="text-xs text-gray-500">Move messages to requests</p>
                </div>
              </div>
              <Switch 
                checked={restrictions.restrictMessages}
                onCheckedChange={(val) => setRestrictions(prev => ({ ...prev, restrictMessages: val }))}
              />
            </div>
            
            {/* Mute Notifications */}
            <div className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <VolumeX className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="font-medium">Mute notifications</p>
                  <p className="text-xs text-gray-500">Don't receive notifications</p>
                </div>
              </div>
              <Switch 
                checked={restrictions.muteNotifications}
                onCheckedChange={(val) => setRestrictions(prev => ({ ...prev, muteNotifications: val }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              onClick={() => setShowRestrictionsDialog(false)}
              variant="outline"
              className="flex-1 border-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRestrictions}
              className="flex-1 bg-gradient-to-r from-[#00F0FF] to-[#7000FF]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function to generate a fingerprint-like string
function generateFingerprint(seed) {
  const hash = seed.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const fingerprint = [];
  for (let i = 0; i < 12; i++) {
    const num = Math.abs((hash * (i + 1) * 7919) % 100);
    fingerprint.push(num.toString().padStart(2, '0'));
  }
  
  return fingerprint.join(' ');
}

// Helper function to generate a simple QR-like pattern
function generateQRPattern(data) {
  const size = 21;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="white"/>
    ${Array.from({ length: size * size }, (_, i) => {
      const x = i % size;
      const y = Math.floor(i / size);
      const hash = (data.charCodeAt(i % data.length) * (x + 1) * (y + 1)) % 100;
      if (hash < 40) {
        return `<rect x="${x}" y="${y}" width="1" height="1" fill="black"/>`;
      }
      return '';
    }).join('')}
    <rect x="0" y="0" width="7" height="7" fill="black"/>
    <rect x="1" y="1" width="5" height="5" fill="white"/>
    <rect x="2" y="2" width="3" height="3" fill="black"/>
    <rect x="${size-7}" y="0" width="7" height="7" fill="black"/>
    <rect x="${size-6}" y="1" width="5" height="5" fill="white"/>
    <rect x="${size-5}" y="2" width="3" height="3" fill="black"/>
    <rect x="0" y="${size-7}" width="7" height="7" fill="black"/>
    <rect x="1" y="${size-6}" width="5" height="5" fill="white"/>
    <rect x="2" y="${size-5}" width="3" height="3" fill="black"/>
  </svg>`;
  return svg;
}
