import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daymatrix",
  description:
    "Daymatrix – A React + TypeScript app to create, move, resize, filter, and search tasks in a clean monthly calendar view with drag-and-drop.",
  openGraph: {
    title: "Daymatrix",
    description:
      "Daymatrix – A React + TypeScript app to create, move, resize, filter, and search tasks in a clean monthly calendar view with drag-and-drop.",
    url: "https://daymatrix.vercel.app",
    siteName: "Daymatrix",
    images: [
      {
        url: "https://daymatrix.vercel.app/og.png",
        width: 1200,
        height: 630,
        alt: "Daymatrix Calendar Preview",
      },
    ],
    locale: "en_US",
    type: "website",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
