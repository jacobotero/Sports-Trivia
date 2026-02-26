import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { NavBar } from "@/components/NavBar";
import { AdSlot } from "@/components/AdSlot";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sportsdle — Daily Sports Trivia",
  description:
    "Test your sports knowledge with daily trivia across MLB, NFL, NBA, and NHL. Play for free, track your rank, and challenge friends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <SessionProvider>
          <NavBar />
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
          <footer className="border-t border-border py-6 mt-8">
            <div className="max-w-6xl mx-auto px-4">
              <AdSlot slot="footer" className="mb-4" />
              <p className="text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} Sportsdle · Daily sports trivia
              </p>
            </div>
          </footer>
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
