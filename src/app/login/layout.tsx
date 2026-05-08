import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "La Casa Artesanal - Iniciar Sesión",
  description: "Sistema de gestión de inventario y ventas de La Casa Artesanal",
  icons: {
    icon: '/favicon-la-casa-artesanal.png',
    shortcut: '/favicon-la-casa-artesanal.png',
    apple: '/favicon-la-casa-artesanal.png'
  },
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
