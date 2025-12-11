export const SIDEBAR_LINKS = [
  {
    label: "Home",
    route: "/",
    imgUrl: "/icons/home.svg",
  },
  {
    label: "Upcoming",
    route: "/upcoming",
    imgUrl: "/icons/upcoming.svg",
  },
  {
    label: "Previous",
    route: "/previous",
    imgUrl: "/icons/previous.svg",
  },
  {
    label: "Recordings",
    route: "/recordings",
    imgUrl: "/icons/recordings.svg",
  },
  {
    label: "Personal Room",
    route: "/personal-room",
    imgUrl: "/icons/add-personal.svg",
  },
  {
    label: "Integrations",
    route: "/integrations",
    imgUrl: "/icons/join-meeting.svg",
  },
  {
    label: "API Docs",
    route: "/docs",
    imgUrl: "/icons/copy.svg",
  },
] as const;

export const avatarImages = [
  "/images/avatar-1.jpeg",
  "/images/avatar-2.jpeg",
  "/images/avatar-3.png",
  "/images/avatar-4.png",
  "/images/avatar-5.png",
] as const;

export const SIDEBAR_ACTIONS = [
  {
    label: "Broadcaster",
    action: "broadcaster",
    imgUrl: "/icons/video.svg",
  },
  {
    label: "Translator",
    action: "translator", 
    imgUrl: "/icons/add-meeting.svg",
  },
] as const;

