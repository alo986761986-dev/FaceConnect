import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isElectron } from "@/utils/electron";

export default function BackButton({ className = "", showOnWeb = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Only show in Electron by default, or if showOnWeb is true
  if (!isElectron() && !showOnWeb) return null;

  // Don't show on home/root page
  if (location.pathname === "/" || location.pathname === "/auth") return null;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBack}
      className={`rounded-full hover:bg-white/10 ${className}`}
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  );
}
