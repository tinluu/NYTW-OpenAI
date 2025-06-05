import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import ViewportHeightFix from './ViewportHeightFix';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} light`}>
      <head>
        <meta name="google-site-verification" content="4ZZue1Y9EfjANtqIbPkV_Xxe1uLSzQgwDKBqpQ9CRsU" />
      </head>
      <body className={`${inter.className} mx-auto scrollbar-hide flex h-[calc(var(--vh,1vh)*100)] flex-col antialiased`}>
              <div className="mx-auto scrollbar-hide flex w-full max-w-[1440px] flex-grow flex-col px-4 pb-4 sm:px-6 lg:px-8">
                <main className="flex w-full flex-grow items-center justify-center">
                  {children}
                </main>
                <Toaster richColors closeButton position="top-right" />
              </div>
              <ViewportHeightFix />
              <Analytics />
              <SpeedInsights />
      </body>
    </html>
  );
}


// import type { Metadata } from 'next'
// import { Inter } from 'next/font/google'
// import './globals.css'

// const inter = Inter({ subsets: ['latin'] })

// export const metadata: Metadata = {
//   title: 'MakeQuestions Next.js',
//   description: 'Question generation app built with Next.js',
// }

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return (
//     <html lang="en">
//       <body className={inter.className}>{children}</body>
//     </html>
//   )
// }
