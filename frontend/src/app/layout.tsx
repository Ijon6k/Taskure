import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Kanban — Personal Project Workspace",
  description: "Personal project workspace for managing your projects",
};

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${interTight.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans">
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster
              position="bottom-right"
              theme="dark"
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: "var(--surface-l5, #2b2f3d)",
                  border: "1px solid var(--border-default, rgba(255, 255, 255, 0.09))",
                  color: "var(--text-primary, #ededed)",
                  fontSize: "13px",
                  borderRadius: "var(--radius-md, 8px)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
