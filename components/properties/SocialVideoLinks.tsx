import { InstagramIcon, TikTokIcon } from "@/components/site/SocialIcons";

interface SocialVideoLinksProps {
  instagramUrl: string | null;
  tiktokUrl: string | null;
}

/** Links to the owner's property films on Instagram / TikTok, when provided. */
export default function SocialVideoLinks({ instagramUrl, tiktokUrl }: SocialVideoLinksProps) {
  if (!instagramUrl && !tiktokUrl) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {instagramUrl && (
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-dark">
          <InstagramIcon className="w-4 h-4" /> Watch on Instagram
        </a>
      )}
      {tiktokUrl && (
        <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-dark">
          <TikTokIcon className="w-4 h-4" /> Watch on TikTok
        </a>
      )}
    </div>
  );
}
