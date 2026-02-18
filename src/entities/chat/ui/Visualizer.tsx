"use client";
import React, { useEffect, useRef } from "react";

interface VisualizerProps {
  inputLevel: number; // 0-255
  outputLevel: number; // 0-255
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({
  inputLevel,
  outputLevel,
  isActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      if (!isActive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw idle state
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, 2 * Math.PI);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Determine dominant source for visualization
      const isOutput = outputLevel > inputLevel + 10;
      const level = Math.max(inputLevel, outputLevel);
      const normalizedLevel = Math.min(level / 100, 2.5); // Cap scale

      // Base circle radius
      const baseRadius = 60;
      const dynamicRadius = baseRadius + normalizedLevel * 40;

      // Color based on who is talking
      // Purple/Pink for AI (Output), Blue/Cyan for User (Input)
      const color = isOutput
        ? "rgba(168, 85, 247, 0.8)"
        : "rgba(43, 127, 255, 0.8)";
      // : "rgba(56, 189, 248, 0.5)";
      const glowColor = isOutput
        ? "rgba(168, 85, 247, 0.2)"
        : "rgba(28, 57, 142, 0)";
      // : "rgba(28, 57, 142, 0)";

      // Draw Glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius * 1.2, 0, 2 * Math.PI);
      ctx.fillStyle = glowColor;
      ctx.fill();

      // Draw Core
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Draw concentric ripples if loud
      if (normalizedLevel > 0.5) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, dynamicRadius * 1.4, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [inputLevel, outputLevel, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      className="absolute left-[77px] -bottom-[10px] w-full max-w-[70px] h-auto mx-auto"
    />
  );
};

export default Visualizer;
