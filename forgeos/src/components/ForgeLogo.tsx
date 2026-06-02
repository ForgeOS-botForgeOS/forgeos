// The ForgeOS anvil-and-spark mark, as crisp vector — same design as the app
// icon. `tile` wraps it in the rounded ember square (for splash/branding);
// without it you get just the mark to drop next to the wordmark.
export function ForgeLogo({ size = 64, tile = false, className = '' }: { size?: number; tile?: boolean; className?: string }) {
  const W = '#F5F5F7';
  const G = '#FFD34A';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="ForgeOS">
      {tile && <rect x="0" y="0" width="64" height="64" rx="14" fill="#FF5C35" />}
      {/* anvil */}
      <g fill={tile ? W : 'currentColor'}>
        <rect x="3.8" y="24.9" width="4.6" height="2" rx="1" /> {/* horn tip */}
        <rect x="6.4" y="24" width="6.6" height="3.6" rx="1.2" /> {/* horn */}
        <rect x="51.2" y="24.6" width="5.2" height="4.2" rx="1.4" /> {/* heel */}
        <rect x="11.5" y="23" width="41" height="6.6" rx="2" /> {/* top face */}
        <rect x="21.8" y="29.4" width="25.6" height="4" rx="1.6" /> {/* under-step */}
        <rect x="26.9" y="33.3" width="10.2" height="6.6" rx="1.4" /> {/* neck */}
        <rect x="17.9" y="39.6" width="28.2" height="5.9" rx="2" /> {/* base */}
      </g>
      {/* sparks */}
      <g fill={G}>
        <rect x="17.6" y="12.8" width="2" height="6.4" rx="1" />
        <rect x="15.4" y="15" width="6.4" height="2" rx="1" />
        <rect x="25.6" y="16.3" width="1.6" height="3.2" rx="0.8" />
        <rect x="24.4" y="17.4" width="3.5" height="1.5" rx="0.7" />
        <rect x="10.6" y="19.2" width="2" height="2" rx="0.8" />
      </g>
    </svg>
  );
}
