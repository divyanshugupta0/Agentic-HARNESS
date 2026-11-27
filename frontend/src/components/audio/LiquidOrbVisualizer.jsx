import React, { useRef, useEffect } from 'react';

/**
 * Lightweight real-time autocorrelation pitch detector (75 Hz - 450 Hz)
 */
function detectVoicePitch(buffer, sampleRate) {
  if (!buffer || buffer.length === 0) return { pitchHz: 0, rms: 0 };

  const size = Math.min(buffer.length, 512);
  let sumSq = 0;
  for (let i = 0; i < size; i++) {
    sumSq += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSq / size);
  if (!Number.isFinite(rms) || rms < 0.008) {
    return { pitchHz: 0, rms: Math.max(0, rms || 0) };
  }

  const step = 2;
  const downsampled = Math.floor(size / step);
  const minPeriod = Math.max(2, Math.floor(sampleRate / 450 / step));
  const maxPeriod = Math.min(downsampled - 1, Math.floor(sampleRate / 75 / step));

  let bestLag = -1;
  let maxCorr = -1;

  for (let lag = minPeriod; lag <= maxPeriod; lag++) {
    let corr = 0;
    for (let i = 0; i < downsampled - lag; i++) {
      corr += buffer[i * step] * buffer[(i + lag) * step];
    }
    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag > 0 && maxCorr > 0.01) {
    const pitchHz = Math.round(sampleRate / (bestLag * step));
    if (Number.isFinite(pitchHz) && pitchHz >= 75 && pitchHz <= 450) {
      return { pitchHz, rms };
    }
  }

  return { pitchHz: 0, rms };
}

/**
 * ChatGPT-style Fluid Voice Sphere Visualizer
 * Free-form luminous orb whose size, ripples, and internal color currents
 * dynamically respond to the user's voice pitch (Hz) and volume (RMS).
 */
export function LiquidOrbVisualizer({
  analyserNode,
  audioContext,
  duplexState = 'LISTENING', // LISTENING, SPEAKING, INTERRUPTED, IDLE
  isMuted = false,
  size = 300
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const stateRef = useRef({
    time: 0,
    smoothedVolume: 0.04,
    smoothedPitch: 150,
    smoothedActivity: 0.25,
    blobs: [
      { angle: 0.4, speed: 0.7, orbit: 0.34, radius: 0.62 },
      { angle: 2.5, speed: -0.55, orbit: 0.38, radius: 0.56 },
      { angle: 4.3, speed: 0.45, orbit: 0.3, radius: 0.52 },
      { angle: 5.6, speed: -0.65, orbit: 0.24, radius: 0.46 }
    ]
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const bufferLength = analyserNode ? Math.min(analyserNode.fftSize, 512) : 256;
    const timeDomainData = new Float32Array(bufferLength);
    const sampleRate = audioContext?.sampleRate || 44100;

    const getPalette = () => {
      if (isMuted && duplexState !== 'SPEAKING') {
        return {
          baseTop: '#1e293b',
          baseBottom: '#0f172a',
          glow: 'rgba(100, 116, 139, 0.2)',
          rim: 'rgba(148, 163, 184, 0.28)',
          blobs: [
            'rgba(148, 163, 184, 0.35)',
            'rgba(100, 116, 139, 0.35)',
            'rgba(71, 85, 105, 0.4)',
            'rgba(226, 232, 240, 0.2)'
          ]
        };
      }
      if (duplexState === 'SPEAKING') {
        return {
          baseTop: '#38bdf8',
          baseBottom: '#1d4ed8',
          glow: 'rgba(99, 102, 241, 0.45)',
          rim: 'rgba(224, 242, 254, 0.65)',
          blobs: [
            'rgba(255, 255, 255, 0.78)',
            'rgba(125, 211, 252, 0.75)',
            'rgba(167, 139, 250, 0.7)',
            'rgba(56, 189, 248, 0.65)'
          ]
        };
      }
      if (duplexState === 'INTERRUPTED') {
        return {
          baseTop: '#fb7185',
          baseBottom: '#be123c',
          glow: 'rgba(244, 63, 94, 0.45)',
          rim: 'rgba(255, 228, 230, 0.65)',
          blobs: [
            'rgba(255, 255, 255, 0.7)',
            'rgba(253, 164, 175, 0.7)',
            'rgba(251, 146, 60, 0.65)',
            'rgba(244, 63, 94, 0.6)'
          ]
        };
      }
      return {
        baseTop: '#7dd3fc',
        baseBottom: '#0284c7',
        glow: 'rgba(56, 189, 248, 0.38)',
        rim: 'rgba(224, 242, 254, 0.55)',
        blobs: [
          'rgba(255, 255, 255, 0.8)',
          'rgba(186, 230, 253, 0.72)',
          'rgba(59, 130, 246, 0.65)',
          'rgba(14, 165, 233, 0.6)'
        ]
      };
    };

    const render = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const s = stateRef.current;
      const isSpeaking = duplexState === 'SPEAKING';
      const targetActivity = isSpeaking ? 1.0 : isMuted ? 0.15 : 0.55;
      s.smoothedActivity += (targetActivity - s.smoothedActivity) * 0.08;

      let rawRms = 0.02;
      let rawPitch = 0;

      if (analyserNode && !isMuted) {
        try {
          analyserNode.getFloat32TimeDomainData(timeDomainData);
          const detected = detectVoicePitch(timeDomainData, sampleRate);
          rawRms = detected.rms;
          rawPitch = detected.pitchHz;
        } catch (_) {}
      }

      if (isSpeaking) {
        rawRms = 0.08 + Math.sin(s.time * 4.2) * 0.03 + Math.cos(s.time * 7.1) * 0.02;
        rawPitch = 210 + Math.sin(s.time * 2.5) * 65;
      }

      // Normalize RMS (typical laptop mic speech is 0.01 - 0.12) into 0.04 - 1.0
      const normalizedVol = Math.max(0.04, Math.min(1.0, rawRms * 8.5));
      s.smoothedVolume += (normalizedVol - s.smoothedVolume) * 0.18;

      if (rawPitch > 0 && Number.isFinite(rawPitch)) {
        s.smoothedPitch += (rawPitch - s.smoothedPitch) * 0.16;
      } else {
        // Gently relax pitch toward baseline when quiet
        s.smoothedPitch += (150 - s.smoothedPitch) * 0.04;
      }

      // Pitch-driven scale & speed (75 Hz -> ~0.88x, 150 Hz -> 1.0x, 350+ Hz -> ~1.25x)
      const pitchNorm = Math.max(0, Math.min(1, (s.smoothedPitch - 75) / 300));
      const pitchSizeBoost = (pitchNorm - 0.25) * (size * 0.085) * Math.min(1, s.smoothedVolume * 1.6);
      const volumeSizeBoost = s.smoothedVolume * (size * 0.11);

      s.time += 0.018 + s.smoothedVolume * 0.035 + pitchNorm * 0.015;

      const cx = size / 2;
      const cy = size / 2;
      const breath = Math.sin(s.time * 1.4) * 2.0;
      const baseRadius = Math.max(
        size * 0.24,
        Math.min(size * 0.44, size * 0.28 + volumeSizeBoost + pitchSizeBoost + breath)
      );
      const palette = getPalette();

      // 1. Soft atmospheric outer halo
      const haloRadius = baseRadius * 1.48;
      const haloGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, haloRadius);
      haloGrad.addColorStop(0, palette.glow);
      haloGrad.addColorStop(0.55, palette.glow.replace(/[\d.]+\)$/, '0.12)'));
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Free-form organic clipped sphere boundary driven by pitch + volume
      ctx.save();
      ctx.beginPath();
      const segments = 96;
      const rippleAmp = isMuted && !isSpeaking
        ? 0.006
        : 0.014 + s.smoothedVolume * 0.055 + pitchNorm * 0.025;
      const harmonicB = 4 + Math.round(pitchNorm * 4);
      const harmonicC = 6 + Math.round(pitchNorm * 5);

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const w1 = Math.sin(theta * 3 + s.time * (1.8 + pitchNorm)) * 0.5;
        const w2 = Math.cos(theta * harmonicB - s.time * (2.2 + pitchNorm * 1.2)) * 0.32;
        const w3 = Math.sin(theta * harmonicC + s.time * 1.4) * 0.18;
        const r = baseRadius * (1 + rippleAmp * (w1 + w2 + w3));
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.clip();

      const bgGrad = ctx.createLinearGradient(cx, cy - baseRadius, cx, cy + baseRadius);
      bgGrad.addColorStop(0, palette.baseTop);
      bgGrad.addColorStop(1, palette.baseBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(cx - baseRadius * 1.25, cy - baseRadius * 1.25, baseRadius * 2.5, baseRadius * 2.5);

      // 3. Swirling internal fluid clouds
      ctx.globalCompositeOperation = 'screen';
      s.blobs.forEach((blob, idx) => {
        blob.angle += blob.speed * (0.012 + s.smoothedVolume * 0.03 + pitchNorm * 0.02) * s.smoothedActivity;
        const orbitR = baseRadius * blob.orbit * (1 + Math.sin(s.time * 1.2 + idx) * 0.2);
        const bx = cx + Math.cos(blob.angle) * orbitR;
        const by = cy + Math.sin(blob.angle * 1.15) * orbitR;
        const br = baseRadius * blob.radius * (1 + s.smoothedVolume * 0.2);

        const blobGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        blobGrad.addColorStop(0, palette.blobs[idx]);
        blobGrad.addColorStop(0.55, palette.blobs[idx].replace(/[\d.]+\)$/, '0.25)'));
        blobGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = blobGrad;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      });

      // Soft specular pearl sheen
      ctx.globalCompositeOperation = 'source-over';
      const specX = cx - baseRadius * 0.28;
      const specY = cy - baseRadius * 0.3;
      const specR = baseRadius * 0.55;
      const specGrad = ctx.createRadialGradient(specX, specY, 1, specX, specY, specR);
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      specGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.1)');
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = specGrad;
      ctx.fillRect(cx - baseRadius, cy - baseRadius, baseRadius * 2, baseRadius * 2);

      ctx.restore();

      // 4. Subtle glass rim highlight
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const w1 = Math.sin(theta * 3 + s.time * (1.8 + pitchNorm)) * 0.5;
        const w2 = Math.cos(theta * harmonicB - s.time * (2.2 + pitchNorm * 1.2)) * 0.32;
        const w3 = Math.sin(theta * harmonicC + s.time * 1.4) * 0.18;
        const r = baseRadius * (1 + rippleAmp * (w1 + w2 + w3));
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = palette.rim;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [analyserNode, audioContext, duplexState, isMuted, size]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        userSelect: 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'block'
        }}
      />
    </div>
  );
}
