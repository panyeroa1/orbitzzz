import { SignedIn, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

import { links } from "@/config";

import { MobileNav } from "./mobile-nav";

export const Navbar = () => {
  return (
    <nav className="flex-between fixed z-50 w-full glassmorphism2 px-6 py-5 lg:px-10 border-b border-white/5">
      <Link href="/" className="flex items-center gap-2 group">
        <Image
          src="/icons/logo.png"
          alt="Orbitz logo"
          width={36}
          height={36}
          className="max-sm:size-10 transition-transform group-hover:scale-110"
        />

        <p className="text-[28px] font-extrabold text-white max-sm:hidden bg-gradient-to-r from-white to-purple-1 bg-clip-text text-transparent">
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
