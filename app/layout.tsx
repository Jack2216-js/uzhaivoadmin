import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "UZHAIVO Admin Panel", template: "%s · UZHAIVO Admin" },
  description: "UZHAIVO super-admin operations dashboard for jobs, worker proofs and private owner verification.",
  icons: { icon: "/uzhaivo-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
