import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { Play, Pause, Mic, Square } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const VoicePlayer = ({ url }: { url: string }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-2 w-fit">
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className="text-purple-400 hover:text-purple-300 transition-colors">
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          animate={playing ? { x: ["-100%", "100%"] } : { x: "-100%" }}
          transition={playing ? { duration: 1.5, repeat: Infinity, ease: "linear" } : {}}
          className="w-full h-full bg-purple-500"
        />
      </div>
    </div>
  );
};

export const VoiceRecorder = ({ onRecordingComplete, label }: { onRecordingComplete: (blob: Blob) => void, label?: string }) => {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  const getSupportedMimeType = () => {
    const types = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav"];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  };

  const startRecording = async () => {
    setError(null);
    
    if (!window.isSecureContext) {
      setError("Microphone requires a secure (HTTPS) connection.");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      } catch (e) {
        // Fallback to basic audio if constraints fail
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      
      const errMsg = err.message?.toLowerCase() || "";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || errMsg.includes('permission denied')) {
        setError("Microphone blocked. Please enable it in browser AND system settings.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("No microphone found. Please connect a mic.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError("Microphone is busy. Close other apps using it.");
      } else {
        setError(`Mic Error: ${err.message || "Could not access"}`);
      }
      
      setTimeout(() => setError(null), 8000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="flex items-center gap-3 relative">
      {recording ? (
        <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/40 rounded-full px-4 py-2.5 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2.5 h-2.5 bg-red-500 rounded-full" 
          />
          <span className="text-xs font-mono font-bold text-red-400">{Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</span>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); stopRecording(); }} 
            className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
          >
            <Square size={14} fill="currentColor" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-1">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); startRecording(); }} 
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-purple-400 transition-all border border-white/5",
              label && "pr-4"
            )}
          >
            <Mic size={20} />
            {label && <span className="text-xs font-bold uppercase tracking-widest">{label}</span>}
          </button>
          {error && (
            <motion.span 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[8px] text-red-500 font-bold absolute -bottom-4 left-0 whitespace-nowrap uppercase tracking-widest"
            >
              {error}
            </motion.span>
          )}
        </div>
      )}
    </div>
  );
};
