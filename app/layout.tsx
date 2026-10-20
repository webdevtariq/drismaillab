import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { PerformanceController } from '@/components/lab/performance-controller'
import './globals.css'

export const metadata: Metadata = {
  title: 'DR ISMAIL LAB — Laboratory Information System',
  icons: {
    icon: '/icon-microscope.svg',
    apple: '/icon-microscope.svg',
    shortcut: '/icon-microscope.svg',
  },
  description:
    'DR ISMAIL LAB Health Care Center — patient registration, lab result entry, validated reporting, printing and history.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PerformanceController />
        {children}
        <Toaster position="top-center" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}