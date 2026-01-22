import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { X, Mic, MicOff, Volume2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from '../utils/audioUtils';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose, apiKey }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0); 
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null); 
  
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    
    const startSession = async () => {
      setStatus('connecting');
      setErrorMessage('');
      
      try {
        // Browser support check
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Your browser does not support audio input.");
        }

        const ai = new GoogleGenAI({ apiKey });
        
        // Audio Context Setup
        const inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        
        inputAudioContextRef.current = inputCtx;
        outputAudioContextRef.current = outputCtx;
        
        // Request Microphone Access
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err: any) {
          console.error("Microphone access error:", err);
          if (mounted) {
            setStatus('error');
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              setErrorMessage("Microphone access denied. Please allow permissions.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
              setErrorMessage("No microphone found. Please check your device.");
            } else {
              setErrorMessage("Could not access microphone: " + (err.message || "Unknown error"));
            }
          }
          return;
        }
        
        streamRef.current = stream;
        
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;
        
        source.connect(processor);
        processor.connect(inputCtx.destination);
        
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: "You are Edu_X, a helpful and friendly AI tutor. Keep responses concise and conversational.",
          },
          callbacks: {
            onopen: () => {
              if (mounted) setStatus('connected');
            },
            onmessage: async (message: LiveServerMessage) => {
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              
              if (base64Audio && outputCtx) {
                 setVolumeLevel(Math.random() * 0.5 + 0.5); 
                 
                 const audioBuffer = await decodeAudioData(
                   base64ToUint8Array(base64Audio),
                   outputCtx,
                   24000,
                   1
                 );
                 
                 const source = outputCtx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(outputCtx.destination);
                 
                 source.onended = () => {
                    sourcesRef.current.delete(source);
                    setVolumeLevel(0);
                 };
                 
                 const now = outputCtx.currentTime;
                 const startTime = Math.max(nextStartTimeRef.current, now);
                 source.start(startTime);
                 nextStartTimeRef.current = startTime + audioBuffer.duration;
                 sourcesRef.current.add(source);
              }
              
              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setVolumeLevel(0);
              }
            },
            onclose: () => {
              if (mounted) setStatus('disconnected');
            },
            onerror: (err) => {
              console.error("Live session error:", err);
              if (mounted) {
                setStatus('error');
                setErrorMessage("Connection to Gemini Live failed.");
              }
            }
          }
        });
        
        sessionRef.current = sessionPromise;

        processor.onaudioprocess = (e) => {
          if (isMicMuted) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          
          let sum = 0;
          for(let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
          const avg = sum / inputData.length;
          if (avg > 0.01) setVolumeLevel(Math.min(avg * 5, 1));
          else setVolumeLevel(prev => Math.max(0, prev - 0.1));

          const pcmBlob = createPcmBlob(inputData);
          
          sessionPromise.then(session => {
             session.sendRealtimeInput({ media: pcmBlob });
          });
        };
        
      } catch (err: any) {
        console.error("Failed to start live session:", err);
        if (mounted) {
          setStatus('error');
          setErrorMessage(err.message || "Failed to initialize session.");
        }
      }
    };

    startSession();

    return () => {
      mounted = false;
      cleanupSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); 

  const cleanupSession = () => {
     if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
     }
     if (inputAudioContextRef.current) inputAudioContextRef.current.close();
     if (outputAudioContextRef.current) outputAudioContextRef.current.close();
     
     sessionRef.current?.then((s: any) => {
       if (s.close) s.close();
     });
  };
  
  const handleClose = () => {
    cleanupSession();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="w-full max-w-md flex flex-col items-center relative">
        
        <div className="mb-12 text-center">
           <div className="flex items-center justify-center gap-2 mb-2">
             <Sparkles className="text-blue-400" size={24} />
             <h3 className="text-2xl font-light text-white">Gemini Live</h3>
           </div>
           
           {/* Status Display */}
           <div className="text-slate-400 text-sm font-medium flex items-center justify-center gap-2 min-h-[24px]">
             {status === 'connecting' && (
               <span className="animate-pulse">Connecting...</span>
             )}
             {status === 'connected' && (
               <span className="text-emerald-400">Listening</span>
             )}
             {status === 'error' && (
               <div className="flex items-center gap-2 text-red-400">
                 <AlertCircle size={16} />
                 <span>{errorMessage || "Connection Error"}</span>
               </div>
             )}
           </div>
        </div>

        {/* Visualizer - Ethereal Glow */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-16">
           {status === 'connecting' ? (
             <div className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
           ) : status === 'error' ? (
             <div className="relative z-10 w-32 h-32 bg-red-500/10 rounded-full border border-red-500/30 flex items-center justify-center">
                <MicOff size={40} className="text-red-400" />
             </div>
           ) : (
             <>
                {/* Outer Glows */}
                <div 
                  className="absolute w-48 h-48 bg-blue-500/30 rounded-full blur-3xl transition-transform duration-100 ease-out"
                  style={{ transform: `scale(${1 + volumeLevel * 0.8})` }}
                />
                <div 
                  className="absolute w-40 h-40 bg-purple-500/30 rounded-full blur-2xl transition-transform duration-150 ease-out mix-blend-screen"
                  style={{ transform: `scale(${1 + volumeLevel * 1.2}) translate(10px, -10px)` }}
                />
                
                {/* Core Orb */}
                <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full shadow-[0_0_60px_rgba(59,130,246,0.5)] flex items-center justify-center overflow-hidden">
                   <div className="absolute inset-0 bg-white/20 blur-lg rounded-full transform -translate-x-8 -translate-y-8"></div>
                   {isMicMuted ? (
                      <MicOff size={40} className="text-white/50 relative z-20" />
                   ) : (
                      <Volume2 size={40} className="text-white/90 relative z-20" />
                   )}
                </div>
                
                {/* Ripple Rings */}
                <div 
                   className="absolute inset-0 border border-white/10 rounded-full scale-110 opacity-0 animate-ping"
                   style={{ animationDuration: '3s' }}
                />
             </>
           )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8">
           {status !== 'error' && (
             <button 
               onClick={() => setIsMicMuted(!isMicMuted)}
               disabled={status !== 'connected'}
               className={`p-5 rounded-full transition-all duration-300 ${
                 isMicMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
               } ${status !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
               {isMicMuted ? <MicOff size={28} /> : <Mic size={28} />}
             </button>
           )}
           
           <button 
             onClick={handleClose}
             className="p-5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/30 transform hover:scale-105"
           >
             <X size={28} />
           </button>
        </div>
      </div>
    </div>
  );
};