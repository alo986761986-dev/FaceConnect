import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from "face-api.js";
import {
  Scan, Upload, Camera, X, Check, AlertCircle,
  RotateCcw, Trash2, History, ChevronRight, Loader2,
  Users, Percent, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { haptic } from "@/utils/mobile";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Initialize face-api models
let modelsLoaded = false;

async function loadFaceApiModels() {
  if (modelsLoaded) return;
  
  const MODEL_URL = "/models";
  
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
    console.log("Face API models loaded for comparison");
  } catch (error) {
    console.error("Failed to load face-api models:", error);
    throw error;
  }
}

// Extract face descriptor from image
async function extractFaceDescriptor(imageElement) {
  const detection = await faceapi
    .detectSingleFace(imageElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  if (!detection) {
    throw new Error("No face detected in image");
  }
  
  return Array.from(detection.descriptor);
}

export function FaceComparisonDialog({ open, onOpenChange }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modelsReady, setModelsReady] = useState(modelsLoaded);
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image1Preview, setImage1Preview] = useState(null);
  const [image2Preview, setImage2Preview] = useState(null);
  const [descriptor1, setDescriptor1] = useState(null);
  const [descriptor2, setDescriptor2] = useState(null);
  const [processing, setProcessing] = useState({ img1: false, img2: false });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const fileInput1Ref = useRef(null);
  const fileInput2Ref = useRef(null);

  // Load models on mount
  useEffect(() => {
    if (open && !modelsReady) {
      loadFaceApiModels()
        .then(() => setModelsReady(true))
        .catch(() => {
          toast.error("Failed to load face detection models");
        });
    }
  }, [open, modelsReady]);

  // Load history
  useEffect(() => {
    if (open && token) {
      fetch(`${API}/face-compare/history?token=${token}&limit=10`)
        .then(res => res.json())
        .then(data => setHistory(data))
        .catch(console.error);
    }
  }, [open, token]);

  const handleImageUpload = async (file, imageNum) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      
      if (imageNum === 1) {
        setImage1Preview(dataUrl);
        setDescriptor1(null);
        setProcessing(p => ({ ...p, img1: true }));
      } else {
        setImage2Preview(dataUrl);
        setDescriptor2(null);
        setProcessing(p => ({ ...p, img2: true }));
      }
      
      // Extract face descriptor
      const img = new Image();
      img.onload = async () => {
        try {
          const descriptor = await extractFaceDescriptor(img);
          
          if (imageNum === 1) {
            setDescriptor1(descriptor);
            setImage1(dataUrl);
            toast.success("Face detected in image 1");
          } else {
            setDescriptor2(descriptor);
            setImage2(dataUrl);
            toast.success("Face detected in image 2");
          }
          haptic.success();
        } catch (err) {
          toast.error(`No face detected in image ${imageNum}`);
          if (imageNum === 1) {
            setImage1Preview(null);
          } else {
            setImage2Preview(null);
          }
        } finally {
          setProcessing(p => ({ ...p, [imageNum === 1 ? "img1" : "img2"]: false }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleCompare = async () => {
    if (!descriptor1 || !descriptor2) {
      toast.error("Please upload two photos with faces");
      return;
    }

    setLoading(true);
    setError(null);
    haptic.light();

    try {
      const response = await fetch(`${API}/face-compare/compare?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptor1,
          descriptor2,
          image1_url: image1Preview?.substring(0, 100), // Store truncated for thumbnail
          image2_url: image2Preview?.substring(0, 100)
        })
      });

      if (!response.ok) {
        throw new Error("Comparison failed");
      }

      const data = await response.json();
      setResult(data);
      haptic.success();
      
      // Refresh history
      fetch(`${API}/face-compare/history?token=${token}&limit=10`)
        .then(res => res.json())
        .then(data => setHistory(data))
        .catch(console.error);
        
    } catch (err) {
      console.error("Compare error:", err);
      setError("Failed to compare faces. Please try again.");
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  const resetComparison = () => {
    setImage1(null);
    setImage2(null);
    setImage1Preview(null);
    setImage2Preview(null);
    setDescriptor1(null);
    setDescriptor2(null);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  const getMatchColor = (similarity) => {
    if (similarity >= 85) return "text-green-500";
    if (similarity >= 70) return "text-yellow-500";
    if (similarity >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const getMatchBgColor = (match) => {
    return match ? "bg-green-500/20 border-green-500/30" : "bg-red-500/20 border-red-500/30";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-[#00F0FF]" />
            Face Comparison
          </DialogTitle>
        </DialogHeader>

        {!modelsReady ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-[#00F0FF]" />
            <p className="text-gray-400">Loading face detection models...</p>
          </div>
        ) : showHistory ? (
          // History View
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Recent Comparisons</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {history.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No comparison history</p>
            ) : (
              <div className="space-y-2">
                {history.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${getMatchBgColor(item.match)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.match ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                        <span className={`font-bold ${getMatchColor(item.similarity)}`}>
                          {item.similarity}% Similar
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      Confidence: {item.confidence}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : result ? (
          // Result View
          <div className="space-y-6 py-4">
            <div className={`p-6 rounded-xl border-2 ${getMatchBgColor(result.match)} text-center`}>
              {result.match ? (
                <>
                  <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-2xl font-bold text-green-500">Match Found!</h3>
                </>
              ) : (
                <>
                  <X className="w-16 h-16 mx-auto mb-4 text-red-500" />
                  <h3 className="text-2xl font-bold text-red-500">No Match</h3>
                </>
              )}
              
              <div className={`text-4xl font-bold mt-4 ${getMatchColor(result.similarity)}`}>
                {result.similarity}%
              </div>
              <p className="text-gray-400 mt-1">Similarity</p>
              
              <div className="mt-4 flex justify-center gap-4 text-sm">
                <div className="px-3 py-1 rounded-full bg-white/10">
                  Confidence: <span className="font-semibold capitalize">{result.confidence}</span>
                </div>
              </div>
            </div>
            
            {/* Image comparison display */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-white/5">
                {image1Preview && <img src={image1Preview} alt="Face 1" className="w-full h-full object-cover" />}
              </div>
              <ArrowRight className="w-6 h-6 text-gray-500" />
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-white/5">
                {image2Preview && <img src={image2Preview} alt="Face 2" className="w-full h-full object-cover" />}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={resetComparison}
                className="flex-1"
                variant="outline"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Compare Again
              </Button>
              <Button
                onClick={() => setShowHistory(true)}
                variant="ghost"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            </div>
          </div>
        ) : (
          // Upload View
          <div className="space-y-6 py-4">
            {/* Upload Areas */}
            <div className="grid grid-cols-2 gap-4">
              {/* Image 1 */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Photo 1</label>
                <input
                  ref={fileInput1Ref}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0], 1)}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInput1Ref.current?.click()}
                  className={`w-full aspect-square rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center ${
                    descriptor1 
                      ? "border-green-500 bg-green-500/10" 
                      : "border-white/20 hover:border-[#00F0FF]"
                  }`}
                  data-testid="upload-photo-1"
                >
                  {processing.img1 ? (
                    <Loader2 className="w-8 h-8 animate-spin text-[#00F0FF]" />
                  ) : image1Preview ? (
                    <div className="relative w-full h-full">
                      <img src={image1Preview} alt="Face 1" className="w-full h-full object-cover rounded-lg" />
                      {descriptor1 && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-500 mb-2" />
                      <span className="text-sm text-gray-500">Upload</span>
                    </>
                  )}
                </motion.button>
              </div>
              
              {/* Image 2 */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Photo 2</label>
                <input
                  ref={fileInput2Ref}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0], 2)}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInput2Ref.current?.click()}
                  className={`w-full aspect-square rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center ${
                    descriptor2 
                      ? "border-green-500 bg-green-500/10" 
                      : "border-white/20 hover:border-[#00F0FF]"
                  }`}
                  data-testid="upload-photo-2"
                >
                  {processing.img2 ? (
                    <Loader2 className="w-8 h-8 animate-spin text-[#00F0FF]" />
                  ) : image2Preview ? (
                    <div className="relative w-full h-full">
                      <img src={image2Preview} alt="Face 2" className="w-full h-full object-cover rounded-lg" />
                      {descriptor2 && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-500 mb-2" />
                      <span className="text-sm text-gray-500">Upload</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Status */}
            {(descriptor1 || descriptor2) && (
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className={`flex items-center gap-1 ${descriptor1 ? "text-green-500" : "text-gray-500"}`}>
                  {descriptor1 ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  Photo 1 {descriptor1 ? "ready" : "no face"}
                </div>
                <div className={`flex items-center gap-1 ${descriptor2 ? "text-green-500" : "text-gray-500"}`}>
                  {descriptor2 ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  Photo 2 {descriptor2 ? "ready" : "no face"}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Compare Button */}
            <Button
              onClick={handleCompare}
              disabled={!descriptor1 || !descriptor2 || loading}
              className="w-full py-3 bg-gradient-to-r from-[#00F0FF] to-[#7000FF] hover:opacity-90"
              data-testid="compare-faces-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5 mr-2" />
                  Compare Faces
                </>
              )}
            </Button>

            {/* History Button */}
            {history.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => setShowHistory(true)}
                className="w-full text-gray-400"
              >
                <History className="w-4 h-4 mr-2" />
                View History ({history.length})
              </Button>
            )}

            {/* Info */}
            <div className="flex items-start gap-2 p-3 bg-white/5 rounded-lg text-xs text-gray-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#00F0FF]" />
              <p>
                Upload two photos containing faces. The AI will analyze facial features 
                and calculate how similar they are. For best results, use clear, front-facing photos.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Button to open Face Comparison from menu/settings
export function FaceCompareButton({ isDark }) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant="outline"
        className={`w-full justify-start gap-3 ${
          isDark ? "border-white/10 hover:bg-white/5" : "border-gray-200"
        }`}
        data-testid="face-compare-btn"
      >
        <Scan className="w-5 h-5 text-[#00F0FF]" />
        <div className="text-left">
          <div className="font-medium">Face Comparison</div>
          <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Compare two photos to find matches
          </div>
        </div>
      </Button>

      <FaceComparisonDialog open={showDialog} onOpenChange={setShowDialog} />
    </>
  );
}

export default FaceComparisonDialog;
