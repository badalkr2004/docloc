import { RecipientView } from './recipient-view';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RecipientView token={token} />;
}
