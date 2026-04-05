import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mansi's Flower Garden",
  description: "Draw a flower and plant it in Mansi's garden. A playful creative experience by Mansi's Musings.",
  openGraph: {
    title: "Mansi's Flower Garden",
    description: "Draw a flower and plant it in our garden!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
