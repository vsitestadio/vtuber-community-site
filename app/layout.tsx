import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "星乃ルナ | Official Website",
  description: "星乃ルナ公式サイトと、ルナメイトのためのファンコミュニティ。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
