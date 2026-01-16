import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ListsProvider } from "@/contexts/ListsContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Content Queue",
  description: "Your personal reading queue with AI-powered recommendations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            <ListsProvider>{children}</ListsProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
