import { TrackContent } from './track-content';

export const metadata = { title: 'Track Order' };

export default async function TrackPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return <TrackContent orderNumber={orderNumber} />;
}
