import Link from "next/link";
import { AuthControls } from "@/features/auth/auth-controls";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          FitFix
        </Link>
        <nav aria-label="Primary navigation" className="nav">
          <Link href="/support">Support</Link>
          <AuthControls />
        </nav>
      </header>
      {children}
    </>
  );
}
