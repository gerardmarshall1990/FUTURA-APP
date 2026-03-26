import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Futura — Your Personal AI Advisor',
  description: 'Understand your patterns. See what\'s building.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'Futura',
    description: 'Understand what\'s next.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#09090B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
