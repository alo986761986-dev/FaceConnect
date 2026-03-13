import { Link } from "react-router-dom";
import { Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import SocialIcon from "@/components/SocialIcon";

export const PersonCard = ({ person, onDelete }) => {
  const activeSocials = person.social_networks?.filter(sn => sn.has_account) || [];
  const socialCount = activeSocials.length;

  return (
    <div
      data-testid={`person-card-${person.id}`}
      className="person-card group relative overflow-hidden border border-white/5 bg-[#18181B] hover:border-[#00F0FF]/50 transition-colors duration-300 rounded-xl card-hover"
    >
      {/* Image */}
      <div className="aspect-square relative overflow-hidden">
        {person.photo_data ? (
          <img
            src={person.photo_data}
            alt={person.name}
            className="person-image w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#00F0FF]/10 to-[#7000FF]/10 flex items-center justify-center">
            <span className="text-5xl font-bold text-white/30 font-['Outfit']">
              {person.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Delete Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              data-testid={`delete-card-${person.id}`}
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-white hover:text-red-400"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-[#121212] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete {person.name}?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This action cannot be undone. This will permanently delete this person.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                data-testid={`confirm-delete-card-${person.id}`}
                onClick={onDelete}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Button */}
        <Link
          to={`/person/${person.id}`}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#00F0FF]/20 text-white hover:text-[#00F0FF]"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Info */}
      <Link to={`/person/${person.id}`} className="block p-4">
        <h3 className="text-lg font-semibold text-white font-['Outfit'] mb-2 group-hover:text-[#00F0FF] transition-colors">
          {person.name}
        </h3>

        {/* Social Count Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {activeSocials.slice(0, 4).map((social, index) => (
              <div
                key={social.platform}
                className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center"
                style={{ marginLeft: index > 0 ? '-4px' : '0' }}
              >
                <SocialIcon platform={social.platform} size={12} />
              </div>
            ))}
            {socialCount > 4 && (
              <div
                className="w-6 h-6 rounded-full bg-[#00F0FF]/20 flex items-center justify-center text-xs text-[#00F0FF]"
                style={{ marginLeft: '-4px' }}
              >
                +{socialCount - 4}
              </div>
            )}
          </div>
          
          <span className="text-sm text-[#00F0FF] font-mono">
            {socialCount}/{12}
          </span>
        </div>
      </Link>
    </div>
  );
};

export default PersonCard;
