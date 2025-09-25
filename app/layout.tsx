
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ModelLens",
  description: "Explore and visualize LLM models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <nav className="p-4 border-b">
          <Link href="/models" className="mr-4">Models</Link>
          <Link href="/timeline/gpt-4o">Timeline</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
