import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ 
  subsets: ['latin'], 
  variable: '--font-outfit' 
})

export const metadata: Metadata = {
  title: "Project Tracker | Streamline Workflows & Track Progress",
  description: "Monitor project milestones, track team progress, and manage budgets in real time with our intuitive project tracking dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
