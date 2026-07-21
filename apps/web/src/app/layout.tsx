import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanban — Project Workspace",
  description: "AI-powered personal project workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dim" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
