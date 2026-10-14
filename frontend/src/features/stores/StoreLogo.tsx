import { useState } from "react";

type Props = { name: string; domain?: string; imageUrl?: string; className: string };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function StoreLogo({ name, domain, imageUrl, className }: Props) {
  const [failed, setFailed] = useState(false);
  const faviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : null;
  const logoUrl = imageUrl || faviconUrl;

  return <span className={`store-mark ${className}${failed || !logoUrl ? " is-fallback" : ""}`} aria-hidden="true">
    {logoUrl && !failed
      ? <img src={logoUrl} alt="" loading="lazy" referrerPolicy={imageUrl ? undefined : "no-referrer"} onError={() => setFailed(true)} />
      : <span>{initials(name)}</span>}
  </span>;
}
