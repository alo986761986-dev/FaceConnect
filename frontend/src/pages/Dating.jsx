import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import BottomNav from "@/components/BottomNav";
import FacebookDating from "@/components/facebook/FacebookDating";

// Dating Page - uses the comprehensive FacebookDating component
export default function Dating() {
  const { user, token } = useAuth();
  const { isDark } = useSettings();

  return (
    <div className="min-h-screen pb-20">
      <FacebookDating isDark={isDark} />
      <BottomNav />
    </div>
  );
}
