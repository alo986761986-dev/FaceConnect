import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import * as faceapi from "face-api.js";
import { 
  Users, Plus, Search, BarChart3, Globe, 
  Scan, X, Upload, Check, Camera, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PersonCard from "@/components/PersonCard";
import StatsCard from "@/components/StatsCard";
import SocialIcon from "@/components/SocialIcon";
import FaceScanner from "@/components/FaceScanner";
import BottomNav from "@/components/BottomNav";
import NetworkStatus from "@/components/NetworkStatus";
import PullToRefresh from "@/components/PullToRefresh";
import { usePullToRefresh } from "@/hooks/useMobile";
import { haptic, shareContent, canShare } from "@/utils/mobile";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOCIAL_NETWORKS = [
  { id: "facebook", name: "Facebook", placeholder: "facebook.com/username" },
  { id: "instagram", name: "Instagram", placeholder: "instagram.com/username" },
  { id: "tiktok", name: "TikTok", placeholder: "tiktok.com/@username" },
  { id: "snapchat", name: "Snapchat", placeholder: "snapchat.com/add/username" },
  { id: "x", name: "X", placeholder: "x.com/username" },
  { id: "linkedin", name: "LinkedIn", placeholder: "linkedin.com/in/username" },
  { id: "discord", name: "Discord", placeholder: "discord username#0000" },
  { id: "reddit", name: "Reddit", placeholder: "reddit.com/user/username" },
  { id: "pinterest", name: "Pinterest", placeholder: "pinterest.com/username" },
  { id: "youtube", name: "YouTube", placeholder: "youtube.com/@channel" },
  { id: "whatsapp", name: "WhatsApp", placeholder: "Phone number" },
  { id: "telegram", name: "Telegram", placeholder: "@username" },
];

export default function Dashboard() {
  const [persons, setPersons] = useState([]);
  const [stats, setStats] = useState({ total_persons: 0, total_connections: 0, platforms: {} });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [newPerson, setNewPerson] = useState({
    name: "",
    photo_data: null,
    face_descriptor: null,
    social_networks: SOCIAL_NETWORKS.map(sn => ({
      platform: sn.id,
      username: "",
      profile_url: "",
      has_account: false
    }))
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const imageRef = useRef(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face models:", err);
      }
    };
    loadModels();
  }, []);

  const fetchPersons = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/persons`);
      setPersons(response.data);
    } catch (error) {
      toast.error("Failed to fetch persons");
      console.error(error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPersons(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchPersons, fetchStats]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    haptic.medium();
    await Promise.all([fetchPersons(), fetchStats()]);
    haptic.success();
    toast.success("Refreshed!");
  }, [fetchPersons, fetchStats]);

  const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(handleRefresh);

  // Share app handler
  const handleShare = async () => {
    haptic.light();
    const result = await shareContent({
      title: 'FaceConnect',
      text: 'Check out FaceConnect - Facial Recognition Social Network Tracker!',
      url: window.location.href
    });
    
    if (result.success) {
      if (result.fallback === 'clipboard') {
        toast.success('Link copied to clipboard!');
      }
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result;
        setPhotoPreview(imageData);
        setNewPerson(prev => ({ ...prev, photo_data: imageData, face_descriptor: null }));
        
        // Real face detection using face-api.js
        setIsScanning(true);
        setFaceDetected(false);
        
        if (modelsLoaded) {
          try {
            // Create image element for face detection
            const img = new Image();
            img.src = imageData;
            await new Promise((resolve) => { img.onload = resolve; });
            
            const detection = await faceapi
              .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptor();
            
            if (detection) {
              const descriptor = Array.from(detection.descriptor);
              setNewPerson(prev => ({ ...prev, face_descriptor: descriptor }));
              setFaceDetected(true);
              toast.success("Face detected and encoded!");
            } else {
              toast.warning("No face detected in image");
              setFaceDetected(false);
            }
          } catch (err) {
            console.error("Face detection error:", err);
            toast.error("Face detection failed");
          }
        } else {
          // Fallback if models not loaded
          setTimeout(() => {
            setFaceDetected(true);
            toast.success("Photo uploaded (face detection loading)");
          }, 1000);
        }
        
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSocialToggle = (platformId, checked) => {
    setNewPerson(prev => ({
      ...prev,
      social_networks: prev.social_networks.map(sn =>
        sn.platform === platformId ? { ...sn, has_account: checked } : sn
      )
    }));
  };

  const handleSocialUrlChange = (platformId, value) => {
    setNewPerson(prev => ({
      ...prev,
      social_networks: prev.social_networks.map(sn =>
        sn.platform === platformId ? { ...sn, profile_url: value, username: value } : sn
      )
    }));
  };

  const handleAddPerson = async () => {
    if (!newPerson.name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    try {
      await axios.post(`${API}/persons`, newPerson);
      toast.success("Person added successfully!");
      setIsAddModalOpen(false);
      resetForm();
      fetchPersons();
      fetchStats();
    } catch (error) {
      toast.error("Failed to add person");
      console.error(error);
    }
  };

  const handleDeletePerson = async (personId) => {
    try {
      await axios.delete(`${API}/persons/${personId}`);
      toast.success("Person deleted");
      fetchPersons();
      fetchStats();
    } catch (error) {
      toast.error("Failed to delete person");
    }
  };

  const resetForm = () => {
    setNewPerson({
      name: "",
      photo_data: null,
      face_descriptor: null,
      social_networks: SOCIAL_NETWORKS.map(sn => ({
        platform: sn.id,
        username: "",
        profile_url: "",
        has_account: false
      }))
    });
    setPhotoPreview(null);
    setFaceDetected(false);
    setIsScanning(false);
  };

  const filteredPersons = persons.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSocialCount = newPerson.social_networks.filter(sn => sn.has_account).length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Network Status Banner */}
      <NetworkStatus />
      
      {/* Pull to Refresh Indicator */}
      <PullToRefresh 
        isPulling={isPulling} 
        pullDistance={pullDistance} 
        isRefreshing={isRefreshing} 
      />

      {/* Header */}
      <header className="app-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                <Scan className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold font-['Syne']" style={{ color: 'var(--text-primary)' }}>FaceConnect</h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Social Network Tracker</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Share Button - Mobile */}
              {canShare() && (
                <Button
                  data-testid="share-btn"
                  onClick={handleShare}
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              )}
              
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <Input
                  data-testid="search-input"
                  placeholder="Search persons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <Button
                data-testid="scan-face-btn"
                onClick={() => { haptic.light(); setIsScannerOpen(true); }}
                variant="outline"
                size="icon"
                className="sm:hidden"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
              >
                <Camera className="w-5 h-5" />
              </Button>
              <Button
                data-testid="scan-face-btn-desktop"
                onClick={() => setIsScannerOpen(true)}
                variant="outline"
                className="hidden sm:flex"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
              >
                <Camera className="w-4 h-4 mr-2" />
                Scan Face
              </Button>
              <Button
                data-testid="add-person-btn"
                onClick={() => setIsAddModalOpen(true)}
                size="icon"
                className="sm:hidden text-white"
                style={{ background: 'var(--primary)' }}
              >
                <Plus className="w-5 h-5" />
              </Button>
              <Button
                data-testid="add-person-btn-desktop"
                onClick={() => setIsAddModalOpen(true)}
                className="hidden sm:flex text-white font-medium"
                style={{ background: 'var(--primary)' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Person
              </Button>
            </div>
          </div>
          
          {/* Mobile Search Bar */}
          <div className="sm:hidden mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <Input
                data-testid="search-input-mobile"
                placeholder="Search persons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
                style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
        {/* Stats Section */}
        <section className="mb-6 sm:mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              icon={Users}
              label="Total Persons"
              value={stats.total_persons}
              color="var(--primary)"
            />
            <StatsCard
              icon={Globe}
              label="Social Connections"
              value={stats.total_connections}
              color="var(--accent-purple)"
            />
            <StatsCard
              icon={BarChart3}
              label="Active Platforms"
              value={Object.keys(stats.platforms).length}
              color="var(--success)"
            />
          </div>
        </section>

        {/* Persons Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold font-['Syne']" style={{ color: 'var(--text-primary)' }}>
              Profiles
            </h2>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {filteredPersons.length} {filteredPersons.length === 1 ? 'person' : 'persons'}
            </span>
          </div>

          {loading ? (
            <div className="bento-grid">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl animate-pulse"
                  style={{ background: 'var(--muted)' }}
                />
              ))}
            </div>
          ) : filteredPersons.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--muted)' }}>
                <Users className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No persons yet</h3>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Add your first person to get started</p>
              <Button
                data-testid="add-first-person-btn"
                onClick={() => setIsAddModalOpen(true)}
                className="text-white"
                style={{ background: 'var(--primary)' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Person
              </Button>
            </motion.div>
          ) : (
            <div className="bento-grid" data-testid="persons-grid">
              <AnimatePresence>
                {filteredPersons.map((person, index) => (
                  <motion.div
                    key={person.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <PersonCard
                      person={person}
                      onDelete={() => handleDeletePerson(person.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      {/* Add Person Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#121212] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-['Outfit'] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              Add New Person
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Upload a photo and add social network profiles for this person.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Photo Upload */}
            <div>
              <Label className="text-gray-400 mb-3 block">Photo</Label>
              <div className="relative">
                {photoPreview ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-[#00F0FF]/30 bg-black">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {isScanning && (
                      <>
                        <div className="absolute inset-4 border-2 border-[#00F0FF] rounded-lg opacity-50 animate-pulse" />
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#00F0FF] shadow-[0_0_10px_#00F0FF] animate-scan" />
                      </>
                    )}
                    {faceDetected && (
                      <div className="absolute top-4 right-4 bg-green-500/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">Face Detected</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setPhotoPreview(null);
                        setNewPerson(prev => ({ ...prev, photo_data: null }));
                        setFaceDetected(false);
                      }}
                      className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    data-testid="photo-dropzone"
                    className="dropzone flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-10 h-10 text-[#00F0FF] mb-3" />
                    <span className="text-gray-400">Click to upload photo</span>
                    <span className="text-xs text-gray-600 mt-1">PNG, JPG up to 10MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Name Input */}
            <div>
              <Label htmlFor="name" className="text-gray-400 mb-2 block">Name</Label>
              <Input
                id="name"
                data-testid="person-name-input"
                placeholder="Enter person's name"
                value={newPerson.name}
                onChange={(e) => setNewPerson(prev => ({ ...prev, name: e.target.value }))}
                className="bg-[#1A1A1A] border-white/10 text-white focus:border-[#00F0FF]"
              />
            </div>

            {/* Social Networks */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-gray-400">Social Networks</Label>
                <span className="text-xs text-[#00F0FF]">
                  {activeSocialCount} active
                </span>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {SOCIAL_NETWORKS.map((network) => {
                  const socialData = newPerson.social_networks.find(sn => sn.platform === network.id);
                  const isActive = socialData?.has_account || false;

                  return (
                    <div
                      key={network.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        isActive 
                          ? 'bg-[#1A1A1A] border-[#00F0FF]/30' 
                          : 'bg-[#0F0F0F] border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <SocialIcon platform={network.id} size={20} />
                          <span className={isActive ? 'text-white' : 'text-gray-500'}>
                            {network.name}
                          </span>
                        </div>
                        <Switch
                          data-testid={`toggle-${network.id}`}
                          checked={isActive}
                          onCheckedChange={(checked) => handleSocialToggle(network.id, checked)}
                        />
                      </div>
                      {isActive && (
                        <Input
                          data-testid={`input-${network.id}`}
                          placeholder={network.placeholder}
                          value={socialData?.profile_url || ""}
                          onChange={(e) => handleSocialUrlChange(network.id, e.target.value)}
                          className="mt-2 bg-[#0A0A0A] border-white/10 text-sm text-white focus:border-[#00F0FF]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/5">
            <Button
              data-testid="cancel-add-btn"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
              className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              data-testid="save-person-btn"
              onClick={handleAddPerson}
              className="flex-1 bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white"
            >
              Add Person
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Face Scanner Modal */}
      <FaceScanner isOpen={isScannerOpen} onClose={setIsScannerOpen} />

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav 
        onScanClick={() => setIsScannerOpen(true)}
        onAddClick={() => setIsAddModalOpen(true)}
      />
    </div>
  );
}
