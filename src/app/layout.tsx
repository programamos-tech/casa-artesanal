import type { Metadata } from "next";
import { Geist, Geist_Mono, Fira_Code } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ClientsProvider } from "@/contexts/clients-context";
import { ProductsProvider } from "@/contexts/products-context";
import { CategoriesProvider } from "@/contexts/categories-context";
import { SalesProvider } from "@/contexts/sales-context";
import { WarrantyProvider } from "@/contexts/warranty-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ConditionalLayout } from "@/components/layout/conditional-layout";
import { GlobalLoading } from "@/components/ui/global-loading";
import { MobileNavWrapper } from "@/components/ui/mobile-nav-wrapper";
import { ToasterWrapper } from "@/components/ui/toaster-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "La Casa Artesanal",
  description: "Sistema de gestión de inventario y ventas de La Casa Artesanal",
  icons: {
    icon: '/favicon-la-casa-artesanal.png',
    shortcut: '/favicon-la-casa-artesanal.png',
    apple: '/favicon-la-casa-artesanal.png'
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='dark'?'dark':t==='light'?'light':(d?'dark':'light');var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(r);root.setAttribute('data-theme',r);}catch(e){}})();`

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${firaCode.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <ClientsProvider>
              <ProductsProvider>
                <CategoriesProvider>
                  <SalesProvider>
                    <WarrantyProvider>
                      <GlobalLoading />
                      <ConditionalLayout>
                        {children}
                      </ConditionalLayout>
                      <MobileNavWrapper />
                      <ToasterWrapper />
                    </WarrantyProvider>
                  </SalesProvider>
                </CategoriesProvider>
              </ProductsProvider>
            </ClientsProvider>
          </AuthProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics mode="production" />}
      </body>
    </html>
  );
}
