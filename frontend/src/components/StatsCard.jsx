import { motion } from "framer-motion";

export const StatsCard = ({ icon: Icon, label, value, color }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="stats-card glass rounded-xl p-6 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}10, ${color}05)`,
        borderColor: `${color}30`
      }}
    >
      {/* Glow Effect */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: color }}
      />

      <div className="relative z-10">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>

        <p className="text-gray-400 text-sm mb-1">{label}</p>
        <p
          className="text-3xl font-bold font-['Outfit']"
          style={{ color }}
        >
          {value}
        </p>
      </div>
    </motion.div>
  );
};

export default StatsCard;
