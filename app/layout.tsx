import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
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