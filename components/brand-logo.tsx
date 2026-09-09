export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brandLogo ${compact ? "compact" : ""}`} aria-label="FantAsta">
      <svg className="brandLogoMark" viewBox="0 0 64 64" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="fa-gold" x1="10" y1="7" x2="53" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F0D98A"/>
            <stop offset="0.48" stopColor="#D4AF37"/>
            <stop offset="1" stopColor="#9A7620"/>
          </linearGradient>
        </defs>
        <path d="M32 4 53 12v16c0 15-8.8 25-21 32C19.8 53 11 43 11 28V12L32 4Z" fill="#151515" stroke="url(#fa-gold)" strokeWidth="2.5"/>
        <path d="M32 14 43.8 19v9.4c0 8.5-4.6 14.7-11.8 19.8-7.2-5.1-11.8-11.3-11.8-19.8V19L32 14Z" fill="none" stroke="#EAD9B7" strokeOpacity=".35"/>
        <circle cx="32" cy="28" r="7.2" fill="#0F0F10" stroke="#EAD9B7" strokeWidth="1.5"/>
        <path d="m32 21.6 3.2 2.3-1.2 3.8h-4l-1.2-3.8 3.2-2.3Zm-6.9 6 3.7.1 1.2 3.8-3 2.2-3.1-2.3 1.2-3.8Zm13.8 0 1.2 3.8-3.1 2.3-3-2.2 1.2-3.8 3.7-.1Z" fill="url(#fa-gold)"/>
        <path d="M19 15 15.8 9.7M45 15l3.2-5.3" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
        <path d="M17 10.5 13.5 9M47 10.5 50.5 9" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
        <path d="M32 42v8" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
        <path d="m28.5 48 3.5 3.2 3.5-3.2" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {!compact && <span className="brandLogoText"><strong>FantAsta</strong><small>Calcio · Aste · Strategia</small></span>}
    </span>
  );
}
