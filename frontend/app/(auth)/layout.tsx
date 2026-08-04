export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Docloc
          </h1>
          <p className="text-muted-foreground text-sm">
            Your secure document vault
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
