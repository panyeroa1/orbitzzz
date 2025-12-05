"use client";

import { MeetingTypeList } from "@/components/meeting-type-list";
import { useGetCalls } from "@/hooks/use-get-calls";

const HomePage = () => {
  const now = new Date();
  const { upcomingCalls } = useGetCalls();

  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(
    now
  );

  return (
    <section className="flex size-full flex-col gap-10 text-white">
      <div className="h-[300px] w-full rounded-apple-xl bg-hero bg-cover overflow-hidden">
        <div className="flex h-full flex-col justify-between max-md:px-5 max-md:py-8 lg:p-11">
          <h2 className="glassmorphism max-w-[270px] rounded-apple py-2 text-center text-sm font-medium tracking-apple-normal text-white/80">
            {upcomingCalls?.length === 0
              ? "No upcoming meeting"
              : upcomingCalls?.length &&
                `Upcoming meeting at: 
                ${upcomingCalls[
                  upcomingCalls.length - 1
                ].state?.startsAt?.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
          </h2>

          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-light tracking-apple-tight lg:text-7xl">{time}</h1>

            <p className="text-base font-medium text-white/50 tracking-apple-normal lg:text-xl">{date}</p>
          </div>
        </div>
      </div>

      <MeetingTypeList />
    </section>
  );
};

export default HomePage;
