"use client";

/**
 * AdSlot — Google AdSense placeholder component.
 *
 * To enable ads:
 * 1. Get your AdSense account approved at https://adsense.google.com
 * 2. Add the AdSense script to app/layout.tsx <head>:
 *    <Script
 *      async
 *      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
 *      crossOrigin="anonymous"
 *      strategy="afterInteractive"
 *    />
 * 3. Set NEXT_PUBLIC_ADSENSE_CLIENT, NEXT_PUBLIC_ADSENSE_SLOT_FOOTER,
 *    NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR in your .env file.
 * 4. Replace the placeholder div below with the actual <ins> ad tag.
 */

interface AdSlotProps {
  slot: "footer" | "sidebar";
  className?: string;
}

export function AdSlot({ slot, className = "" }: AdSlotProps) {
  const isDev = process.env.NODE_ENV === "development";
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  if (isDev || !clientId) {
    return (
      <div
        className={`border border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground text-xs ${
          slot === "sidebar" ? "h-60 w-full" : "h-20 w-full"
        } ${className}`}
      >
        Ad placeholder ({slot}) — disabled in dev
      </div>
    );
  }

  // Production: render actual ad unit
  // Replace data-ad-slot values with your slot IDs from env vars
  const slotId =
    slot === "footer"
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER
      : process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR;

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
