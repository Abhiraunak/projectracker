/**
 * The projecTracker mark: bricks rising like a progress chart, on a black tile.
 * The same drawing as the app icon (public/logo.svg); `size` is in pixels.
 */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
            <rect width="64" height="64" rx="14" fill="#111111" />
            <rect x="12" y="41" width="11" height="9" rx="1.5" fill="#F5A524" />
            <rect x="26.5" y="41" width="11" height="9" rx="1.5" fill="#F5A524" />
            <rect x="26.5" y="30" width="11" height="9" rx="1.5" fill="#F5A524" />
            <rect x="41" y="41" width="11" height="9" rx="1.5" fill="#F5A524" />
            <rect x="41" y="30" width="11" height="9" rx="1.5" fill="#F5A524" />
            <rect x="41" y="19" width="11" height="9" rx="1.5" fill="#FFFFFF" />
            <rect x="10" y="52.5" width="44" height="2.5" rx="1.25" fill="#FFFFFF" />
        </svg>
    );
}