"use client";
import React, { useEffect, useRef } from "react";

interface VisualizerProps {
  inputLevel: number; // 0-255
  outputLevel: number; // 0-255
  isActive: boolean;
  isMicOn: boolean;
}

const OrbitVisualizer: React.FC<VisualizerProps> = ({
  inputLevel,
  outputLevel,
  isActive,
  isMicOn,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const levelsRef = useRef({ input: 0, output: 0 });
  const particlesRef = useRef<any[]>([]);

  // Update levels ref whenever props change
  useEffect(() => {
    levelsRef.current = { input: inputLevel, output: outputLevel };
  }, [inputLevel, outputLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Business logic for levels from stable ref
      const { input, output } = levelsRef.current;
      const isOutput = output > input + 5;
      const level = Math.max(input, output);
      const normalizedLevel = isActive ? Math.min(level / 128, 2) : 0;

      // Update rotation in ref to persist it
      rotationRef.current += 0.002 + normalizedLevel * 0.05;
      const rotation = rotationRef.current;

      // Colors: Slate for idle, Blue/Purple for active
      const hue = isActive ? (isOutput ? 280 : 210) : 210;
      const saturation = isActive ? 100 : 30;
      const lightness = isActive ? 60 : 40;
      const opacity = isActive ? 0.8 : 0.3;

      const baseColor = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
      const glowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, ${isActive ? 0.2 : 0.1})`;

      // 1. Draw outer glow aura
      const auraRadius = 40 + normalizedLevel * 50;
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        auraRadius * 1.5,
      );
      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, auraRadius * 1.5, 0, 2 * Math.PI);
      ctx.fill();

      // 2. Draw orbiting rings
      for (let i = 0; i < 3; i++) {
        const radiusX = 35 + i * 15 + normalizedLevel * 20;
        const radiusY = radiusX * 0.6;
        const ringRotation =
          rotation * 0.5 * (i % 2 === 0 ? 1 : -1) * (1 + i * 0.1);

        // Dot movement along the ring
        const dotAngle = rotation * (i % 2 === 0 ? 1 : -1) * (2 + i * 0.5);

        ctx.beginPath();
        ctx.ellipse(
          centerX,
          centerY,
          radiusX,
          radiusY,
          ringRotation,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = `hsla(${hue}, ${saturation}%, 70%, ${isActive ? 0.6 - i * 0.15 : 0.2})`;
        ctx.lineWidth = 1.5 + normalizedLevel * 1.5;
        ctx.stroke();

        // Correct math for point on rotated ellipse:
        const cosT = Math.cos(dotAngle);
        const sinT = Math.sin(dotAngle);
        const cosR = Math.cos(ringRotation);
        const sinR = Math.sin(ringRotation);

        const dotX = centerX + radiusX * cosT * cosR - radiusY * sinT * sinR;
        const dotY = centerY + radiusX * cosT * sinR + radiusY * sinT * cosR;

        ctx.beginPath();
        ctx.arc(dotX, dotY, 3 + normalizedLevel * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, 80%, ${isActive ? 0.9 : 0.4})`;
        ctx.fill();

        if (isActive) {
          ctx.shadowBlur = 10 + normalizedLevel * 10;
          ctx.shadowColor = `hsla(${hue}, 100%, 80%, 0.8)`;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // 3. Central Core
      // No pulse if !isActive or !isMicOn. Minimal pulse (2px) if active but silent.
      const pulseMod = isActive && isMicOn ? Math.sin(Date.now() / 500) * 2 : 0;
      const corePulse = 25 + normalizedLevel * 15 + pulseMod;

      ctx.beginPath();
      ctx.arc(centerX, centerY, corePulse, 0, 2 * Math.PI);

      const coreGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        corePulse,
      );

      if (isActive) {
        coreGradient.addColorStop(0, "white");
        coreGradient.addColorStop(0.3, `hsla(${hue}, 100%, 70%, 1)`);
        coreGradient.addColorStop(1, `hsla(${hue}, 100%, 40%, 0.8)`);
      } else {
        coreGradient.addColorStop(0, "rgba(100, 116, 139, 0.5)");
        coreGradient.addColorStop(1, "rgba(71, 85, 105, 0.3)");
      }

      ctx.fillStyle = coreGradient;
      ctx.fill();

      // --- 4. Particle System (Sparks) ---
      // Emit new particles if there's significant sound
      if (isActive && normalizedLevel > 1.2 && Math.random() < 0.4) {
        particlesRef.current.push({
          angle: Math.random() * Math.PI * 2,
          radius: corePulse,
          speed: 1 + Math.random() * 2,
          life: 1.0,
          spin: (Math.random() - 0.5) * 0.05,
        });
      }

      // Update and draw existing particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.radius += p.speed;
        p.angle += 0.02 + p.spin; // Inertia: slight rotation as it flies
        p.life -= 0.02; // Fading speed

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        const px = centerX + Math.cos(p.angle) * p.radius;
        const py = centerY + Math.sin(p.angle) * p.radius;

        const pSize = 1.5 * p.life;
        const pOpacity = p.life * (isActive ? 0.8 : 0.3);

        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${pOpacity})`;
        ctx.fill();

        // Tiny glow for each spark
        if (p.life > 0.5) {
          ctx.shadowBlur = 5 * p.life;
          ctx.shadowColor = `hsla(${hue}, 100%, 80%, 0.5)`;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
    />
  );
};

export default OrbitVisualizer;
