import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "@repo/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Operate and moderate the multi-vendor marketplace.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
