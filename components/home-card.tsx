import { cn } from "@/lib/utils";
import Image from "next/image";

type HomeCardProps = {
  className?: string;
  img: string;
  title: string;
  description: string;
  handleClick: () => void;
};

export const HomeCard = ({
  className,
  img,
  title,
  description,
  handleClick,
}: HomeCardProps) => {
  return (
    <button
      className={cn(
        "premium-card flex min-h-[260px] w-full cursor-pointer flex-col justify-between rounded-apple-lg p-0 px-5 py-7 text-left xl:max-w-[270px] animate-scale-in",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex-center glassmorphism size-11 rounded-apple transition-all duration-apple ease-apple hover:scale-105 hover:bg-white/10">
        <Image src={img} alt={title} width={24} height={24} />
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold tracking-apple-tight">{title}</h1>

        <p className="text-[15px] font-normal text-white/60 tracking-apple-normal">{description}</p>
      </div>
    </button>
  );
};
