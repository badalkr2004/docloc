import { BucketBuilder } from '@/components/buckets/bucket-builder';

export default async function BucketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return (
    <div className="w-full max-w-[1600px] mx-auto h-full min-h-0">
      <BucketBuilder id={id} />
    </div>
  );
}
