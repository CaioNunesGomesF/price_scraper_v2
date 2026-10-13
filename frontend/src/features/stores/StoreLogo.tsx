import { useState } from "react";

type Props = { name: string; domain?: string; className: string };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function StoreLogo({ name, domain, className }: Props) {
  const [failed, setFailed] = useState(false);
  const faviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : null;

  return <span className={`store-mark ${className}${failed || !faviconUrl ? " is-fallback" : ""}`} aria-hidden="true">
    {faviconUrl && !failed
      ? <img src={faviconUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : <span>{initials(name)}</span>}
  </span>;
}
