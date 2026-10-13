export type IconName = "arrow" | "close" | "search" | "plus" | "external" | "menu" | "chart" | "heart" | "user" | "chat";

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
  }[name];
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>;
}
