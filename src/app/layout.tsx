import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, THEME_SCRIPT } from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply stored theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
