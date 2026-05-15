"use client";

import { useEffect, useRef } from "react";

export type VoiceParticleMode = "ready" | "listening" | "speaking" | "connecting" | "working" | "error";

interface VoiceParticleOrbProps {
  mode: VoiceParticleMode;
}

interface Particle {
  theta: number;
  phi: number;
  drift: number;
  depth: number;
  size: number;
  twinkle: number;
}

const PARTICLE_COUNT = 860;

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    theta: Math.acos(2 * Math.random() - 1),
    phi: Math.random() * Math.PI * 2,
    drift: Math.random() * Math.PI * 2,
    depth: 0.72 + Math.random() * 0.38,
    size: 0.62 + Math.random() * 1.12,
    twinkle: 0.45 + Math.random() * 0.55,
  }));
}

function modeSettings(mode: VoiceParticleMode) {
  switch (mode) {
    case "speaking":
      return { scale: 1.13, scatter: 0.34, speed: 0.62, alpha: 0.86, pulse: 0.08 };
    case "listening":
      return { scale: 1.01, scatter: 0.08, speed: 0.34, alpha: 0.78, pulse: 0.045 };
    case "connecting":
    case "working":
      return { scale: 1.04, scatter: 0.16, speed: 0.48, alpha: 0.72, pulse: 0.06 };
    case "error":
      return { scale: 0.98, scatter: 0.14, speed: 0.24, alpha: 0.62, pulse: 0.035 };
    default:
      return { scale: 0.96, scatter: 0.04, speed: 0.22, alpha: 0.62, pulse: 0.025 };
  }
}

export default function VoiceParticleOrb({ mode }: VoiceParticleOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    const particles = createParticles();
    const mouse = { x: 0, y: 0, active: false };
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.active = true;
    };

    const handlePointerLeave = () => {
      mouse.active = false;
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    const render = (timestamp: number) => {
      const time = timestamp / 1000;
      const currentMode = modeRef.current;
      const settings = modeSettings(currentMode);
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.36;
      const pulse = reducedMotion ? 0 : Math.sin(time * (currentMode === "speaking" ? 4.2 : 2.1)) * settings.pulse;
      const radius = baseRadius * (settings.scale + pulse);
      const turnY = reducedMotion ? 0.35 : time * settings.speed;
      const turnX = reducedMotion ? 0.18 : Math.sin(time * 0.32) * 0.28;
      const cosY = Math.cos(turnY);
      const sinY = Math.sin(turnY);
      const cosX = Math.cos(turnX);
      const sinX = Math.sin(turnX);

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const halo = ctx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius * 1.25);
      halo.addColorStop(0, "rgba(255,255,255,0.035)");
      halo.addColorStop(0.52, "rgba(255,255,255,0.018)");
      halo.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.32, 0, Math.PI * 2);
      ctx.fill();

      for (const particle of particles) {
        const wave = reducedMotion ? 0 : Math.sin(time * (1.15 + particle.twinkle) + particle.drift);
        const ringNoise = settings.scatter * (0.45 + 0.55 * wave);
        const theta = particle.theta + (reducedMotion ? 0 : Math.sin(time * 0.19 + particle.drift) * 0.035);
        const phi = particle.phi + (reducedMotion ? 0 : time * (0.045 + particle.depth * 0.012));
        const sphereX = Math.sin(theta) * Math.cos(phi);
        const sphereY = Math.cos(theta);
        const sphereZ = Math.sin(theta) * Math.sin(phi);

        const rotatedX = sphereX * cosY + sphereZ * sinY;
        const rotatedZ = sphereZ * cosY - sphereX * sinY;
        const rotatedY = sphereY * cosX - rotatedZ * sinX;
        const finalZ = rotatedZ * cosX + sphereY * sinX;
        const scatterPush = 1 + ringNoise * particle.depth;
        const projection = 1 + finalZ * 0.14;
        let x = centerX + rotatedX * radius * scatterPush * projection;
        let y = centerY + rotatedY * radius * scatterPush * projection;

        if (!reducedMotion && mouse.active) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const distance = Math.hypot(dx, dy);
          const influence = radius * 0.42;
          if (distance > 0 && distance < influence) {
            const strength = ((influence - distance) / influence) ** 2 * (currentMode === "speaking" ? 34 : 22);
            x += (dx / distance) * strength;
            y += (dy / distance) * strength;
          }
        }

        const depthAlpha = 0.38 + ((finalZ + 1) / 2) * 0.62;
        const sparkle = reducedMotion ? 1 : 0.78 + Math.sin(time * 2.5 + particle.drift) * 0.22;
        const alpha = Math.max(0.08, settings.alpha * particle.twinkle * depthAlpha * sparkle);
        const size = particle.size * (0.82 + depthAlpha * 0.62) * (currentMode === "speaking" ? 1.08 : 1);
        ctx.fillStyle = `rgba(248,252,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      if (!reducedMotion) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="voice-particle-orb" aria-hidden />;
}
