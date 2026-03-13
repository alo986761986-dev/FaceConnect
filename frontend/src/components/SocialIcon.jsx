import { 
  Facebook, Instagram, Music2, Camera, 
  Twitter, Linkedin, MessageCircle, Globe,
  Pin, Youtube, Phone, Send
} from "lucide-react";

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music2,
  snapchat: Camera,
  x: Twitter,
  linkedin: Linkedin,
  discord: MessageCircle,
  reddit: Globe,
  pinterest: Pin,
  youtube: Youtube,
  whatsapp: Phone,
  telegram: Send,
};

const platformColors = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  tiktok: "#00F2EA",
  snapchat: "#FFFC00",
  x: "#000000",
  linkedin: "#0A66C2",
  discord: "#5865F2",
  reddit: "#FF4500",
  pinterest: "#BD081C",
  youtube: "#FF0000",
  whatsapp: "#25D366",
  telegram: "#0088CC",
};

export const SocialIcon = ({ platform, size = 20, active = true, className = "" }) => {
  const Icon = platformIcons[platform] || Globe;
  const color = active ? platformColors[platform] : "#52525B";

  return (
    <Icon
      className={`social-icon ${className}`}
      style={{ color, width: size, height: size }}
    />
  );
};

export default SocialIcon;
