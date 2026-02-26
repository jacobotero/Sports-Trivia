import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXTAUTH_URL ?? "https://sportsdle.vercel.app";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/leaderboard`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/play/mlb`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/play/nfl`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/play/nba`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/register`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
