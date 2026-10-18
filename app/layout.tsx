
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Learners | Gautam Jha",
  description:
    "Join the Stock Learners educational community for market insights, educational updates, and stock analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
