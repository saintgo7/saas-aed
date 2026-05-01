import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "AED 점검 SaaS",
  description: "AED 자동심장충격기 점검 관리 시스템",
  manifest: "/manifest.webmanifest"
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1E40AF"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  )
}
