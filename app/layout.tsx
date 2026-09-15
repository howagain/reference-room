import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Reference Room — Client mood boards',
  description:
    'A branded mood-board portal for design agencies and their clients. Upload inspiration, discuss designs, and choose a direction together.',
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
