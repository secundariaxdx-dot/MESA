import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "./globals.css";
import { Toaster } from "@/components/ui/Toast";
import { AppInstall } from "@/components/layout/AppInstall";

export const metadata: Metadata = {
  title: "MESA · Tu semana de comidas",
  description: "Planifica tus comidas, calcula lo que pagarás en caja por envases completos, usa tu despensa y cocina paso a paso.",
  applicationName: "MESA",
  appleWebApp: { capable: true, title: "MESA", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbfaf7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Toaster />
        <AppInstall />
      </body>
    </html>
  );
}
