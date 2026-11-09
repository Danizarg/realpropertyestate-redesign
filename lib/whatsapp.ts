export const WHATSAPP_DISPLAY_PHONE = "+34 633 392 452";
export const WHATSAPP_NUMBER = "34633392452";

export const WHATSAPP_GENERAL_URL =
  "https://wa.me/34633392452?text=Hello%20Real%20Property%20Estate%2C%20I%20would%20like%20more%20information%20about%20your%20properties%20in%20Marbella.";

export function buildPropertyWhatsAppUrl(propertyName: string): string {
  const message = `Hello Real Property Estate, I would like more information about ${propertyName}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
