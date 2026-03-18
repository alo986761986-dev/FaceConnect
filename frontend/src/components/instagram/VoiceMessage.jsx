import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Play, Pause, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export function VoiceMessageRecorder({ onSend, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [waveform, setWaveform] = useState([]);
  const [sending, setSending] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const audioUrlRef = useRef(null);

  // Keep audioUrlRef in sync
  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      // Cleanup using refs to avoid dependency issues
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      clearInterval(timerRef.current);
      cancelAnimationFrame(animationRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for waveform
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Start visualizing waveform
      visualizeWaveform();
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        cancelAnimationFrame(animationRef.current);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Could not access microphone");
    }
  };

  const visualizeWaveform = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Sample 20 bars from the frequency data
      const bars = [];
      const step = Math.floor(bufferLength / 20);
      for (let i = 0; i < 20; i++) {
        bars.push(dataArray[i * step] / 255);
      }
      setWaveform(bars);
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    
    setSending(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64 = reader.result.split(",")[1];
        
        await onSend({
          audio_base64: base64,
          duration: recordingTime,
          waveform: waveform
        });
        
        // Reset
        setAudioBlob(null);
        setAudioUrl(null);
        setWaveform([]);
        setRecordingTime(0);
      };
    } catch (error) {
      toast.error("Failed to send voice message");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setWaveform([]);
    setRecordingTime(0);
    onCancel?.();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--muted)] rounded-2xl">
      {!audioBlob ? (
        <>
          {/* Recording controls */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isRecording 
                ? "bg-red-500 text-white animate-pulse" 
                : "bg-[var(--primary)] text-white"
            }`}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          {isRecording ? (
            <>
              {/* Waveform visualization */}
              <div className="flex-1 flex items-center gap-0.5 h-8">
                {waveform.map((bar, i) => (
                  <div
                    key={i}
                    className="w-1 bg-[var(--primary)] rounded-full transition-all"
                    style={{ height: `${Math.max(4, bar * 32)}px` }}
                  />
                ))}
              </div>
              
              {/* Timer */}
              <span className="text-sm font-mono text-red-500">
                {formatTime(recordingTime)}
              </span>
            </>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">
              Tap to record
            </span>
          )}
          
          {isRecording && (
            <button
              onClick={handleCancel}
              className="p-2 text-[var(--text-muted)] hover:text-red-500"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </>
      ) : (
        <>
          {/* Playback controls */}
          <VoiceMessagePlayer audioUrl={audioUrl} duration={recordingTime} />
          
          <button
            onClick={handleCancel}
            className="p-2 text-[var(--text-muted)] hover:text-red-500"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </>
      )}
    </div>
  );
}

export function VoiceMessagePlayer({ audioUrl, duration, waveform = [], isListened = false, onListened }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (!isListened) onListened?.();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isListened, onListened]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 flex-1">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center flex-shrink-0"
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      
      {/* Waveform or progress bar */}
      <div className="flex-1 relative h-8">
        {waveform.length > 0 ? (
          <div className="flex items-center gap-0.5 h-full">
            {waveform.map((bar, i) => {
              const barProgress = (i / waveform.length) * 100;
              const isPassed = barProgress < progress;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-colors ${
                    isPassed ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                  }`}
                  style={{ height: `${Math.max(4, bar * 32)}px` }}
                />
              );
            })}
          </div>
        ) : (
          <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--primary)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      
      <span className="text-xs text-[var(--text-muted)] font-mono min-w-[40px]">
        {formatTime(isPlaying ? currentTime : duration)}
      </span>
      
      {!isListened && (
        <div className="w-2 h-2 rounded-full bg-[var(--primary)]" title="Unheard" />
      )}
    </div>
  );
}

export default VoiceMessageRecorder;
