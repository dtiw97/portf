import DeployButton from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from 'next-intl';
import { useTranslations } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Header } from '@/app/home/Header';
import LocaleSwitcher from "@/components/LocaleSwitch";
import Link from "next/link";
import "./globals.css";
import { Footer } from "./home/Footer";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Frontend Developer | Beautiful Performant Websites - dtiw.xyz",
  description: "I'm a frontend developer with a passion for building beautiful performant websites and web apps.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={GeistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <main className="flex flex-col items-center">
              <div className="flex-1 w-full flex flex-col gap-20 items-center">
                <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 ">
                  <div className="w-full flex justify-between items-center p-3 px-5 text-sm max-w-screen-lg ">
                    <Header />
                    <div className="flex items-end gap-2">
                      {/* <DeployButton /> */}<ThemeSwitcher />
                      <LocaleSwitcher />
                      {/* {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />} */}
                    </div>

                  </div>
                </nav>

                <div className="flex items-center flex-col gap-20 w-full max-w-screen-lg p-5 items-left dark:text-stone-400 text-stone-700 min-h-screen-3/4 ">
                  {children}
                </div>

                <footer className="bg-background bottom-0 w-full flex items-center justify-center border-t mx-auto text-center gap-8 py-3">
                  <div className="w-full max-w-screen-lg flex flex-row justify-between px-5 gap-5 items-center font-mono font-semibold">
                    <Footer />
                  </div>
                </footer>
              </div>
            </main>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
