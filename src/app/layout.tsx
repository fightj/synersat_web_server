import { Inter } from "next/font/google";
import "./globals.css";

import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import AuthInitializer from "@/components/auth/AuthInitializer";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} rounded-xl dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <AuthInitializer>{children}</AuthInitializer>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
