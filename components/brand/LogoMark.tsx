import Image from "next/image";

/**
 * The projecTracker logo: the black mark on its yellow tile (public/logo.png, the same drawing as the app icon).
 * `size` is in pixels.
 */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
    return <Image src="/logo.png" alt="" aria-hidden width={size} height={size} priority className={`rounded-[22%] ${className}`} />;
}