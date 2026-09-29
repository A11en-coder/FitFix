import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitFix",
  description: "Gym maintenance workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="en">
      <body>
        {publishableKey ? (
          <ClerkProvider
            publishableKey={publishableKey}
            signInUrl={process.env.CLERK_SIGN_IN_URL}
            signUpUrl={process.env.CLERK_SIGN_UP_URL}
            signInFallbackRedirectUrl={process.env.CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}
            signUpFallbackRedirectUrl={process.env.CLERK_SIGN_UP_FALLBACK_REDIRECT_URL}
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
