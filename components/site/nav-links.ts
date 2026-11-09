import { IMAGERY } from "@/lib/media-library";

export const NAV_LINKS = [
  { href: "/properties", label: "Residences", short: "Properties", image: IMAGERY.modernVilla },
  { href: "/about", label: "Our Story", short: "About", image: IMAGERY.whiteVilla },
  { href: "/contact", label: "Private Enquiry", short: "Contact", image: IMAGERY.stairsToSea },
] as const;

export const CONTACT_EMAIL = "info@realpropertyestate.online";
