"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SIDEBAR_LINKS } from "@/constants";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <section className="sticky left-0 top-0 flex h-screen w-fit flex-col justify-between glassmorphism2 p-6 pt-28 text-white max-sm:hidden lg:w-[264px] border-r border-white/[0.04]">
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
                className={cn("transition-all duration-apple opacity-70", { 
                  "opacity-100": isActive 
                })}
              />

              <p className={cn(
                "text-[15px] font-medium max-lg:hidden tracking-apple-normal text-white/70 transition-colors duration-apple", 
                { "text-white font-semibold": isActive }
              )}>
                {item.label}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
