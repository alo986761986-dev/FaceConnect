import { useSettings } from "@/context/SettingsContext";
import BottomNav from "@/components/BottomNav";
import FacebookDatingEnhanced from "@/components/facebook/FacebookDatingEnhanced";

// Dating Page - uses the enhanced Facebook Dating component matching Italian UI
export default function Dating() {
  const { isDark } = useSettings();

  return (
    <div className="min-h-screen pb-16">
      <FacebookDatingEnhanced isDark={isDark} />
      <BottomNav />
    </div>
  );
}
