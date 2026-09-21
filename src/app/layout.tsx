import type { Metadata } from 'next';
import { DM_Sans, Orbitron, Space_Mono } from 'next/font/google';
import '@styles/globals.css';

import Navbar from '@components/Navbar';
import EventBar from '@components/EventBar';
import { Footer } from '@components/Footer';
import { AuthProvider } from '@context/AuthContext';
import { TeamMatchingProvider } from '@context/TeamMatchingContext';
import { EventProvider } from '@context/EventContext';
import SiteBackground from '@components/SiteBackground';

// Body copy: quiet, highly legible
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Display: Orbitron is the squared-off techno face the era ran on
const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

// Mono: eyebrow labels and anything that should read as machine output
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Open Sourcery',
  description: 'An open-source development club at UMD',
  icons: {
    icon: '/open_sourcery.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`text-graphite font-sans ${dmSans.variable} ${orbitron.variable} ${spaceMono.variable}`}
      >
        <SiteBackground />
        <AuthProvider>
          <TeamMatchingProvider>
            <EventProvider>
              <Navbar />
              <EventBar />
              {children}
              <Footer />
            </EventProvider>
          </TeamMatchingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
