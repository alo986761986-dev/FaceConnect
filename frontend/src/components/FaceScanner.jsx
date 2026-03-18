import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from "face-api.js";
import { toast } from "sonner";
import axios from "axios";
import { Link } from "react-router-dom";
import { 
  Camera, CameraOff, Scan, RefreshCw, 
  User, AlertCircle, CheckCircle, X, 
  Images, Upload, Trash2, ImageIcon,
  Settings2, Sparkles, Zap, Eye, EyeOff,
  CameraIcon, SwitchCamera, Volume2, VolumeX,
  Instagram, Twitter, Facebook, Linkedin, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/context/SettingsContext";
import { haptic } from "@/utils/mobile";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Social network icons mapping
const SOCIAL_ICONS = {
  instagram: Instagram,
  twitter: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Globe,
  youtube: Globe,
  snapchat: Globe,
  website: Globe,
};

// Quality presets
const QUALITY_PRESETS = {
  low: { inputSize: 160, scoreThreshold: 0.3, label: "Low (Fast)" },
  medium: { inputSize: 320, scoreThreshold: 0.5, label: "Medium" },
  high: { inputSize: 416, scoreThreshold: 0.6, label: "High (Recommended)" },
  ultra: { inputSize: 608, scoreThreshold: 0.7, label: "Ultra (Slow)" },
};

export const FaceScanner = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettings();
  const faceScanSettings = useMemo(() => settings?.faceScan || {
    quality: "high",
    multipleFaces: true,
    autoSnapshot: false,
    aiEnhancement: true,
    scanSensitivity: 0.6,
    showLandmarks: true,
    showConfidence: true,
    saveHistory: true,
    hapticFeedback: true,
  }, [settings?.faceScan]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const snapshotCanvasRef = useRef(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facesCount, setFacesCount] = useState(0);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("camera");
  const [showSettings, setShowSettings] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // user or environment
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  
  // AI Enhancement state
  const [aiProcessing, setAiProcessing] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState(0);
  
  // Bulk scanning state
  const [galleryImages, setGalleryImages] = useState([]);
  const [bulkScanning, setBulkScanning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResults, setBulkResults] = useState([]);

  // Get quality settings
  const qualityPreset = QUALITY_PRESETS[faceScanSettings.quality] || QUALITY_PRESETS.high;

  // Load face-api models
  const loadModels = useCallback(async () => {
    try {
      setLoadingProgress(10);
      const MODEL_URL = '/models';
      
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setLoadingProgress(40);
      
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setLoadingProgress(70);
      
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setLoadingProgress(100);
      
      setModelsLoaded(true);
    } catch (err) {
      console.error("Error loading models:", err);
      setError("Failed to load face detection models");
    }
  }, []);

  // Start camera with quality settings
  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: { 
          facingMode: facingMode,
          width: { ideal: faceScanSettings.quality === "ultra" ? 1920 : faceScanSettings.quality === "high" ? 1280 : 640 },
          height: { ideal: faceScanSettings.quality === "ultra" ? 1080 : faceScanSettings.quality === "high" ? 720 : 480 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setError(null);
        
        if (faceScanSettings.hapticFeedback) {
          haptic.light();
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please grant permission.");
      if (faceScanSettings.hapticFeedback) {
        haptic.error();
      }
    }
  }, [facingMode, faceScanSettings.quality, faceScanSettings.hapticFeedback]);

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
    if (faceScanSettings.hapticFeedback) {
      haptic.medium();
    }
  }, [faceScanSettings.hapticFeedback]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (cameraActive && modelsLoaded) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setFaceDetected(false);
  }, []);

  // Take snapshot for direct scanning
  const takeSnapshot = useCallback(() => {
    if (!videoRef.current || !cameraActive) return null;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setLastSnapshot(imageData);
    
    if (faceScanSettings.hapticFeedback) {
      haptic.medium();
    }
    
    toast.success("Snapshot captured!");
    return imageData;
  }, [cameraActive, faceScanSettings.hapticFeedback]);

  // Scan for faces (camera) - supports single or multiple faces
  const scanFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;
    
    setScanning(true);
    setMatches([]);
    setConfidenceScore(0);
    
    if (faceScanSettings.hapticFeedback) {
      haptic.light();
    }
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Get detection options based on quality preset
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: qualityPreset.inputSize,
        scoreThreshold: qualityPreset.scoreThreshold
      });
      
      let detections;
      
      if (faceScanSettings.multipleFaces) {
        // Detect all faces
        detections = await faceapi
          .detectAllFaces(video, detectorOptions)
          .withFaceLandmarks()
          .withFaceDescriptors();
      } else {
        // Detect single face
        const singleDetection = await faceapi
          .detectSingleFace(video, detectorOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();
        detections = singleDetection ? [singleDetection] : [];
      }
      
      if (detections.length > 0) {
        setFaceDetected(true);
        setFacesCount(detections.length);
        
        // Calculate average confidence
        const avgConfidence = detections.reduce((sum, d) => sum + (d.detection?.score || 0), 0) / detections.length;
        setConfidenceScore(Math.round(avgConfidence * 100));
        
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw detections
        faceapi.draw.drawDetections(canvas, resizedDetections);
        
        // Draw landmarks if enabled
        if (faceScanSettings.showLandmarks) {
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }
        
        // AI Enhancement processing simulation
        if (faceScanSettings.aiEnhancement) {
          setAiProcessing(true);
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate AI processing
          setAiProcessing(false);
        }
        
        // Match each detected face
        const allMatches = [];
        
        for (const detection of detections) {
          const descriptor = Array.from(detection.descriptor);
          
          try {
            const response = await axios.post(`${API}/face-match`, {
              face_descriptor: descriptor,
              threshold: faceScanSettings.scanSensitivity
            });
            
            if (response.data.length > 0) {
              allMatches.push(...response.data);
            }
          } catch (err) {
            console.error("Face match error:", err);
          }
        }
        
        // Remove duplicate matches
        const uniqueMatches = allMatches.filter((match, index, self) =>
          index === self.findIndex(m => m.person_id === match.person_id)
        );
        
        setMatches(uniqueMatches);
        
        // Save to history if enabled
        if (faceScanSettings.saveHistory && uniqueMatches.length > 0) {
          const historyEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            facesDetected: detections.length,
            matches: uniqueMatches,
            confidence: avgConfidence
          };
          setScanHistory(prev => [historyEntry, ...prev].slice(0, 50)); // Keep last 50
        }
        
        if (faceScanSettings.hapticFeedback) {
          haptic.success();
        }
        
        if (uniqueMatches.length > 0) {
          toast.success(`Found ${uniqueMatches.length} match(es) from ${detections.length} face(s)!`);
        } else {
          toast.info(`${detections.length} face(s) detected, no matches found`);
        }
      } else {
        setFaceDetected(false);
        setFacesCount(0);
        if (faceScanSettings.hapticFeedback) {
          haptic.error();
        }
        toast.error("No face detected. Please position your face in the frame.");
      }
    } catch (err) {
      console.error("Error scanning face:", err);
      toast.error("Error scanning face");
    } finally {
      setScanning(false);
    }
  }, [cameraActive, faceScanSettings, qualityPreset]);

  // Handle gallery image selection
  const handleGallerySelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = [];
    let processed = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file: file,
          preview: reader.result,
          name: file.name,
          status: 'pending', // pending, scanning, done, no_face
          matches: []
        });
        processed++;
        
        if (processed === files.length) {
          setGalleryImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove image from gallery
  const removeGalleryImage = (imageId) => {
    setGalleryImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Clear all gallery images
  const clearGallery = () => {
    setGalleryImages([]);
    setBulkResults([]);
  };

  // Scan single image for faces with quality settings
  const scanSingleImage = async (imageData) => {
    const img = new Image();
    img.src = imageData;
    await new Promise((resolve) => { img.onload = resolve; });

    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: qualityPreset.inputSize,
      scoreThreshold: qualityPreset.scoreThreshold
    });

    const detections = await faceapi
      .detectAllFaces(img, detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();

    return detections;
  };

  // Bulk scan all gallery images
  const bulkScanGallery = async () => {
    if (galleryImages.length === 0 || !modelsLoaded) return;

    setBulkScanning(true);
    setBulkProgress(0);
    setBulkResults([]);

    const results = [];
    const totalImages = galleryImages.length;

    for (let i = 0; i < galleryImages.length; i++) {
      const image = galleryImages[i];
      
      // Update image status
      setGalleryImages(prev => prev.map(img => 
        img.id === image.id ? { ...img, status: 'scanning' } : img
      ));

      try {
        const detections = await scanSingleImage(image.preview);
        
        let imageMatches = [];
        
        if (detections.length > 0) {
          // Match each detected face
          for (const detection of detections) {
            const descriptor = Array.from(detection.descriptor);
            
            try {
              const response = await axios.post(`${API}/face-match`, {
                face_descriptor: descriptor,
                threshold: faceScanSettings.scanSensitivity
              });
              
              if (response.data.length > 0) {
                imageMatches.push(...response.data);
              }
            } catch (err) {
              console.error("Face match error:", err);
            }
          }

          // Remove duplicate matches
          const uniqueMatches = imageMatches.filter((match, index, self) =>
            index === self.findIndex(m => m.person_id === match.person_id)
          );

          results.push({
            imageId: image.id,
            imageName: image.name,
            imagePreview: image.preview,
            facesDetected: detections.length,
            matches: uniqueMatches,
            status: 'done'
          });

          setGalleryImages(prev => prev.map(img => 
            img.id === image.id ? { ...img, status: 'done', matches: uniqueMatches } : img
          ));
        } else {
          results.push({
            imageId: image.id,
            imageName: image.name,
            imagePreview: image.preview,
            facesDetected: 0,
            matches: [],
            status: 'no_face'
          });

          setGalleryImages(prev => prev.map(img => 
            img.id === image.id ? { ...img, status: 'no_face', matches: [] } : img
          ));
        }
      } catch (err) {
        console.error("Error scanning image:", err);
        setGalleryImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'error' } : img
        ));
      }

      setBulkProgress(Math.round(((i + 1) / totalImages) * 100));
    }

    setBulkResults(results);
    setBulkScanning(false);

    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
    const totalFaces = results.reduce((sum, r) => sum + r.facesDetected, 0);
    
    toast.success(`Scanned ${totalImages} images: ${totalFaces} faces found, ${totalMatches} matches!`);
  };

  // Initialize on open
  useEffect(() => {
    if (isOpen && !modelsLoaded) {
      loadModels();
    }
  }, [isOpen, modelsLoaded, loadModels]);

  // Start camera when models loaded (only for camera tab)
  useEffect(() => {
    if (isOpen && modelsLoaded && !cameraActive && activeTab === "camera") {
      startCamera();
    }
  }, [isOpen, modelsLoaded, cameraActive, activeTab, startCamera]);

  // Stop camera when switching to gallery tab
  useEffect(() => {
    if (activeTab === "gallery" && cameraActive) {
      stopCamera();
    }
  }, [activeTab, cameraActive, stopCamera]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMatches([]);
      setFaceDetected(false);
    }
  }, [isOpen, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const totalMatchesInBulk = bulkResults.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#121212] border-white/10 text-white max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-['Outfit'] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
              <Scan className="w-4 h-4" />
            </div>
            Face Scanner
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Scan faces to find matching persons in your database
          </DialogDescription>
        </DialogHeader>

        {/* Loading Models */}
        {!modelsLoaded && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1A1A1A] flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-[#00F0FF] animate-spin" />
            </div>
            <p className="text-gray-400 mb-4">Loading face detection models...</p>
            <Progress value={loadingProgress} className="w-64 mx-auto" />
          </div>
        )}

        {modelsLoaded && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 bg-[#1A1A1A] p-1">
              <TabsTrigger 
                value="camera" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00F0FF]/20 data-[state=active]:to-[#7000FF]/20 data-[state=active]:text-[#00F0FF]"
              >
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </TabsTrigger>
              <TabsTrigger 
                value="gallery"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00F0FF]/20 data-[state=active]:to-[#7000FF]/20 data-[state=active]:text-[#00F0FF]"
              >
                <Images className="w-4 h-4 mr-2" />
                Gallery ({galleryImages.length})
              </TabsTrigger>
            </TabsList>

            {/* Camera Tab */}
            <TabsContent value="camera" className="flex-1 overflow-auto mt-4">
              <div className="space-y-4">
                {/* Error State */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Camera View */}
                <div className="relative">
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-2 border-[#00F0FF]/30">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full"
                    />
                    
                    {/* Scanning Overlay */}
                    {scanning && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-[#00F0FF] border-t-transparent animate-spin" />
                          <p className="text-[#00F0FF] text-sm">Scanning...</p>
                        </div>
                      </div>
                    )}

                    {/* Face Detected Indicator */}
                    {faceDetected && !scanning && (
                      <div className="absolute top-4 right-4 bg-green-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400 font-medium">Face Detected</span>
                      </div>
                    )}

                    {/* Camera Status */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      {cameraActive ? (
                        <div className="bg-green-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-xs text-green-400">Camera Active</span>
                        </div>
                      ) : (
                        <div className="bg-red-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
                          <CameraOff className="w-3 h-3 text-red-400" />
                          <span className="text-xs text-red-400">Camera Off</span>
                        </div>
                      )}
                    </div>

                    {/* Scan Line Animation */}
                    {scanning && (
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-[#00F0FF] shadow-[0_0_10px_#00F0FF] animate-scan" />
                    )}

                    {/* Reticle */}
                    <div className="absolute inset-8 border-2 border-[#00F0FF]/30 rounded-xl pointer-events-none">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00F0FF] rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00F0FF] rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00F0FF] rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00F0FF] rounded-br-lg" />
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {cameraActive ? (
                      <>
                        {/* Switch Camera Button */}
                        <Button
                          data-testid="switch-camera-btn"
                          variant="outline"
                          onClick={switchCamera}
                          className="bg-transparent border-white/10 text-white hover:bg-white/5"
                        >
                          <SwitchCamera className="w-4 h-4" />
                        </Button>
                        
                        {/* Snapshot Button */}
                        <Button
                          data-testid="snapshot-btn"
                          variant="outline"
                          onClick={takeSnapshot}
                          className="bg-transparent border-white/10 text-white hover:bg-white/5"
                        >
                          <CameraIcon className="w-4 h-4" />
                        </Button>
                        
                        {/* Scan Button */}
                        <Button
                          data-testid="scan-face-btn"
                          onClick={scanFace}
                          disabled={scanning || aiProcessing}
                          className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white px-6"
                        >
                          {aiProcessing ? (
                            <>
                              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                              AI Processing...
                            </>
                          ) : scanning ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Scan className="w-4 h-4 mr-2" />
                              Scan {faceScanSettings.multipleFaces ? "Faces" : "Face"}
                            </>
                          )}
                        </Button>
                        
                        {/* Stop Camera */}
                        <Button
                          data-testid="stop-camera-btn"
                          variant="outline"
                          onClick={stopCamera}
                          className="bg-transparent border-white/10 text-white hover:bg-white/5"
                        >
                          <CameraOff className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        data-testid="start-camera-btn"
                        onClick={startCamera}
                        className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white px-6"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Start Camera
                      </Button>
                    )}
                  </div>
                  
                  {/* Status Indicators */}
                  {cameraActive && (
                    <div className="flex justify-center gap-4 mt-3 text-xs">
                      {facesCount > 0 && (
                        <span className="text-[#00F0FF]">
                          {facesCount} face{facesCount > 1 ? 's' : ''} detected
                        </span>
                      )}
                      {confidenceScore > 0 && faceScanSettings.showConfidence && (
                        <span className={confidenceScore >= 70 ? 'text-green-400' : confidenceScore >= 50 ? 'text-yellow-400' : 'text-orange-400'}>
                          {confidenceScore}% confidence
                        </span>
                      )}
                      {faceScanSettings.aiEnhancement && (
                        <span className="text-purple-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI Enhanced
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Camera Matches */}
                <AnimatePresence>
                  {matches.length > 0 && (
                    <MatchResults matches={matches} onClose={onClose} />
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery" className="flex-1 overflow-hidden mt-4 flex flex-col">
              <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                {/* Upload Area */}
                <div className="flex gap-3">
                  <label
                    data-testid="gallery-upload-zone"
                    className="flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-[#00F0FF]/30 hover:border-[#00F0FF]/50 cursor-pointer transition-colors bg-[#0A0A0A]"
                  >
                    <Upload className="w-5 h-5 text-[#00F0FF]" />
                    <span className="text-gray-400">Select images from gallery</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGallerySelect}
                      className="hidden"
                    />
                  </label>
                  {galleryImages.length > 0 && (
                    <Button
                      data-testid="clear-gallery-btn"
                      variant="outline"
                      onClick={clearGallery}
                      className="bg-transparent border-white/10 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Gallery Grid */}
                {galleryImages.length > 0 ? (
                  <ScrollArea className="flex-1">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pr-4">
                      {galleryImages.map((image) => (
                        <div
                          key={image.id}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                            image.status === 'done' && image.matches.length > 0
                              ? 'border-green-500/50'
                              : image.status === 'no_face'
                              ? 'border-yellow-500/50'
                              : image.status === 'scanning'
                              ? 'border-[#00F0FF]/50'
                              : 'border-white/10'
                          }`}
                        >
                          <img
                            src={image.preview}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Status Overlay */}
                          {image.status === 'scanning' && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          
                          {/* Result Badge */}
                          {image.status === 'done' && (
                            <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                              image.matches.length > 0 
                                ? 'bg-green-500/80 text-white' 
                                : 'bg-gray-500/80 text-white'
                            }`}>
                              {image.matches.length > 0 ? `${image.matches.length} match` : 'No match'}
                            </div>
                          )}

                          {image.status === 'no_face' && (
                            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/80 text-black">
                              No face
                            </div>
                          )}

                          {/* Remove Button */}
                          {image.status === 'pending' && (
                            <button
                              onClick={() => removeGalleryImage(image.id)}
                              className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-red-500/50 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-8">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-lg">No images selected</p>
                    <p className="text-sm text-gray-600">Upload images to scan for faces</p>
                  </div>
                )}

                {/* Bulk Scan Controls */}
                {galleryImages.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    {bulkScanning && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Scanning images...</span>
                          <span className="text-[#00F0FF]">{bulkProgress}%</span>
                        </div>
                        <Progress value={bulkProgress} className="h-2" />
                      </div>
                    )}
                    
                    <Button
                      data-testid="bulk-scan-btn"
                      onClick={bulkScanGallery}
                      disabled={bulkScanning || galleryImages.length === 0}
                      className="w-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white"
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      {bulkScanning ? `Scanning... ${bulkProgress}%` : `Scan All ${galleryImages.length} Images`}
                    </Button>
                  </div>
                )}

                {/* Bulk Results */}
                <AnimatePresence>
                  {bulkResults.length > 0 && totalMatchesInBulk > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-3 pt-3 border-t border-white/5"
                    >
                      <h3 className="text-lg font-semibold text-white font-['Outfit'] flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        All Matches ({totalMatchesInBulk})
                      </h3>
                      
                      <ScrollArea className="max-h-[200px]">
                        <div className="space-y-2 pr-4">
                          {bulkResults
                            .filter(r => r.matches.length > 0)
                            .flatMap(r => r.matches.map(match => ({
                              ...match,
                              sourceImage: r.imageName
                            })))
                            .filter((match, index, self) => 
                              index === self.findIndex(m => m.person_id === match.person_id)
                            )
                            .map((match) => (
                              <Link
                                key={match.person_id}
                                to={`/person/${match.person_id}`}
                                onClick={() => onClose(false)}
                                className="flex items-center gap-3 p-3 rounded-xl bg-[#1A1A1A] border border-white/5 hover:border-[#00F0FF]/30 transition-colors"
                              >
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                                  {match.photo_data ? (
                                    <img
                                      src={match.photo_data}
                                      alt={match.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-[#00F0FF]/20 to-[#7000FF]/20 flex items-center justify-center">
                                      <User className="w-4 h-4 text-white/50" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-medium truncate text-sm">{match.name}</h4>
                                </div>
                                <div className={`text-sm font-bold ${
                                  match.confidence >= 80 ? 'text-green-400' :
                                  match.confidence >= 60 ? 'text-yellow-400' :
                                  'text-orange-400'
                                }`}>
                                  {match.confidence}%
                                </div>
                              </Link>
                            ))}
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Close Button */}
        <div className="flex justify-between items-center pt-4 border-t border-white/5">
          <Button
            data-testid="facescan-settings-btn"
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button
            data-testid="close-scanner-btn"
            variant="outline"
            onClick={() => onClose(false)}
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
        
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <FaceScanSettingsPanel 
              settings={faceScanSettings} 
              updateSettings={updateSettings}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

// FaceScan Settings Panel
const FaceScanSettingsPanel = ({ settings, updateSettings, onClose }) => {
  const updateSetting = (key, value) => {
    updateSettings({
      faceScan: {
        ...settings,
        [key]: value
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 bg-[#121212] z-50 p-6 overflow-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#00F0FF]" />
          FaceScan Settings
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Quality Setting */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00F0FF]" />
            Scan Quality
          </label>
          <Select
            value={settings.quality}
            onValueChange={(value) => updateSetting("quality", value)}
          >
            <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10">
              <SelectItem value="low">Low (Fast)</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High (Recommended)</SelectItem>
              <SelectItem value="ultra">Ultra (Slow but Accurate)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Higher quality = better accuracy but slower</p>
        </div>

        {/* Sensitivity Slider */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#00F0FF]" />
              Scan Sensitivity
            </span>
            <span className="text-[#00F0FF]">{Math.round(settings.scanSensitivity * 100)}%</span>
          </label>
          <Slider
            value={[settings.scanSensitivity * 100]}
            onValueChange={([value]) => updateSetting("scanSensitivity", value / 100)}
            min={30}
            max={90}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-gray-500">Lower = stricter matching, Higher = more matches</p>
        </div>

        {/* Toggle Settings */}
        <div className="space-y-4">
          {/* Multiple Faces */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A]">
            <div>
              <p className="text-white font-medium">Multiple Faces</p>
              <p className="text-xs text-gray-500">Detect all faces in frame</p>
            </div>
            <Switch
              checked={settings.multipleFaces}
              onCheckedChange={(checked) => updateSetting("multipleFaces", checked)}
            />
          </div>

          {/* AI Enhancement */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A]">
            <div>
              <p className="text-white font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                AI Enhancement
              </p>
              <p className="text-xs text-gray-500">Use AI for better recognition</p>
            </div>
            <Switch
              checked={settings.aiEnhancement}
              onCheckedChange={(checked) => updateSetting("aiEnhancement", checked)}
            />
          </div>

          {/* Auto Snapshot */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A]">
            <div>
              <p className="text-white font-medium">Auto Snapshot</p>
              <p className="text-xs text-gray-500">Capture when face detected</p>
            </div>
            <Switch
              checked={settings.autoSnapshot}
              onCheckedChange={(checked) => updateSetting("autoSnapshot", checked)}
            />
          </div>

          {/* Show Landmarks */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A]">
            <div>
              <p className="text-white font-medium">Show Landmarks</p>
              <p className="text-xs text-gray-500">Display face feature points</p>
            </div>
            <Switch
              checked={settings.showLandmarks}
              onCheckedChange={(checked) => updateSetting("showLandmarks", checked)}
            />
          </div>

          {/* Show Confidence */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A]">
            <div>
              <p className="text-white font-medium">Show Confidence</p>
              <p className="text-xs text-gray-500">Display match confidence score</p>
            </div>
            <Switch
              checked={settings.showConfidence}
              onCheckedChange={(checked) => updateSetting("showConfidence", checked)}
            />
          </div>

          {/* Haptic Feedback */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A]">
            <div>
              <p className="text-white font-medium">Haptic Feedback</p>
              <p className="text-xs text-gray-500">Vibrate on detection</p>
            </div>
            <Switch
              checked={settings.hapticFeedback}
              onCheckedChange={(checked) => updateSetting("hapticFeedback", checked)}
            />
          </div>

          {/* Save History */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1A1A]">
            <div>
              <p className="text-white font-medium">Save History</p>
              <p className="text-xs text-gray-500">Keep scan history</p>
            </div>
            <Switch
              checked={settings.saveHistory}
              onCheckedChange={(checked) => updateSetting("saveHistory", checked)}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Match Results Component with Social Networks
const MatchResults = ({ matches, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-4"
  >
    <h3 className="text-lg font-semibold text-white font-['Outfit'] flex items-center gap-2">
      <CheckCircle className="w-5 h-5 text-green-400" />
      Matches Found ({matches.length})
    </h3>
    
    <div className="space-y-3">
      {matches.map((match, index) => (
        <motion.div
          key={match.person_id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Link
            to={`/person/${match.person_id}`}
            onClick={() => onClose(false)}
            className="block p-4 rounded-xl bg-[#1A1A1A] border border-white/5 hover:border-[#00F0FF]/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                {match.photo_data ? (
                  <img
                    src={match.photo_data}
                    alt={match.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#00F0FF]/20 to-[#7000FF]/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-white/50" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{match.name}</h4>
                <p className="text-sm text-gray-500">
                  Distance: {match.distance.toFixed(3)}
                </p>
              </div>
              
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  match.confidence >= 80 ? 'text-green-400' :
                  match.confidence >= 60 ? 'text-yellow-400' :
                  'text-orange-400'
                }`}>
                  {match.confidence}%
                </div>
                <p className="text-xs text-gray-500">confidence</p>
              </div>
            </div>
            
            {/* Social Networks Display */}
            {match.social_networks && match.social_networks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-2">Active on:</p>
                <div className="flex flex-wrap gap-2">
                  {match.social_networks.filter(sn => sn.has_account).map((social, i) => {
                    const Icon = SOCIAL_ICONS[social.platform.toLowerCase()] || Globe;
                    const colors = {
                      instagram: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
                      twitter: "bg-[#1DA1F2]",
                      facebook: "bg-[#1877F2]",
                      linkedin: "bg-[#0A66C2]",
                      tiktok: "bg-black",
                      youtube: "bg-[#FF0000]",
                      snapchat: "bg-[#FFFC00] text-black",
                    };
                    
                    return (
                      <a
                        key={i}
                        href={social.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-white ${colors[social.platform.toLowerCase()] || 'bg-gray-600'}`}
                      >
                        <Icon className="w-3 h-3" />
                        <span className="capitalize">{social.platform}</span>
                        {social.username && <span>@{social.username}</span>}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </Link>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export default FaceScanner;
