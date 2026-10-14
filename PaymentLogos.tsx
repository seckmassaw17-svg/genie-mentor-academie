import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  showLabel?: boolean;
  labelClassName?: string;
}

/**
 * Authentic Wave Sénégal Logo (Official Wave Cyan Blue & Penguin Emblem)
 */
export const WaveLogo: React.FC<LogoProps> = ({ 
  className = "", 
  size = 28, 
  showLabel = true,
  labelClassName = "font-black text-[#001D4A] tracking-tight" 
}) => {
  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {/* Wave Official Emblem Circle */}
      <div 
        style={{ width: size, height: size }} 
        className="rounded-full bg-[#1EA5FC] flex items-center justify-center shrink-0 shadow-xs p-1"
      >
        <svg viewBox="0 0 100 100" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Penguin Body Outline */}
          <path
            d="M50 12C38 12 30 22 30 35C30 43 33 48 31 56C29 64 22 70 22 78C22 86 32 90 50 90C68 90 78 86 78 78C78 70 71 64 69 56C67 48 70 43 70 35C70 22 62 12 50 12Z"
            fill="#001833"
          />
          {/* White Belly */}
          <path
            d="M50 36C42 36 38 45 38 60C38 74 42 82 50 82C58 82 62 74 62 60C62 45 58 36 50 36Z"
            fill="#FFFFFF"
          />
          {/* Orange Beak */}
          <path
            d="M44 32L50 40L56 32H44Z"
            fill="#FF9E1B"
          />
          {/* White Eye Highlights */}
          <circle cx="43" cy="26" r="2.5" fill="#FFFFFF" />
          <circle cx="57" cy="26" r="2.5" fill="#FFFFFF" />
          {/* Left / Right Flippers */}
          <path
            d="M26 48C23 54 22 63 26 68C27 63 28 55 26 48Z"
            fill="#001833"
          />
          <path
            d="M74 48C77 54 78 63 74 68C73 63 72 55 74 48Z"
            fill="#001833"
          />
          {/* Orange Feet */}
          <ellipse cx="38" cy="88" rx="8" ry="4" fill="#FF9E1B" />
          <ellipse cx="62" cy="88" rx="8" ry="4" fill="#FF9E1B" />
        </svg>
      </div>

      {showLabel && (
        <div className="flex flex-col leading-none">
          <span className={`text-sm ${labelClassName}`}>wave</span>
          <span className="text-[9px] text-cyan-700 font-extrabold uppercase tracking-widest">Sénégal</span>
        </div>
      )}
    </div>
  );
};

/**
 * Authentic Orange Money Sénégal Logo (Official Orange Square & Black Badge with OM Typography)
 */
export const OrangeMoneyLogo: React.FC<LogoProps> = ({ 
  className = "", 
  size = 28, 
  showLabel = true,
  labelClassName = "font-black text-[#FF7900] tracking-tight" 
}) => {
  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {/* Orange Money Dual-Tone Symbol */}
      <div 
        style={{ width: size, height: size }} 
        className="rounded-lg bg-[#FF7900] flex items-center justify-center shrink-0 shadow-xs p-1 relative overflow-hidden"
      >
        {/* Inner stylized OM monogram */}
        <div className="w-full h-full bg-black rounded-sm flex items-center justify-center p-0.5">
          <div className="flex items-center justify-center font-black text-white text-[11px] leading-none tracking-tighter">
            <span className="text-[#FF7900] text-[13px] font-black">O</span>
            <span className="text-white text-[10px] font-black -ml-0.5">M</span>
          </div>
        </div>
      </div>

      {showLabel && (
        <div className="flex flex-col leading-none">
          <span className={`text-sm ${labelClassName}`}>orange<span className="text-black dark:text-white font-bold ml-1">money</span></span>
          <span className="text-[9px] text-[#FF7900] font-extrabold uppercase tracking-widest">Sénégal</span>
        </div>
      )}
    </div>
  );
};
