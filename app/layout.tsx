import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Steelhead Quick Estimate",
  description: "Rough project estimate tool for Steelhead customers"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
