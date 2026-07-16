import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FluentUp — Level Up Your English",
  description:
    "Chat with Max, your friendly AI English teacher. Get live corrections, earn points, and level up your language skills — all in a fun, social chat experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

