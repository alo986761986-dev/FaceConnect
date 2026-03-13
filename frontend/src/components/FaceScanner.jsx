import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from "face-api.js";
import { toast } from "sonner";
import axios from "axios";
import { Link } from "react-router-dom";
import { 
  Camera, CameraOff, Scan, RefreshCw, 
  User, AlertCircle, CheckCircle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const FaceScanner = ({ isOpen, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);

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

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setError(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please grant permission.");
    }
  }, []);

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

  // Scan for faces
  const scanFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;
    
    setScanning(true);
    setMatches([]);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Detect face with landmarks and descriptor
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (detection) {
        setFaceDetected(true);
        
        // Draw detection on canvas
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);
        
        const resizedDetection = faceapi.resizeResults(detection, displaySize);
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetection);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetection);
        
        // Send descriptor to backend for matching
        const descriptor = Array.from(detection.descriptor);
        
        const response = await axios.post(`${API}/face-match`, {
          face_descriptor: descriptor,
          threshold: 0.6
        });
        
        setMatches(response.data);
        
        if (response.data.length > 0) {
          toast.success(`Found ${response.data.length} match(es)!`);
        } else {
          toast.info("No matching persons found");
        }
      } else {
        setFaceDetected(false);
        toast.error("No face detected. Please position your face in the frame.");
      }
    } catch (err) {
      console.error("Error scanning face:", err);
      toast.error("Error scanning face");
    } finally {
      setScanning(false);
    }
  }, [cameraActive]);

  // Initialize on open
  useEffect(() => {
    if (isOpen && !modelsLoaded) {
      loadModels();
    }
  }, [isOpen, modelsLoaded, loadModels]);

  // Start camera when models loaded
  useEffect(() => {
    if (isOpen && modelsLoaded && !cameraActive) {
      startCamera();
    }
  }, [isOpen, modelsLoaded, cameraActive, startCamera]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#121212] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-['Outfit'] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F0FF] to-[#7000FF] flex items-center justify-center">
              <Scan className="w-4 h-4" />
            </div>
            Face Scanner
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Scan a face to find matching persons in your database
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Camera View */}
          {modelsLoaded && (
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
              <div className="flex justify-center gap-3 mt-4">
                {cameraActive ? (
                  <>
                    <Button
                      data-testid="scan-face-btn"
                      onClick={scanFace}
                      disabled={scanning}
                      className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90 text-white px-6"
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      {scanning ? "Scanning..." : "Scan Face"}
                    </Button>
                    <Button
                      data-testid="stop-camera-btn"
                      variant="outline"
                      onClick={stopCamera}
                      className="bg-transparent border-white/10 text-white hover:bg-white/5"
                    >
                      <CameraOff className="w-4 h-4 mr-2" />
                      Stop Camera
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
            </div>
          )}

          {/* Matches Results */}
          <AnimatePresence>
            {matches.length > 0 && (
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
                        className="flex items-center gap-4 p-4 rounded-xl bg-[#1A1A1A] border border-white/5 hover:border-[#00F0FF]/30 transition-colors"
                      >
                        {/* Photo */}
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
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium truncate">{match.name}</h4>
                          <p className="text-sm text-gray-500">
                            Distance: {match.distance.toFixed(3)}
                          </p>
                        </div>
                        
                        {/* Confidence */}
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
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* No Matches State */}
          {faceDetected && !scanning && matches.length === 0 && (
            <div className="text-center py-6 bg-[#1A1A1A] rounded-xl border border-white/5">
              <User className="w-10 h-10 mx-auto mb-3 text-gray-500" />
              <p className="text-gray-400">No matching persons found</p>
              <p className="text-sm text-gray-600 mt-1">Try adding this person to your database first</p>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-white/5">
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
      </DialogContent>
    </Dialog>
  );
};

export default FaceScanner;
