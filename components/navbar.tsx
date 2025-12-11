import { SignedIn, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

import { MobileNav } from "./mobile-nav";

export const Navbar = () => {
  return (
    <nav className="flex-between glassmorphism2 fixed z-50 w-full border-b border-white/[0.04] px-6 py-4 lg:px-10">
      <Link href="/" className="group flex items-center gap-2.5">
        <Image
          src="/icons/logo.png"
          alt="Orbitz logo"
          width={36}
          height={36}
          className="transition-transform duration-apple ease-apple group-hover:scale-105 max-sm:size-10"
        />

        <p className="bg-gradient-to-r from-white via-white to-purple-1/80 bg-clip-text text-[26px] font-semibold tracking-apple-tight text-transparent text-white max-sm:hidden">
          Orbitz
        </p>
      </Link>

      <div className="flex-between gap-5">
        <SignedIn>
          <UserButton afterSignOutUrl="/sign-in" />
        </SignedIn>

        <MobileNav />
      </div>
    </nav>
  );
};
