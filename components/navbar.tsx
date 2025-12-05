import { SignedIn, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

import { links } from "@/config";

import { MobileNav } from "./mobile-nav";

export const Navbar = () => {
  return (
    <nav className="flex-between fixed z-50 w-full glassmorphism2 px-6 py-4 lg:px-10 border-b border-white/[0.04]">
      <Link href="/" className="flex items-center gap-2.5 group">
        <Image
          src="/icons/logo.png"
          alt="Orbitz logo"
          width={36}
          height={36}
          className="max-sm:size-10 transition-transform duration-apple ease-apple group-hover:scale-105"
        />

        <p className="text-[26px] font-semibold text-white max-sm:hidden tracking-apple-tight bg-gradient-to-r from-white via-white to-purple-1/80 bg-clip-text text-transparent">
          Orbitz
        </p>
      </Link>

      <div className="flex-between gap-5">
        <SignedIn>
          <UserButton afterSignOutUrl="/sign-in" />
        </SignedIn>

        <Link
          href={links.sourceCode}
          target="_blank"
          rel="noreferrer noopener"
          title="Source Code"
          className="transition-opacity hover:opacity-80"
        >
          <Image src="/icons/github.svg" alt="GitHub" height={80} width={80} />
        </Link>

        <MobileNav />
      </div>
    </nav>
  );
};
