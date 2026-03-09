import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SquareLabs — Marketing Intelligence Platform",
  description: "Square Yards Marketing Team Command Centre",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
