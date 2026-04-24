import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Speak-Translator",
  description: "Real-time AI translation and conversation",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Speak-Translator",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Speak-Translator",
    title: "Speak-Translator",
    description: "Real-time AI translation and conversation",
  },
  twitter: {
    card: "summary_large_image",
    title: "Speak-Translator",
    description: "Real-time AI translation and conversation",
  },
};

export const viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <link rel="icon" href="/icon-96x96.png" sizes="96x96" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        {children}
        <script>
          {`if ('serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
              const isProd = ${JSON.stringify(process.env.NODE_ENV === "production")};

              if (!isProd) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((reg) => reg.unregister()));
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((key) => caches.delete(key)));
                }
                console.log('SW disabled in non-production mode');
                return;
              }

              navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                  console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                  console.log('SW registration failed: ', registrationError);
                });
            });
          }`}
        </script>
      </body>
    </html>
  );
}
