import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Feeding Brennen',
  description: 'Track restaurants, visits, and spending.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="site-header">
          <div className="site-nav">
            <h1><span className="brand-dot" />Feeding Brennen</h1>
            <span className="header-note">Personal food journal <span>•</span> {new Date().getFullYear()}</span>
          </div>
        </header>
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
