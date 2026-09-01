import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Step Counter",
  description: "A simple web-based step counter",
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