"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SIDEBAR_LINKS } from "@/constants";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <section className="sticky left-0 top-0 flex h-screen w-fit flex-col justify-between glassmorphism2 p-6 pt-28 text-white max-sm:hidden lg:w-[264px]">
      <div className="flex flex-1 flex-col gap-4">
        {SIDEBAR_LINKS.map((item) => {
          const isActive =
            pathname === item.route || pathname.startsWith(`${item.route}/`);

          return (
            <Link
              key={item.route}
              href={item.route}
              className={cn(
                "flex items-center justify-start gap-4 rounded-xl p-4 transition-all duration-300 hover:bg-purple-1/20 hover:translate-x-1",
                {
                  "bg-gradient-to-r from-purple-1/30 to-blue-1/20 border-l-2 border-purple-1 animate-glow-pulse": isActive,
                }
              )}
            >
              <Image
                src={item.imgUrl}
                alt={item.label}
                width={24}
                height={24}
                className={cn("transition-transform", { "scale-110": isActive })}
              />

              <p className={cn("text-lg font-semibold max-lg:hidden", { "text-purple-1": isActive })}>
                {item.label}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
