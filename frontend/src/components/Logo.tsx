import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Logo({ size = 38, className, style }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: "visible", ...style }}
    >
      <defs>
        <linearGradient id="bgGradMaster" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        
        <linearGradient id="glowGradMaster" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        
        <radialGradient id="sunGradMaster" cx="70" cy="30" r="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        
        <filter id="houseShadowMaster" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#022c22" floodOpacity="0.4" />
        </filter>

        <filter id="outerGlowMaster" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <linearGradient id="houseShineMaster" x1="50" y1="26" x2="50" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Ambient Outer Glow Layer */}
      <circle cx="50" cy="50" r="40" fill="url(#glowGradMaster)" filter="url(#outerGlowMaster)" opacity="0.25" />
      
      {/* Base App Icon Shape (Modern Squircle approximation) */}
      <rect x="8" y="8" width="84" height="84" rx="26" fill="url(#bgGradMaster)" />

      {/* Inner Glow / Light Source (Sun inside) */}
      <circle cx="68" cy="32" r="28" fill="url(#sunGradMaster)" opacity="0.65" />

      {/* The Sleek House Structure */}
      <path 
        d="M50 26 L22 48 L30 48 L30 78 Q30 80 32 80 L68 80 Q70 80 70 78 L70 48 L78 48 Z" 
        fill="url(#houseShineMaster)" 
        filter="url(#houseShadowMaster)"
      />
      
      {/* Cutout Door - contrasting dark green */}
      <path d="M42 80 L42 60 Q42 56 50 56 Q58 56 58 60 L58 80 Z" fill="#047857" />

      {/* Beautiful Leaf / nature element on the right roof */}
      <path 
        d="M54 38 C54 38 68 24 78 32 C68 32 58 44 58 44 Z" 
        fill="#A7F3D0" 
      />
      <line x1="54" y1="38" x2="62" y2="30" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" />
      <path 
        d="M62 30 C62 30 70 20 78 26 C70 26 64 34 64 34" 
        fill="#6EE7B7" 
      />
    </svg>
  );
}
