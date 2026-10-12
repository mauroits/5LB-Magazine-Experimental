import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const IconDEX: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="50" rx="46" ry="40" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.25))" />
    {/* Shadow behind DEX text */}
    <text x="51" y="60" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="38" fontStyle="italic" fill="#000000" opacity="0.35" textAnchor="middle">
      DEX
    </text>
    {/* Cyan/blue slanted DEX text */}
    <text x="49" y="58" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="38" fontStyle="italic" fill="#38bdf8" textAnchor="middle">
      DEX
    </text>
  </svg>
);

export const IconNeofiti: React.FC<IconProps> = ({ className = 'w-6 h-5' }) => (
  <svg viewBox="0 0 120 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="35" rx="58" ry="32" fill="#ffeb3b" stroke="#fbc02d" strokeWidth="1.5" />
    {/* 5LB with underline */}
    <text x="60" y="32" fontFamily="Georgia, serif" fontWeight="bold" fontSize="23" fill="#000000" textAnchor="middle">
      5LB
    </text>
    <line x1="28" y1="36" x2="92" y2="36" stroke="#000000" strokeWidth="2" />
    <text x="60" y="54" fontFamily="Impact, system-ui, sans-serif" fontWeight="normal" fontSize="16" fill="#000000" letterSpacing="0.5" textAnchor="middle">
      PER NEOFITI
    </text>
  </svg>
);

export const IconCognitivo: React.FC<IconProps> = ({ className = 'w-6 h-5' }) => (
  <svg viewBox="0 0 120 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="35" rx="58" ry="32" fill="#00e676" stroke="#00c853" strokeWidth="1.5" />
    <text x="42" y="32" fontFamily="Georgia, serif" fontWeight="bold" fontSize="22" fill="#000000" textAnchor="middle">
      5LB
    </text>
    <text x="82" y="32" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="17" fill="#000000" textAnchor="middle">
      OK
    </text>
    <line x1="24" y1="36" x2="96" y2="36" stroke="#000000" strokeWidth="2" />
    <text x="60" y="55" fontFamily="Impact, system-ui, sans-serif" fontSize="16" fill="#000000" letterSpacing="0.5" textAnchor="middle">
      COGNITIVO
    </text>
  </svg>
);

export const IconApplicativo: React.FC<IconProps> = ({ className = 'w-6 h-5' }) => (
  <svg viewBox="0 0 120 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="35" rx="58" ry="32" fill="#2979ff" stroke="#1d4ed8" strokeWidth="1.5" />
    <text x="42" y="32" fontFamily="Georgia, serif" fontWeight="bold" fontSize="22" fill="#ffffff" textAnchor="middle">
      5LB
    </text>
    <text x="82" y="32" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="17" fill="#ffffff" textAnchor="middle">
      OK
    </text>
    <line x1="24" y1="36" x2="96" y2="36" stroke="#ffffff" strokeWidth="2" />
    <text x="60" y="55" fontFamily="Impact, system-ui, sans-serif" fontSize="15" fill="#ffffff" letterSpacing="0.5" textAnchor="middle">
      APPLICATIVO
    </text>
  </svg>
);

export const IconOperatori: React.FC<IconProps> = ({ className = 'w-6 h-5' }) => (
  <svg viewBox="0 0 120 70" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="35" rx="58" ry="32" fill="#880e4f" stroke="#4a0022" strokeWidth="1.5" />
    <text x="42" y="32" fontFamily="Georgia, serif" fontWeight="bold" fontSize="22" fill="#ffffff" textAnchor="middle">
      5LB
    </text>
    <text x="82" y="32" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="16" fill="#ffffff" textAnchor="middle">
      PRO
    </text>
    <line x1="24" y1="36" x2="96" y2="36" stroke="#ffffff" strokeWidth="2" />
    <text x="60" y="55" fontFamily="Impact, system-ui, sans-serif" fontSize="15" fill="#ffffff" letterSpacing="0.5" textAnchor="middle">
      OPERATORI
    </text>
  </svg>
);

export const IconPresenzaLab: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" fill="#111827" stroke="#374151" strokeWidth="2" />
    <text x="50" y="38" fontFamily="Georgia, serif" fontStyle="italic" fontSize="16" fill="#f3f4f6" textAnchor="middle">
      Presenza
    </text>
    <text x="35" y="66" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="24" fill="#ffffff" textAnchor="middle">
      LAB
    </text>
    <text x="68" y="66" fontFamily="Georgia, serif" fontWeight="bold" fontSize="24" fill="#a5b4fc" textAnchor="middle">
      5LB
    </text>
  </svg>
);

export const IconPresencingCircle: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Swirling sky blue brush arc */}
    <path
      d="M20 50 A 32 32 0 1 1 55 82 A 38 38 0 0 0 20 50"
      fill="#38bdf8"
    />
    <path
      d="M26 40 C 35 18, 65 18, 80 35 C 88 45, 88 65, 75 78 C 65 88, 48 85, 45 80"
      stroke="#0284c7"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
    {/* Yellow 3-branched stick figure/star */}
    <line x1="50" y1="30" x2="50" y2="70" stroke="#facc15" strokeWidth="5" strokeLinecap="round" />
    <line x1="38" y1="42" x2="62" y2="58" stroke="#facc15" strokeWidth="4.5" strokeLinecap="round" />
    <line x1="62" y1="42" x2="38" y2="58" stroke="#facc15" strokeWidth="4.5" strokeLinecap="round" />
  </svg>
);

export const IconConsulenza: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Orange 5 */}
    <text x="32" y="70" fontFamily="Georgia, serif" fontWeight="bold" fontSize="62" fill="#ff5722">
      5
    </text>
    {/* Dark navy phone receiver handset tilted */}
    <path
      d="M 68 30 C 65 24 58 24 55 28 L 51 34 C 48 38 49 43 53 47 L 57 51 C 61 55 66 56 70 53 L 76 49 C 80 46 80 39 74 36 Z M 52 75 C 68 85 85 68 75 52 L 72 55 C 80 66 66 80 55 72 Z"
      fill="#0f172a"
    />
    <path
      d="M78 35 C82 42, 82 52, 75 60 L68 72 C64 77, 57 78, 52 74 L46 68 C42 64, 43 57, 48 53 L54 48 C57 45, 63 46, 67 50 L71 44 C67 38, 70 33, 75 32 Z"
      fill="#0f172a"
    />
  </svg>
);

export const IconFramework: React.FC<IconProps> = ({ className = 'w-8 h-5' }) => (
  <svg viewBox="0 0 140 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="5" y="44" fontFamily="Georgia, serif" fontWeight="bold" fontSize="42" fill="#2563eb">
      5LB
    </text>
    <text x="68" y="42" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="normal" fontSize="22" fill="#0f172a">
      framework
    </text>
  </svg>
);

export const IconHameriano: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Stylized orange organic letter M with split */}
    <path
      d="M18 15 C26 15 36 20 40 28 L40 85 C32 85 22 82 18 78 Z"
      fill="#ff6b00"
    />
    <path
      d="M82 15 C74 15 64 20 60 28 L60 85 C68 85 78 82 82 78 Z"
      fill="#ff6b00"
    />
    <path
      d="M44 32 L50 20 L56 32 L56 82 L44 82 Z"
      fill="#ff8533"
    />
  </svg>
);

export const IconAndrogyne: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Yellow crossing arrows */}
    <path
      d="M10 32 L36 32 C48 32, 54 68, 66 68 L80 68"
      stroke="#eab308"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M75 58 L92 68 L75 78 Z"
      fill="#eab308"
    />
    <path
      d="M10 68 L36 68 C48 68, 54 32, 66 32 L80 32"
      stroke="#eab308"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M75 22 L92 32 L75 42 Z"
      fill="#eab308"
    />
  </svg>
);

export const IconCovid19: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="18" fill="#ef4444" />
    {/* 5 spokes with circle heads */}
    {[0, 72, 144, 216, 288].map((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      const x1 = 50 + Math.cos(rad) * 16;
      const y1 = 50 + Math.sin(rad) * 16;
      const x2 = 50 + Math.cos(rad) * 35;
      const y2 = 50 + Math.sin(rad) * 35;
      return (
        <g key={i}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ef4444" strokeWidth="7" strokeLinecap="round" />
          <circle cx={x2} cy={y2} r="10" fill="#dc2626" />
        </g>
      );
    })}
  </svg>
);

export const Icon5LBHeaderLogo: React.FC<{ className?: string }> = ({ className = 'h-10' }) => (
  <div className={`flex items-baseline font-serif ${className}`}>
    <span className="text-3xl font-extrabold text-orange-500 tracking-tight">5LB</span>
    <span className="ml-1 text-2xl font-bold text-white tracking-normal font-sans">Magazine</span>
  </div>
);

export const IconNotebookLM: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="notebookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4285F4" />
        <stop offset="50%" stop-color="#9B72CF" />
        <stop offset="100%" stop-color="#EA4335" />
      </linearGradient>
    </defs>
    <rect x="15" y="15" width="70" height="70" rx="18" fill="url(#notebookGrad)" />
    {/* Notebook spine */}
    <rect x="23" y="24" width="6" height="52" rx="3" fill="#ffffff" opacity="0.6" />
    {/* AI spark stars */}
    <path
      d="M58 34 C58 40, 64 44, 70 44 C64 44, 58 48, 58 54 C58 48, 52 44, 46 44 C52 44, 58 40, 58 34 Z"
      fill="#ffffff"
    />
    <path
      d="M44 56 C44 59, 47 61, 50 61 C47 61, 44 63, 44 66 C44 63, 41 61, 38 61 C41 61, 44 59, 44 56 Z"
      fill="#ffffff"
      opacity="0.9"
    />
  </svg>
);
