import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  Volume2, VolumeX, Monitor, MoreVertical, Minimize2,
  Maximize2, Users, MessageCircle, Settings, X,
  PhoneIncoming, PhoneOutgoing, Clock, ScreenShare, ScreenShareOff
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { playSound } from "@/utils/sounds";

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://faceconnect-api.onrender.com';

// WebRTC Configuration with STUN and TURN servers
// TURN servers ensure calls work even behind strict NAT/corporate firewalls
const getRTCConfig = () => {
  const iceServers = [
    // Google's public STUN servers (free, reliable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Additional public STUN servers for redundancy
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.voip.eutelia.it:3478' },
  ];

  // Add TURN servers if configured via environment variables
  // These provide relay when direct peer connection fails
  const turnUrl = process.env.REACT_APP_TURN_URL;
  const turnUsername = process.env.REACT_APP_TURN_USERNAME;
  const turnCredential = process.env.REACT_APP_TURN_CREDENTIAL;

  if (turnUrl) {
    // Add configured TURN server (UDP)
    iceServers.push({
      urls: turnUrl,
      username: turnUsername || '',
      credential: turnCredential || ''
    });
    
    // Also add TCP variant if URL starts with turn:
    if (turnUrl.startsWith('turn:')) {
      iceServers.push({
        urls: turnUrl.replace('turn:', 'turns:').replace(':3478', ':443'),
        username: turnUsername || '',
        credential: turnCredential || ''
      });
    }
    
    console.log('[CallManager] TURN server configured:', turnUrl);
  } else {
    // Use free public TURN servers as fallback
    // Note: These have limitations but work for testing/demo
    iceServers.push(
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    );
    console.log('[CallManager] Using free public TURN servers (limited bandwidth)');
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10, // Pre-gather ICE candidates for faster connection
    iceTransportPolicy: 'all' // Use both relay and direct connections
  };
};

// Get the config once at module load
const RTC_CONFIG = getRTCConfig();

// Call States
const CALL_STATES = {
  IDLE: 'idle',
  INITIATING: 'initiating',
  CALLING: 'calling',
  RINGING: 'ringing',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ENDED: 'ended',
  FAILED: 'failed'
};

export default function CallManager({ 
  isOpen, 
  onClose, 
  callType = 'video',
  contact,
  isIncoming = false,
  incomingCallId = null
}) {
  const { user, token, socket } = useAuth();
  const [callState, setCallState] = useState(isIncoming ? CALL_STATES.RINGING : CALL_STATES.INITIATING);
  const [callId, setCallId] = useState(incomingCallId);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [errorMessage, setErrorMessage] = useState(null);
  const [connectionStats, setConnectionStats] = useState(null);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const timerRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const retryCountRef = useRef(0);

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: callType === 'video' ? { 
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        } : false
      };

      console.log('[CallManager] Requesting media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      console.log('[CallManager] Media initialized successfully');
      return stream;
    } catch (error) {
      console.error('[CallManager] Error accessing media devices:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Camera/microphone access denied. Please allow permissions.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera/microphone found on this device.');
      } else {
        toast.error('Could not access camera/microphone');
      }
      return null;
    }
  }, [callType]);

  // Monitor connection statistics
  const startStatsMonitoring = useCallback((pc) => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    
    statsIntervalRef.current = setInterval(async () => {
      if (!pc || pc.connectionState === 'closed') {
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
        }
        return;
      }
      
      try {
        const stats = await pc.getStats();
        let rtt = null;
        let packetsLost = 0;
        let packetsReceived = 0;
        let bytesReceived = 0;
        let bytesSent = 0;
        let candidateType = 'unknown';
        
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime;
            candidateType = report.remoteCandidateType || 'unknown';
          }
          if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
            bytesReceived = report.bytesReceived || 0;
          }
          if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
            bytesSent = report.bytesSent || 0;
          }
        });
        
        const packetLossRate = packetsReceived > 0 
          ? (packetsLost / (packetsLost + packetsReceived)) * 100 
          : 0;
        
        // Determine connection quality based on RTT and packet loss
        let quality = 'good';
        if (rtt !== null) {
          if (rtt > 0.3 || packetLossRate > 5) {
            quality = 'poor';
          } else if (rtt > 0.15 || packetLossRate > 2) {
            quality = 'fair';
          }
        }
        
        setConnectionQuality(quality);
        setConnectionStats({
          rtt: rtt ? Math.round(rtt * 1000) : null, // Convert to ms
          packetLossRate: packetLossRate.toFixed(1),
          bytesReceived,
          bytesSent,
          candidateType, // 'relay' means TURN is being used
          isUsingTurn: candidateType === 'relay'
        });
        
        // Log if using TURN relay
        if (candidateType === 'relay') {
          console.log('[CallManager] Connection via TURN relay server');
        }
      } catch (err) {
        console.error('[CallManager] Stats monitoring error:', err);
      }
    }, 2000); // Check every 2 seconds
  }, []);

  // Create RTCPeerConnection
  const createPeerConnection = useCallback(() => {
    console.log('[CallManager] Creating peer connection');
    
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && callId) {
        console.log('[CallManager] Sending ICE candidate');
        sendSignal('ice-candidate', { candidate: event.candidate });
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log('[CallManager] ICE connection state:', pc.iceConnectionState);
      
      switch (pc.iceConnectionState) {
        case 'checking':
          setCallState(CALL_STATES.CONNECTING);
          break;
        case 'connected':
        case 'completed':
          setCallState(CALL_STATES.CONNECTED);
          setConnectionQuality('good');
          // Start monitoring connection stats
          startStatsMonitoring(pc);
          if (!timerRef.current) {
            playSound('call_connect');
            timerRef.current = setInterval(() => {
              setDuration(prev => prev + 1);
            }, 1000);
          }
          break;
        case 'disconnected':
          setConnectionQuality('poor');
          setCallState(CALL_STATES.RECONNECTING);
          break;
        case 'failed':
          if (retryCountRef.current < 3) {
            retryCountRef.current++;
            console.log('[CallManager] Connection failed, retrying...');
            pc.restartIce();
          } else {
            setCallState(CALL_STATES.FAILED);
            setErrorMessage('Connection failed. Please try again.');
          }
          break;
        case 'closed':
          setCallState(CALL_STATES.ENDED);
          break;
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('[CallManager] Received remote track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Add local tracks to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('[CallManager] Adding local track:', track.kind);
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  // Send WebRTC signal via API
  const sendSignal = useCallback(async (signalType, data) => {
    if (!callId || !token) return;
    
    try {
      await fetch(`${API_URL}/api/calls/${callId}/signal?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: callId,
          signal_type: signalType,
          data: data
        })
      });
    } catch (error) {
      console.error('[CallManager] Error sending signal:', error);
    }
  }, [callId, token]);

  // Handle incoming WebRTC signals
  const handleSignal = useCallback(async (signal) => {
    console.log('[CallManager] Received signal:', signal.signal_type);
    
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.warn('[CallManager] No peer connection for signal');
      return;
    }

    try {
      switch (signal.signal_type) {
        case 'offer':
          await pc.setRemoteDescription(new RTCSessionDescription(signal.data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal('answer', { sdp: pc.localDescription });
          // Process queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          break;
          
        case 'answer':
          await pc.setRemoteDescription(new RTCSessionDescription(signal.data.sdp));
          // Process queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          break;
          
        case 'ice-candidate':
          if (signal.data.candidate) {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.data.candidate));
            } else {
              // Queue the candidate if remote description not set yet
              iceCandidatesQueue.current.push(signal.data.candidate);
            }
          }
          break;
          
        case 'hangup':
          handleEndCall();
          break;
      }
    } catch (error) {
      console.error('[CallManager] Error handling signal:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendSignal]);

  // Initiate outgoing call
  const initiateCall = useCallback(async () => {
    console.log('[CallManager] Initiating call to:', contact?.id);
    playSound('call_outgoing');
    setCallState(CALL_STATES.INITIATING);
    
    const stream = await initializeMedia();
    if (!stream) {
      handleEndCall();
      return;
    }

    try {
      // Call the API to initiate the call
      const response = await fetch(`${API_URL}/api/calls/initiate?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: contact?.id,
          call_type: callType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initiate call');
      }

      const data = await response.json();
      setCallId(data.call_id);
      setCallState(CALL_STATES.CALLING);
      
      // Create peer connection and send offer
      const pc = createPeerConnection();
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });
      await pc.setLocalDescription(offer);
      
      // Send the offer after a short delay to ensure call is registered
      setTimeout(() => {
        sendSignal('offer', { sdp: pc.localDescription });
      }, 500);
      
    } catch (error) {
      console.error('[CallManager] Error initiating call:', error);
      toast.error('Failed to start call. Please try again.');
      handleEndCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact, callType, token, initializeMedia, createPeerConnection, sendSignal]);

  // Answer incoming call
  const answerCall = useCallback(async () => {
    console.log('[CallManager] Answering call:', callId);
    playSound('call_connect');
    setCallState(CALL_STATES.CONNECTING);
    
    const stream = await initializeMedia();
    if (!stream) {
      handleEndCall();
      return;
    }

    try {
      // Call the API to answer
      const response = await fetch(`${API_URL}/api/calls/${callId}/answer?token=${token}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to answer call');
      }

      // Create peer connection (will receive offer via WebSocket)
      createPeerConnection();
      
    } catch (error) {
      console.error('[CallManager] Error answering call:', error);
      toast.error('Failed to answer call');
      handleEndCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, token, initializeMedia, createPeerConnection]);

  // Decline incoming call
  const declineCall = useCallback(async () => {
    console.log('[CallManager] Declining call:', callId);
    playSound('call_end');
    
    try {
      if (callId) {
        await fetch(`${API_URL}/api/calls/${callId}/reject?token=${token}`, {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('[CallManager] Error declining call:', error);
    }
    
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, token, onClose]);

  // End call
  const handleEndCall = useCallback(async () => {
    console.log('[CallManager] Ending call');
    
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    // Notify server
    if (callId && token) {
      try {
        sendSignal('hangup', {});
        await fetch(`${API_URL}/api/calls/${callId}/end?token=${token}`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('[CallManager] Error ending call:', error);
      }
    }

    playSound('call_end');
    setCallState(CALL_STATES.ENDED);

    setTimeout(() => {
      onClose();
    }, 1000);
  }, [callId, token, sendSignal, onClose]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOff(prev => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = !prev;
      }
      return !prev;
    });
  }, []);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      
      // Replace with camera
      if (peerConnectionRef.current && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      }
      
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });
        
        screenStreamRef.current = screenStream;
        
        // Replace video track
        if (peerConnectionRef.current) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
          
          // Handle user stopping share via browser UI
          videoTrack.onended = () => {
            toggleScreenShare();
          };
        }
        
        setIsScreenSharing(true);
      } catch (error) {
        console.error('[CallManager] Screen share error:', error);
        if (error.name !== 'AbortError') {
          toast.error('Could not share screen');
        }
      }
    }
  }, [isScreenSharing]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for WebSocket signals
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'call_signal' && data.call_id === callId) {
          handleSignal(data);
        } else if (data.type === 'call_answered' && data.call_id === callId) {
          console.log('[CallManager] Call was answered');
        } else if (data.type === 'call_rejected' && data.call_id === callId) {
          toast.info('Call was declined');
          handleEndCall();
        } else if (data.type === 'call_ended' && data.call_id === callId) {
          toast.info('Call ended by other party');
          handleEndCall();
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, callId, handleSignal, handleEndCall]);

  // Initialize call on mount
  useEffect(() => {
    if (isOpen) {
      if (isIncoming) {
        playSound('call_incoming');
        setCallId(incomingCallId);
      } else {
        initiateCall();
      }
    }

    return () => {
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // Minimized view
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-4 right-4 z-50"
        data-testid="call-minimized"
      >
        <div className="bg-[#202c33] rounded-2xl shadow-2xl p-4 flex items-center gap-3 border border-white/10">
          <Avatar className="w-12 h-12">
            <AvatarImage src={contact?.avatar} />
            <AvatarFallback className="bg-[#00a884] text-white">
              {contact?.name?.charAt(0)?.toUpperCase() || contact?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-medium">{contact?.name || contact?.display_name || 'Unknown'}</p>
            <p className="text-[#00a884] text-sm">
              {callState === CALL_STATES.CONNECTED ? formatDuration(duration) : callState}
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(false)}
              className="rounded-full hover:bg-white/10"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </Button>
            <Button
              size="icon"
              onClick={handleEndCall}
              className="rounded-full bg-red-500 hover:bg-red-600"
              data-testid="end-call-minimized"
            >
              <PhoneOff className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#111b21] flex flex-col"
        data-testid="call-manager"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            {callType === 'video' ? (
              <Video className="w-5 h-5 text-[#00a884]" />
            ) : (
              <Phone className="w-5 h-5 text-[#00a884]" />
            )}
            <span className="text-white font-medium">
              {callType === 'video' ? 'Video Call' : 'Voice Call'}
            </span>
            {/* Connection quality indicator */}
            {callState === CALL_STATES.CONNECTED && (
              <div className="flex items-center gap-2 ml-2">
                {connectionQuality === 'poor' && (
                  <span className="text-yellow-500 text-sm">Poor connection</span>
                )}
                {connectionQuality === 'fair' && (
                  <span className="text-orange-400 text-sm">Fair connection</span>
                )}
                {connectionStats?.isUsingTurn && (
                  <span className="text-blue-400 text-xs bg-blue-500/20 px-2 py-0.5 rounded-full">
                    Relay
                  </span>
                )}
                {connectionStats?.rtt && (
                  <span className="text-gray-400 text-xs">
                    {connectionStats.rtt}ms
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
              className="rounded-full hover:bg-white/10"
              data-testid="minimize-call"
            >
              <Minimize2 className="w-5 h-5 text-white" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleFullscreen}
              className="rounded-full hover:bg-white/10"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Remote Video (or avatar for voice call / waiting) */}
          {callType === 'video' && callState === CALL_STATES.CONNECTED ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              data-testid="remote-video"
            />
          ) : (
            <div className="text-center">
              <motion.div
                animate={callState === CALL_STATES.CALLING || callState === CALL_STATES.RINGING || callState === CALL_STATES.CONNECTING ? {
                  scale: [1, 1.1, 1],
                } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Avatar className="w-32 h-32 mx-auto mb-6 ring-4 ring-[#00a884]/30">
                  <AvatarImage src={contact?.avatar} />
                  <AvatarFallback className="bg-[#00a884] text-white text-4xl">
                    {contact?.name?.charAt(0)?.toUpperCase() || contact?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              
              <h2 className="text-2xl font-semibold text-white mb-2" data-testid="contact-name">
                {contact?.name || contact?.display_name || 'Unknown'}
              </h2>
              
              <p className="text-gray-400 flex items-center justify-center gap-2" data-testid="call-status">
                {callState === CALL_STATES.INITIATING && (
                  <>
                    <PhoneOutgoing className="w-4 h-4 animate-pulse" />
                    Starting call...
                  </>
                )}
                {callState === CALL_STATES.CALLING && (
                  <>
                    <PhoneOutgoing className="w-4 h-4" />
                    Calling...
                  </>
                )}
                {callState === CALL_STATES.RINGING && (
                  <>
                    <PhoneIncoming className="w-4 h-4" />
                    Incoming {callType} call...
                  </>
                )}
                {callState === CALL_STATES.CONNECTING && (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                )}
                {callState === CALL_STATES.CONNECTED && (
                  <>
                    <Clock className="w-4 h-4" />
                    {formatDuration(duration)}
                  </>
                )}
                {callState === CALL_STATES.RECONNECTING && (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Reconnecting...
                  </>
                )}
                {callState === CALL_STATES.ENDED && 'Call ended'}
                {callState === CALL_STATES.FAILED && (errorMessage || 'Call failed')}
              </p>
            </div>
          )}

          {/* Local Video Preview (Picture-in-Picture) */}
          {callType === 'video' && !isVideoOff && callState === CALL_STATES.CONNECTED && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-24 right-6 w-48 h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20"
              data-testid="local-video-container"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                data-testid="local-video"
              />
              {isScreenSharing && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  Sharing Screen
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 py-8">
          {callState === CALL_STATES.RINGING && isIncoming ? (
            /* Incoming call controls */
            <div className="flex items-center justify-center gap-8">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={declineCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg"
                data-testid="decline-call"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={answerCall}
                className="w-16 h-16 rounded-full bg-[#00a884] hover:bg-[#00a884]/90 flex items-center justify-center shadow-lg"
                data-testid="answer-call"
              >
                {callType === 'video' ? (
                  <Video className="w-7 h-7 text-white" />
                ) : (
                  <Phone className="w-7 h-7 text-white" />
                )}
              </motion.button>
            </div>
          ) : (
            /* Active/Outgoing call controls */
            <div className="flex items-center justify-center gap-4">
              {/* Mute */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                data-testid="toggle-mute"
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </motion.button>

              {/* Video Toggle (only for video calls) */}
              {callType === 'video' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isVideoOff ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  data-testid="toggle-video"
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </motion.button>
              )}

              {/* Speaker */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleSpeaker}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isSpeakerOff ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                data-testid="toggle-speaker"
              >
                {isSpeakerOff ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </motion.button>

              {/* End Call */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
                data-testid="end-call"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </motion.button>

              {/* Screen Share (video only, when connected) */}
              {callType === 'video' && callState === CALL_STATES.CONNECTED && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleScreenShare}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isScreenSharing ? 'bg-[#00a884] text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  data-testid="toggle-screen-share"
                >
                  {isScreenSharing ? <ScreenShareOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                </motion.button>
              )}

              {/* More Options */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
              >
                <MoreVertical className="w-6 h-6" />
              </motion.button>
            </div>
          )}
        </div>

        {/* End-to-end encrypted notice */}
        <div className="text-center pb-4">
          <p className="text-gray-500 text-xs flex items-center justify-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
            End-to-end encrypted
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to manage calls - can be used globally
export function useCallManager() {
  const [callState, setCallState] = useState({
    isOpen: false,
    callType: 'video',
    contact: null,
    isIncoming: false,
    incomingCallId: null
  });

  const startCall = useCallback((contact, type = 'video') => {
    setCallState({
      isOpen: true,
      callType: type,
      contact,
      isIncoming: false,
      incomingCallId: null
    });
  }, []);

  const receiveCall = useCallback((callData) => {
    setCallState({
      isOpen: true,
      callType: callData.call_type || 'video',
      contact: {
        id: callData.caller_id,
        name: callData.caller_name,
        display_name: callData.caller_name,
        avatar: callData.caller_avatar
      },
      isIncoming: true,
      incomingCallId: callData.call_id
    });
  }, []);

  const endCall = useCallback(() => {
    setCallState({
      isOpen: false,
      callType: 'video',
      contact: null,
      isIncoming: false,
      incomingCallId: null
    });
  }, []);

  return {
    ...callState,
    startCall,
    receiveCall,
    endCall
  };
}
