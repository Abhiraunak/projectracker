import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { NoWheelOnNumberInputs } from "@/components/utilites/NoWheelOnNumberInputs";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit'
})

export const metadata: Metadata = {
  title: "Project Tracker | Streamline Workflows & Track Progress",
  description: "Monitor project milestones, track team progress, and manage budgets in real time with our intuitive project tracking dashboard.",
  applicationName: "projecTracker", // the installed app's name
};

// The phone's status bar colour when the app is installed
export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Catches the browser's install offer the moment it comes, before the app's code has loaded, so Install app
            in the account menu never misses it (lib/pwa/install.ts picks it up from here) */}
        <Script id="install-offer" strategy="beforeInteractive">
          {`window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installOffer=e;});`}
        </Script>
        <Providers>
          <NoWheelOnNumberInputs />
          {children}
        </Providers>
        {/* Makes the app installable (Install app in the account menu) and shows the offline page */}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}