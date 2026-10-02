import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { PostHogProvider } from '@/shared/providers/PostHogProvider';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';

import './globals.css';
const popinsFont = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'alphataco',
  description: 'Gestión para las empresas',
  // `?v=`: los navegadores cachean el favicon por URL; subirlo al cambiar el icono.
  icons: {
    icon: '/brand-icon.svg?v=2',
    shortcut: '/brand-icon.svg?v=2',
    apple: '/brand-icon.svg?v=2',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${popinsFont.className} bg-surface-muted dark:bg-slate-900`}>
        <PostHogProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <Toaster />
            <Sonner richColors={true} />
            <main>{children}</main>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
