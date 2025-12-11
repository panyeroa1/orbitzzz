"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { avatarImages } from "@/constants";
import { cn } from "@/lib/utils";

type MeetingCardProps = {
  title: string;
  date: string;
  icon: string;
  isPreviousMeeting?: boolean;
  buttonIcon1?: string;
  buttonText?: string;
  handleClick: () => void;
  link: string;
};

export const MeetingCard = ({
  icon,
  title,
  date,
  isPreviousMeeting,
  buttonIcon1,
  handleClick,
  link,
  buttonText,
}: MeetingCardProps) => {
  const { toast } = useToast();

  return (
    <section className="apple-card flex min-h-[258px] w-full flex-col justify-between rounded-apple-lg px-5 py-8 xl:max-w-[568px]">
      <article className="flex flex-col gap-4">
        <Image
          src={icon}
          alt="upcoming"
          width={26}
          height={26}
          className="opacity-80"
        />
        <div className="flex justify-between">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold tracking-apple-tight">
              {title}
            </h1>
            <p className="text-[15px] font-normal tracking-apple-normal text-white/60">
              {date}
            </p>
          </div>
        </div>
      </article>
      <article className={cn("relative flex justify-center", {})}>
        <div className="relative flex w-full max-sm:hidden">
          {avatarImages.map((img, index) => (
            <Image
              key={index}
              src={img}
              alt="attendees"
              width={40}
              height={40}
              className={cn("rounded-full", { absolute: index > 0 })}
              style={{ top: 0, left: index * 28 }}
            />
          ))}
          <div className="flex-center absolute left-[136px] size-10 rounded-full border-[5px] border-dark-3 bg-dark-4 text-sm font-medium">
            +5
          </div>
        </div>
        {!isPreviousMeeting && (
          <div className="flex gap-2">
            <Button
              onClick={handleClick}
              className="rounded-apple bg-blue-1 px-6 font-medium transition-all duration-apple hover:bg-blue-1/90"
            >
              {buttonIcon1 && (
                <Image src={buttonIcon1} alt="feature" width={20} height={20} />
              )}
              &nbsp; {buttonText}
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast({
                  title: "Link copied.",
                });
              }}
              className="bg-dark-4 px-6 font-medium transition-all duration-apple hover:bg-dark-3"
            >
              <Image
                src="/icons/copy.svg"
                alt="feature"
                width={20}
                height={20}
              />
              &nbsp; Copy Link
            </Button>
          </div>
        )}
      </article>
    </section>
  );
};
