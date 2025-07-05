import type { Metadata, Viewport } from "next";
import "./globals.css";

// Updated metadata for our bias detection application
export const metadata: Metadata = {
  title: "Bias Detection Tool",
  description: "AI-powered text analysis for bias detection and inclusive language suggestions",
  // Additional SEO metadata
  keywords: ["bias detection", "inclusive language", "text analysis", "AI"],
  authors: [{ name: "Bias Detection Team" }],
  icons: {
    icon: '/next.svg',
    shortcut: '/next.svg',
    apple: '/next.svg',
  },
};

// Viewport configuration (Next.js 15+ requirement)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">
        {/* Main application structure */}
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
