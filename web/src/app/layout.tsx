import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Mahfil Fund",
  description: "Mahfil Fund customer and administration portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var t = localStorage.getItem('mf_web_theme') || localStorage.getItem('mf_admin_theme');
    if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
    var l = localStorage.getItem('mf_web_language') || localStorage.getItem('mf_admin_language');
    if (l === 'bn' || l === 'en') document.documentElement.lang = l;
  } catch (e) {}
})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
