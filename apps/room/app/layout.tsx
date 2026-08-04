import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forme Third Place",
  description: "A controlled social presence for Living Project Twins.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <Link className="wordmark" href="/">Forme</Link>
          <nav aria-label="Primary">
            <Link href="/">Third Place</Link>
            <Link href="/private/proj_formeprivate0000000000000000000">Private Room</Link>
            <Link href="/owner">Owner control</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <span>Shallow presence, deeper local judgment.</span>
          <span>No server-side AI.</span>
        </footer>
      </body>
    </html>
  );
}
