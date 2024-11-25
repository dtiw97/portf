import DeployButton from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="flex flex-col items-center">
            <div className="flex-1 w-full flex flex-col gap-20 items-center">
              <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 ">
                <div className="w-full flex justify-between items-center p-3 px-5 text-sm max-w-screen-lg ">
                  <div className="flex gap-5 items-center font-mono font-semibold">
                    <Link href={"/"} className="hover:scale-105 text-neutral-300 hover:text-emerald-400 transition-all duration-450">
                      home
                    </Link>
                    <Link href={"/contact"} className="hover:scale-105 text-neutral-300 hover:text-emerald-400 transition-all duration-450">
                      contact
                    </Link>
                    <Link href={"/pricing"} className="hover:scale-105 text-neutral-300 hover:text-emerald-400 transition-all duration-450">
                      pricing
                    </Link>

                  </div>
                  <div className="flex items-end gap-2">
                    {/* <DeployButton /> */}<ThemeSwitcher />
                  </div>
                  {/* {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />} */}
                </div>
              </nav>

              <div className="flex flex-col gap-20 w-full p-5 items-left max-w-screen-lg dark:text-stone-400 text-stone-700 min-h-screen-3/4 ">
                {children}
                {/* <p>
                    Powered by{" "}
                    <a
                      href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
                      target="_blank"
                      className="font-bold hover:underline"
                      rel="noreferrer"
                    >
                      Supabase
                    </a>
                  </p> */}
              </div>

              <footer className="bg-background bottom-0 w-full flex items-center justify-center border-t mx-auto text-center gap-8 py-3">
                <div className="w-full max-w-screen-lg flex flex-row justify-between px-5 gap-5 items-center font-mono font-semibold">

                  <div className="flex flex-row items-end justify-end w-full gap-5 pr-2">
                    <Link href={"/contact"} className="hover:scale-105 text-neutral-300 hover:text-emerald-400 transition-all duration-450">
                      contact
                    </Link>
                    <Link href={"/pricing"} className="hover:scale-105 text-neutral-300 hover:text-emerald-400 transition-all duration-450">
                      pricing
                    </Link>
                  </div>
                </div>
              </footer>
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
