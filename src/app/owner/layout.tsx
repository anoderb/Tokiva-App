import { OwnerShell } from "@/components/layout/owner-layout";

export default function OwnerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OwnerShell>{children}</OwnerShell>;
}
