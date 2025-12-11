"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SIDEBAR_LINKS } from "@/constants";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <section className="glassmorphism2 sticky left-0 top-0 flex h-screen w-fit flex-col justify-between border-r border-white/[0.04] p-6 pt-28 text-white max-sm:hidden lg:w-[264px]">
      <div className="flex flex-1 flex-col gap-2">
        {SIDEBAR_LINKS.map((item) => {
          const isActive =
            pathname === item.route || pathname.startsWith(`${item.route}/`);

          return (
            <Link
              key={item.route}
              href={item.route}
              className={cn(
                "flex items-center justify-start gap-4 rounded-apple p-4 transition-all duration-apple ease-apple hover:bg-white/[0.06]",
                {
                  "bg-white/[0.08] shadow-apple-sm": isActive,
                }
              )}
            >
              <Image
                src={item.imgUrl}
                alt={item.label}
                width={22}
                height={22}
                className={cn("opacity-70 transition-all duration-apple", {
                  "opacity-100": isActive,
                })}
              />

              <p
                className={cn(
                  "text-[15px] font-medium tracking-apple-normal text-white/70 transition-colors duration-apple max-lg:hidden",
                  { "font-semibold text-white": isActive }
                )}
              >
                {item.label}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
