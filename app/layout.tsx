import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dhrisya — Free AI Image Generator",
  description: "Create images from text with Dhrisya.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}