import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Hand,
  Settings,
  X,
  Check,
  Loader
} from 'lucide-react';
import { api } from '../../services/api';
import { useChat } from '../../hooks/useChat';
import { providerService } from '../../services/providerService';
import { LiquidOrbVisualizer } from './LiquidOrbVisualizer';

const API_BASE_URL = (import.meta?.env?.VITE_AUTH_API_URL || 'http://localhost:3002').replace(/\/$/, '');

const VOICE_OPTIONS = [
  { id: 'en-US-AriaNeural', name: 'Aria', desc: 'Warm & expressive' },
  { id: 'en-US-GuyNeural', name: 'Guy', desc: 'Natural conversational' },
  { id: 'en-US-JennyNeural', name: 'Jenny', desc: 'Clear & friendly' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher', desc: 'Deep & composed' }
];

/**
 * ChatGPT-style Full-Screen Voice-Only Live AI Mode
 * Uses local Web Audio VAD + MediaRecorder (no Chromium SpeechRecognition network spam)
 * and routes captured voice directly to the currently selected model.
 */
export function LiveAudioOverlay({ isOpen, onClose }) {
  const { selectedModel } = useChat();
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [duplexState, setDuplexState] = useState('IDLE'); // IDLE, LISTENING, THINKING, SPEAKING, INTERRUPTED
  const [voicePersona, setVoicePersona] = useState('en-US-AriaNeural');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [hardwareInfo, setHardwareInfo] = useState({
    hasNvidiaGpu: false,
    isCpuOnly: true,
    engineName: 'Kyutai Pocket TTS'
  });
  const [caption, setCaption] = useState('');
  const [activeTarget, setActiveTarget] = useState(() => providerService.getActiveTarget(selectedModel));
  const [audioInstances, setAudioInstances] = useState({ analyser: null, context: null });

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const activeAudioElRef = useRef(null);
  const vadRafRef = useRef(null);
  const historyRef = useRef([]);
  const timerRef = useRef(null);
  const duplexStateRef = useRef('IDLE');
  const isMutedRef = useRef(false);
  const selectedModelRef = useRef(selectedModel);

  useEffect(() => {
    duplexStateRef.current = duplexState;
  }, [duplexState]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
    setActiveTarget(providerService.getActiveTarget(selectedModel));
    return providerService.subscribe(() => {
      setActiveTarget(providerService.getActiveTarget(selectedModel));
    });
  }, [selectedModel]);

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      stopSession();
    }
    return () => {
      stopSession();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setSessionDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || '');
        const comma = res.indexOf(',');
        resolve(comma >= 0 ? res.slice(comma + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const startVadLoop = (stream, analyser) => {
    const buffer = new Float32Array(analyser.fftSize);
    let isRecording = false;
    let speechStartAt = 0;
    let lastVoiceAt = 0;
    let chunks = [];

    const beginRecording = () => {
      if (isRecording || !window.MediaRecorder) return;
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        const recorder = new MediaRecorder(stream, { mimeType });
        chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = async () => {
          setIsUserSpeaking(false);
          const duration = performance.now() - speechStartAt;
          if (duration < 350 || chunks.length === 0) return;
          const blob = new Blob(chunks, { type: mimeType });
          try {
            const b64 = await blobToBase64(blob);
            await sendVoiceToSelectedModel({ mimeType: 'audio/webm', data: b64 });
          } catch (_) {}
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
        isRecording = true;
        setIsUserSpeaking(true);
        speechStartAt = performance.now();
        lastVoiceAt = speechStartAt;
      } catch (_) {}
    };

    const finishRecording = () => {
      if (!isRecording) return;
      isRecording = false;
      setIsUserSpeaking(false);
      const rec = mediaRecorderRef.current;
      mediaRecorderRef.current = null;
      if (rec && rec.state !== 'inactive') {
        try {
          rec.stop();
        } catch (_) {}
      }
    };

    const tick = () => {
      if (!mediaStreamRef.current) return;

      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }

      if (isMutedRef.current || duplexStateRef.current === 'THINKING') {
        if (isRecording) finishRecording();
        vadRafRef.current = requestAnimationFrame(tick);
        return;
      }

      analyser.getFloat32TimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
      const rms = Math.sqrt(sum / buffer.length);
      const now = performance.now();

      if (rms > 0.012) {
        if (duplexStateRef.current === 'SPEAKING') {
          handleBargeIn();
        }
        if (!isRecording && duplexStateRef.current === 'LISTENING') {
          beginRecording();
        }
        lastVoiceAt = now;
      } else if (isRecording && now - lastVoiceAt > 1100) {
        finishRecording();
      }

      vadRafRef.current = requestAnimationFrame(tick);
    };

    vadRafRef.current = requestAnimationFrame(tick);
  };

  const initWebAudio = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCaption('Microphone API is unavailable in this environment.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      if (!stream.getAudioTracks().length) {
        setCaption('No microphone input device detected.');
        return;
      }
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaStreamSource(stream);
      // Connect through a zero-gain node so Chromium continuously pulls mic frames into AnalyserNode without echo
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      source.connect(analyser);
      analyser.connect(silentGain);
      silentGain.connect(ctx.destination);

      sourceNodeRef.current = source;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      setAudioInstances({ analyser, context: ctx });
      startVadLoop(stream, analyser);
    } catch (err) {
      console.warn('Microphone access unavailable:', err);
      setCaption(`Microphone unavailable: ${err.message || 'Permission denied'}`);
    }
  };

  const startSession = async () => {
    setCaption('');
    historyRef.current = [];
    try {
      const res = await api.send('liveAudio:start', {
        mode: 'live-audio-full-duplex',
        enableBargeIn: true,
        enableBackchanneling: true,
        persona: voicePersona
      });
      if (res?.hardware) {
        setHardwareInfo(res.hardware);
      }
    } catch (_) {}

    setIsActive(true);
    setDuplexState('LISTENING');
    initWebAudio();
  };

  const stopSession = async () => {
    if (vadRafRef.current) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch (_) {}
      mediaRecorderRef.current = null;
    }

    try {
      window.speechSynthesis?.cancel();
      await api.send('liveAudio:stop');
    } catch (_) {}

    if (activeAudioElRef.current) {
      try {
        activeAudioElRef.current.pause();
        activeAudioElRef.current.currentTime = 0;
      } catch (_) {}
      activeAudioElRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (_) {}
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setAudioInstances({ analyser: null, context: null });
    setIsActive(false);
    setDuplexState('IDLE');
    setShowConfig(false);
  };

  const speakWithBrowserFallback = (text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setDuplexState('LISTENING');
        utterance.onerror = () => setDuplexState('LISTENING');
        window.speechSynthesis.speak(utterance);
        return;
      } catch (_) {}
    }
    setTimeout(() => setDuplexState('LISTENING'), 3000);
  };

  const playNeuralSpeechBuffer = async (b64, fallbackText) => {
    try {
      if (activeAudioElRef.current) {
        try {
          activeAudioElRef.current.pause();
          activeAudioElRef.current.currentTime = 0;
        } catch (_) {}
        activeAudioElRef.current = null;
      }

      const audio = new Audio(`data:audio/mp3;base64,${b64}`);
      audio.volume = 1.0;
      activeAudioElRef.current = audio;

      audio.onended = () => {
        activeAudioElRef.current = null;
        setDuplexState('LISTENING');
      };

      audio.onerror = () => {
        activeAudioElRef.current = null;
        speakWithBrowserFallback(fallbackText);
      };

      await audio.play();
    } catch (_) {
      speakWithBrowserFallback(fallbackText);
    }
  };

  const handleBargeIn = async () => {
    try {
      window.speechSynthesis?.cancel();
      if (activeAudioElRef.current) {
        try {
          activeAudioElRef.current.pause();
          activeAudioElRef.current.currentTime = 0;
        } catch (_) {}
        activeAudioElRef.current = null;
      }

      await api.send('liveAudio:interrupt').catch(() => {});
      setDuplexState('INTERRUPTED');
      setCaption('Interrupted');
      setTimeout(() => {
        setDuplexState('LISTENING');
        setCaption('');
      }, 700);
    } catch (err) {
      console.error('Barge in failed:', err);
    }
  };

  const sendVoiceToSelectedModel = async (audioPayload) => {
    const target = providerService.getActiveTarget(selectedModelRef.current);
    if (!target || !target.provider || !target.model) {
      setCaption('No model configured. Add a provider in Settings first.');
      setDuplexState('LISTENING');
      return;
    }

    setDuplexState('THINKING');
    setCaption('');

    const nextMessages = [
      ...historyRef.current,
      { role: 'user', content: 'Respond naturally to the user audio.' }
    ];

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: {
            type: target.provider.type,
            baseURL: target.provider.baseURL,
            apiKey: target.apiKey
          },
          model: target.model.id,
          messages: [
            {
              role: 'system',
              content: 'You are in live voice conversation mode. Keep replies natural, helpful, and concise.'
            },
            ...nextMessages
          ],
          audio: audioPayload
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      const reply = (result.content || '').trim() || 'I did not catch that.';
      historyRef.current = [...nextMessages, { role: 'assistant', content: reply }].slice(-12);

      setDuplexState('SPEAKING');
      setCaption(reply);

      const ttsRes = await api.send('liveAudio:speak', {
        text: reply,
        options: { voice: voicePersona }
      }).catch(() => null);

      if (ttsRes?.audioBase64) {
        await playNeuralSpeechBuffer(ttsRes.audioBase64, reply);
      } else {
        speakWithBrowserFallback(reply);
      }
    } catch (err) {
      setCaption(`Error (${target.model.name}): ${err.message}`);
      setDuplexState('LISTENING');
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (_) {}
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    setIsMuted(nextMuted);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusLabel = () => {
    if (duplexState === 'THINKING') return 'Thinking...';
    if (duplexState === 'SPEAKING') return 'Speaking';
    if (duplexState === 'INTERRUPTED') return 'Interrupted';
    if (isMuted) return 'Microphone muted';
    if (isUserSpeaking) return 'Hearing you...';
    return 'Listening';
  };

  const selectedVoice = VOICE_OPTIONS.find((v) => v.id === voicePersona) || VOICE_OPTIONS[0];
  const modelLabel = activeTarget?.model?.name || 'No Model Selected';

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'radial-gradient(circle at 50% 42%, #0f172a 0%, #07090f 65%, #040508 100%)',
        color: '#f8fafc',
        fontFamily: 'inherit',
        userSelect: 'none'
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 28px',
          position: 'relative',
          zIndex: 2
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '7px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            fontSize: '13px',
            color: 'rgba(248, 250, 252, 0.85)'
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: !activeTarget?.model
                ? '#f59e0b'
                : isMuted
                ? '#64748b'
                : duplexState === 'SPEAKING'
                ? '#818cf8'
                : '#38bdf8',
              boxShadow: isMuted
                ? 'none'
                : `0 0 8px ${duplexState === 'SPEAKING' ? '#818cf8' : '#38bdf8'}`
            }}
          />
          <span style={{ fontWeight: 500 }}>{modelLabel}</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>•</span>
          <span style={{ color: 'rgba(248, 250, 252, 0.6)' }}>{selectedVoice.name}</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>•</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'rgba(248, 250, 252, 0.55)' }}>
            {formatTime(sessionDuration)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowConfig((prev) => !prev)}
            title="Voice settings"
            aria-label="Voice settings"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: showConfig ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.05)',
              color: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Settings size={18} />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close voice mode"
            aria-label="Close voice mode"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>

          {showConfig && (
            <div
              style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                width: '270px',
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: 'rgba(15, 23, 42, 0.94)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                zIndex: 10
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(248, 250, 252, 0.7)',
                  marginBottom: '10px'
                }}
              >
                Voice
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {VOICE_OPTIONS.map((voice) => {
                  const selected = voice.id === voicePersona;
                  return (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => {
                        setVoicePersona(voice.id);
                        setShowConfig(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 11px',
                        borderRadius: '10px',
                        border: selected
                          ? '1px solid rgba(56, 189, 248, 0.45)'
                          : '1px solid transparent',
                        backgroundColor: selected
                          ? 'rgba(56, 189, 248, 0.12)'
                          : 'rgba(255, 255, 255, 0.03)',
                        color: '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{voice.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(248, 250, 252, 0.5)' }}>
                          {voice.desc}
                        </div>
                      </div>
                      {selected && <Check size={15} color="#38bdf8" />}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'rgba(248, 250, 252, 0.55)'
                }}
              >
                <span>TTS Engine</span>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>
                  {hardwareInfo.isCpuOnly ? 'Kyutai Pocket TTS' : 'PersonaPlex'}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Center Orb & Voice Status */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          gap: '24px'
        }}
      >
        <div
          onClick={duplexState === 'SPEAKING' ? handleBargeIn : undefined}
          title={duplexState === 'SPEAKING' ? 'Tap to interrupt' : undefined}
          style={{ cursor: duplexState === 'SPEAKING' ? 'pointer' : 'default' }}
        >
          <LiquidOrbVisualizer
            analyserNode={audioInstances.analyser}
            audioContext={audioInstances.context}
            duplexState={duplexState === 'THINKING' ? 'SPEAKING' : duplexState}
            isMuted={isMuted}
            size={300}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            minHeight: '60px',
            maxWidth: '560px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color:
                duplexState === 'INTERRUPTED'
                  ? '#fda4af'
                  : isMuted
                  ? 'rgba(248, 250, 252, 0.5)'
                  : 'rgba(248, 250, 252, 0.9)'
            }}
          >
            {duplexState === 'THINKING' && <Loader size={15} className="spin" />}
            <span>{getStatusLabel()}</span>
          </div>

          {caption ? (
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: 1.55,
                maxHeight: '110px',
                overflowY: 'auto',
                color: 'rgba(248, 250, 252, 0.62)'
              }}
            >
              {caption}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(248, 250, 252, 0.35)' }}>
              {activeTarget?.model
                ? 'Speak naturally anytime'
                : 'Select or configure a model in Settings to use Voice Mode'}
            </p>
          )}
        </div>
      </main>

      {/* Bottom Voice-Only Circular Dock */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '22px',
          padding: '24px 28px 38px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              border: isMuted
                ? '1px solid rgba(244, 63, 94, 0.45)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: isMuted ? 'rgba(244, 63, 94, 0.18)' : 'rgba(255, 255, 255, 0.08)',
              color: isMuted ? '#fda4af' : '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)'
            }}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <span style={{ fontSize: '12px', color: 'rgba(248, 250, 252, 0.5)' }}>
            {isMuted ? 'Unmute' : 'Mute'}
          </span>
        </div>

        {duplexState === 'SPEAKING' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleBargeIn}
              title="Interrupt AI"
              aria-label="Interrupt AI"
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                border: '1px solid rgba(251, 146, 60, 0.45)',
                backgroundColor: 'rgba(251, 146, 60, 0.18)',
                color: '#fdba74',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)'
              }}
            >
              <Hand size={22} />
            </button>
            <span style={{ fontSize: '12px', color: 'rgba(248, 250, 252, 0.5)' }}>Interrupt</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            title="End voice mode"
            aria-label="End voice mode"
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)'
            }}
          >
            <X size={24} />
          </button>
          <span style={{ fontSize: '12px', color: 'rgba(248, 250, 252, 0.5)' }}>End</span>
        </div>
      </footer>
    </div>
  );
}
