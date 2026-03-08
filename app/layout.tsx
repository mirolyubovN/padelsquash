import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono, Oswald } from "next/font/google";
import { SiteFooter } from "@/src/components/site-footer";
import { SiteHeader } from "@/src/components/site-header";
import { siteConfig } from "@/src/lib/content/site-data";
import "./globals.css";
import "../src/styles/index.scss";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin", "cyrillic"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: siteConfig.name,
  description: siteConfig.shortDescription,
  applicationName: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_KZ",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.shortDescription,
    url: siteConfig.siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.shortDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteConfig.name,
    description: siteConfig.shortDescription,
    url: siteConfig.siteUrl,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address,
      addressLocality: siteConfig.city,
      addressCountry: siteConfig.country,
    },
    areaServed: siteConfig.city,
    sameAs: siteConfig.socialLinks.map((link) => link.href),
  };

  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${plexMono.variable} ${oswald.variable}`}>
        <a href="#main-content" className="skip-link">
          Перейти к основному содержимому
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <div className="site-frame">
          <SiteHeader />
          <main id="main-content" className="site-main">
            <div className="site-shell site-main__inner">{children}</div>
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
