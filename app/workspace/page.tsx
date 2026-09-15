import Portal from '../portal';
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default function WorkspacePage() {
  return <Portal />;
}
