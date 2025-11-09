import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grudge App - Sports Team Management",
  description: "Comprehensive sports team management application for matches, practices, and tournaments",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Grudge App",
  },
  icons: {
    icon: [
      { url: "/icons/icon-144x144.svg", sizes: "144x144", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512x512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-152x152.svg", sizes: "152x152", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#7c3aed",
    "msapplication-tap-highlight": "no",
  },
};

import NavBar from './components/NavBar'
import NavBarDev from './components/NavBarDev'
import LightweightNavBarDev from './components/LightweightNavBarDev'
import ErrorBoundary from './components/ErrorBoundary'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import AuthProvider from './components/AuthProvider'
import SessionDebug from './components/SessionDebug'
import ScoreConfirmationBanner from './components/ScoreConfirmationBanner'
import { TeamFilterProvider } from './context/TeamFilterContext'

const isDev = process.env.NODE_ENV === 'development'

 export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let navBar: React.ReactNode = null;
  if (!isDev) {
    navBar = <NavBar />;
  }
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <TeamFilterProvider>
              <ScoreConfirmationBanner />
              {isDev ? <LightweightNavBarDev /> : navBar}
              {children}
              <PWAInstallPrompt />
              <SessionDebug />
            </TeamFilterProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
