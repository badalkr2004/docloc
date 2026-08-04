import { BucketBuilder } from '@/components/buckets/bucket-builder';

export default async function BucketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return (
    <div className="container py-8 max-w-[1600px] mx-auto h-[calc(100vh-4rem)]">
      <BucketBuilder id={id} />
    </div>
  );
}
