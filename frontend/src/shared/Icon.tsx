export type IconName = "arrow" | "close" | "search" | "plus" | "external" | "menu" | "chart" | "heart" | "user" | "chat" | "lock" | "mail" | "eye" | "eye-off" | "shield" | "check" | "logout" | "sparkles" | "lightbulb" | "volume" | "volume-off";

export default function Icon({ name }: { name: IconName }) {
  const paths = {
    arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
    close: <><path d="M5 5 19 19" /><path d="M19 5 5 19" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.3 4.3" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    external: <><path d="M13 5h6v6" /><path d="m19 5-9 9" /><path d="M19 14v5H5V5h5" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    chart: <><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-5" /><path d="M13 16V7" /><path d="M18 16v-8" /></>,
    heart: <path d="M20.8 5.6a5.2 5.2 0 0 0-7.3 0L12 7l-1.5-1.4a5.2 5.2 0 0 0-7.3 7.3L12 21l8.8-8.1a5.2 5.2 0 0 0 0-7.3Z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    chat: <path d="M20 16a3 3 0 0 1-3 3H8l-4 2V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z" />,
    lock: <><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
    mail: <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    "eye-off": <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
    check: <path d="M20 6 9 17l-5-5" />,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>,
    sparkles: <><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" /><path d="M19 3v4" /><path d="M21 5h-4" /></>,
    lightbulb: <><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>,
    "volume-off": <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m16 9 5 6" /><path d="m21 9-5 6" /></>,
  }[name];
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>;
}

