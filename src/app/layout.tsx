import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "proj_mana",
    template: "%s | proj_mana",
  },
  description: "チームのためのプロジェクト管理ツール",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full">
      <body className="flex min-h-full flex-col font-sans antialiased">{children}</body>
    </html>
  );
}
