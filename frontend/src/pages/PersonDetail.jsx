import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { 
  ArrowLeft, Edit2, Trash2, Save, X, 
  Check, ExternalLink, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import SocialIcon from "@/components/SocialIcon";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOCIAL_NETWORKS = [
  { id: "facebook", name: "Facebook", placeholder: "facebook.com/username", urlPrefix: "https://facebook.com/" },
  { id: "instagram", name: "Instagram", placeholder: "instagram.com/username", urlPrefix: "https://instagram.com/" },
  { id: "tiktok", name: "TikTok", placeholder: "tiktok.com/@username", urlPrefix: "https://tiktok.com/@" },
  { id: "snapchat", name: "Snapchat", placeholder: "snapchat.com/add/username", urlPrefix: "https://snapchat.com/add/" },
  { id: "x", name: "X", placeholder: "x.com/username", urlPrefix: "https://x.com/" },
  { id: "linkedin", name: "LinkedIn", placeholder: "linkedin.com/in/username", urlPrefix: "https://linkedin.com/in/" },
  { id: "discord", name: "Discord", placeholder: "discord username#0000", urlPrefix: "" },
  { id: "reddit", name: "Reddit", placeholder: "reddit.com/user/username", urlPrefix: "https://reddit.com/user/" },
  { id: "pinterest", name: "Pinterest", placeholder: "pinterest.com/username", urlPrefix: "https://pinterest.com/" },
  { id: "youtube", name: "YouTube", placeholder: "youtube.com/@channel", urlPrefix: "https://youtube.com/@" },
  { id: "whatsapp", name: "WhatsApp", placeholder: "Phone number", urlPrefix: "https://wa.me/" },
  { id: "telegram", name: "Telegram", placeholder: "@username", urlPrefix: "https://t.me/" },
];

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const fetchPerson = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/persons/${id}`);
      setPerson(response.data);
      initEditData(response.data);
    } catch (error) {
      toast.error("Person not found");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const initEditData = (data) => {
    const socialNetworks = SOCIAL_NETWORKS.map(sn => {
      const existing = data.social_networks?.find(s => s.platform === sn.id);
      return existing || {
        platform: sn.id,
        username: "",
        profile_url: "",
        has_account: false
      };
    });

    setEditData({
      name: data.name,
      photo_data: data.photo_data,
      social_networks: socialNetworks
    });
    setPhotoPreview(data.photo_data);
  };

  useEffect(() => {
    fetchPerson();
  }, [fetchPerson]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        setEditData(prev => ({ ...prev, photo_data: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSocialToggle = (platformId, checked) => {
    setEditData(prev => ({
      ...prev,
      social_networks: prev.social_networks.map(sn =>
        sn.platform === platformId ? { ...sn, has_account: checked } : sn
      )
    }));
  };

  const handleSocialUrlChange = (platformId, value) => {
    setEditData(prev => ({
      ...prev,
      social_networks: prev.social_networks.map(sn =>
        sn.platform === platformId ? { ...sn, profile_url: value, username: value } : sn
      )
    }));
  };

  const handleSave = async () => {
    if (!editData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      await axios.put(`${API}/persons/${id}`, editData);
      toast.success("Person updated successfully");
      setIsEditing(false);
      fetchPerson();
    } catch (error) {
      toast.error("Failed to update person");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/persons/${id}`);
      toast.success("Person deleted");
      navigate("/");
    } catch (error) {
      toast.error("Failed to delete person");
    }
  };

  const getSocialUrl = (platform, url) => {
    const network = SOCIAL_NETWORKS.find(sn => sn.id === platform);
    if (!network || !url) return null;
    if (url.startsWith("http")) return url;
    return network.urlPrefix + url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!person) return null;

  const activeSocials = person.social_networks?.filter(sn => sn.has_account) || [];

  return (
    <div className="min-h-screen bg-[#0A0A0A] grid-texture">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              data-testid="back-btn"
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-gray-400 hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    data-testid="cancel-edit-btn"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      initEditData(person);
                    }}
                    className="text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    data-testid="save-edit-btn"
                    onClick={handleSave}
                    className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    data-testid="edit-btn"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        data-testid="delete-btn"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#121212] border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Person?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          This will permanently delete {person.name} and all their social network data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          data-testid="confirm-delete-btn"
                          onClick={handleDelete}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Profile Section */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Photo */}
              <div className="flex-shrink-0">
                {isEditing ? (
                  <label className="block w-48 h-48 rounded-2xl overflow-hidden border-2 border-dashed border-[#00F0FF]/30 cursor-pointer hover:border-[#00F0FF]/50 transition-colors">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={editData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A1A1A]">
                        <Upload className="w-8 h-8 text-[#00F0FF] mb-2" />
                        <span className="text-xs text-gray-500">Upload Photo</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-[#00F0FF]/20">
                    {person.photo_data ? (
                      <img
                        src={person.photo_data}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#00F0FF]/20 to-[#7000FF]/20 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white/50">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                {isEditing ? (
                  <div>
                    <Label className="text-gray-400 mb-2 block">Name</Label>
                    <Input
                      data-testid="edit-name-input"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-[#1A1A1A] border-white/10 text-white text-2xl font-bold focus:border-[#00F0FF]"
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl md:text-4xl font-bold text-white font-['Outfit'] mb-2">
                      {person.name}
                    </h1>
                    <div className="flex items-center gap-4 text-gray-400">
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                        {activeSocials.length} social networks
                      </span>
                    </div>
                  </>
                )}

                {/* Quick Stats */}
                {!isEditing && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {activeSocials.map(social => (
                      <div
                        key={social.platform}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
                      >
                        <SocialIcon platform={social.platform} size={16} />
                        <span className="text-sm text-gray-300 capitalize">{social.platform}</span>
                        {social.profile_url && (
                          <a
                            href={getSocialUrl(social.platform, social.profile_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00F0FF] hover:text-[#00F0FF]/80"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Social Networks Section */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white font-['Outfit'] mb-6">
              Social Networks
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SOCIAL_NETWORKS.map(network => {
                const socialData = isEditing
                  ? editData.social_networks.find(sn => sn.platform === network.id)
                  : person.social_networks?.find(sn => sn.platform === network.id);
                
                const isActive = socialData?.has_account || false;

                return (
                  <motion.div
                    key={network.id}
                    layout
                    className={`p-4 rounded-xl border transition-colors ${
                      isActive 
                        ? 'bg-[#1A1A1A] border-[#00F0FF]/20' 
                        : 'bg-[#0F0F0F] border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <SocialIcon platform={network.id} size={24} active={isActive} />
                        <div>
                          <span className={`font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                            {network.name}
                          </span>
                          {isActive && socialData?.profile_url && !isEditing && (
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">
                              {socialData.profile_url}
                            </p>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <Switch
                          data-testid={`edit-toggle-${network.id}`}
                          checked={isActive}
                          onCheckedChange={(checked) => handleSocialToggle(network.id, checked)}
                        />
                      ) : (
                        isActive ? (
                          <Check className="w-5 h-5 text-[#00FF94]" />
                        ) : (
                          <X className="w-5 h-5 text-gray-600" />
                        )
                      )}
                    </div>

                    {isEditing && isActive && (
                      <Input
                        data-testid={`edit-input-${network.id}`}
                        placeholder={network.placeholder}
                        value={socialData?.profile_url || ""}
                        onChange={(e) => handleSocialUrlChange(network.id, e.target.value)}
                        className="mt-3 bg-[#0A0A0A] border-white/10 text-sm text-white focus:border-[#00F0FF]"
                      />
                    )}

                    {!isEditing && isActive && socialData?.profile_url && (
                      <a
                        href={getSocialUrl(network.id, socialData.profile_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-2 text-sm text-[#00F0FF] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Profile
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
