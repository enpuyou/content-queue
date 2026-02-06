import type { Metadata } from "next";
import { Inter, Libre_Caslon_Text, Merriweather } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ListsProvider } from "@/contexts/ListsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ReadingSettingsProvider } from "@/contexts/ReadingSettingsContext";
import { ThemeScript } from "./theme-script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const libreCaslon = Libre_Caslon_Text({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "700"],
});

const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "sed.i",
  description: "Your personal reading queue with AI-powered recommendations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${libreCaslon.variable} ${merriweather.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <ReadingSettingsProvider>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <ListsProvider>{children}</ListsProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </ReadingSettingsProvider>
      </body>
    </html>
  );
}
