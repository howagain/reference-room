import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Reference Room — Client mood boards',
  description:
    'Collect inspiration, find your direction, and bring your design agent into the conversation.',
  robots: { index: false, follow: false },
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
