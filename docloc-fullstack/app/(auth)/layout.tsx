export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login/signup pages own the full-screen layout — don't nest them in a centered card shell.
  return <>{children}</>;
}
