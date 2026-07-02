import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Papers",
  description: "A daily paper reader that grows with you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background),transparent_15%)] backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6 text-sm">
            <Link href="/" className="font-semibold tracking-tight">
              papers<span className="text-[var(--accent)]">.</span>
            </Link>
            <div className="flex gap-4 text-[var(--muted)]">
              <Link href="/" className="hover:text-[var(--foreground)] transition-colors">Today</Link>
              <Link href="/queue" className="hover:text-[var(--foreground)] transition-colors">Queue</Link>
              <Link href="/topics" className="hover:text-[var(--foreground)] transition-colors">Topics</Link>
              <Link href="/dictionary" className="hover:text-[var(--foreground)] transition-colors">Dictionary</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
