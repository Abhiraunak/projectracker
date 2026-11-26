// app/layout.tsx — add the three marked parts to your existing file (keep everything else as it is)

import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker"; // 1. add this import

export const metadata: Metadata = {
    // ...your existing title, description...
    applicationName: "projecTracker", // 2. add this line
};

// 2. add this block (the phone's status bar colour when installed)
export const viewport: Viewport = {
    themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                {/* ...your existing providers... */}
                {children}
                <RegisterServiceWorker /> {/* 3. add this line, just before </body> */}
            </body>
        </html>
    );
}