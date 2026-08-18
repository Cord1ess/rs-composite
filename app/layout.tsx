import type { Metadata, Viewport } from 'next'
import { poppins, sourceSerif } from './fonts'
import { LoadingScreen } from '@/components/loader/LoadingScreen'
import { GlowDriver } from '@/components/ui/GlowDriver'
import { SiteHeader } from '@/components/nav/SiteHeader'
import { Footer } from '@/components/sections/home'
import { site } from '@/content/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.rscomposite.com'),
  title: {
    default: 'RSComposite. Knitwear made from yarn to carton.',
    template: '%s. RSComposite',
  },
  description: site.description,
  openGraph: {
    title: 'RSComposite. Knitwear made from yarn to carton.',
    description: site.description,
    type: 'website',
    locale: 'en',
    siteName: site.name,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.legalName,
  alternateName: site.name,
  url: 'https://www.rscomposite.com',
  foundingDate: String(site.founded),
  description: site.description,
  email: site.email,
  telephone: site.phones[0],
  address: {
    '@type': 'PostalAddress',
    streetAddress: site.address.line1,
    addressLocality: 'Fatullah, Narayanganj',
    postalCode: '1420',
    addressCountry: 'BD',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${sourceSerif.variable}`}>
      <body className="bg-background text-white antialiased">
        {/*
          Before the browser restores a previous scroll position. The loading
          screen owns the arrival: every load starts at the top so the hero
          entry actually plays, instead of the curtain lifting onto wherever
          the page happened to be scrolled last time. The loading screen hands
          restoration back to the browser once it is gone.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{history.scrollRestoration='manual'}catch(e){}",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <LoadingScreen />
        <GlowDriver />
        <SiteHeader />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
