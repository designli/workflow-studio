import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workflow Studio",
  description: "Draw Designli workflows: shapes, arrows, swimlanes, nested processes.",
  icons: { icon: "/brand/logo.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="light h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
