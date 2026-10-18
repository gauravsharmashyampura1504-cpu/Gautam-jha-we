import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gautam Jha (Stock Learners) | Official Community",
  description:
    "Join the Stock Learners educational community for market insights, educational updates, and stock analysis.",
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
