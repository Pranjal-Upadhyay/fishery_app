import type { Metadata } from 'next';
import { Libre_Baskerville, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider, themeBootstrapScript } from '@/lib/theme-context';
import './globals.css';

// Libre Baskerville — only ships 400 and 700 (plus 400 italic).
// We design the hierarchy around those two weights.
const libre = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-libre',
  display: 'swap',
});

// Mono kept for tabular numbers (metric cards, coordinates, the ticker).
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MatsyaMitra Admin',
  description: 'Aquaculture oversight dashboard for the Government of Bihar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${libre.variable} ${jetbrains.variable} light`}
      suppressHydrationWarning
    >
      <head>
        <script
          // Runs before React mounts so the user never sees the wrong theme.
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
