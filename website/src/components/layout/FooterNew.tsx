import { Mail, MessageCircle, X, Github as GithubIcon, Bookmark } from 'lucide-react';
import { FOOTER_LINKS } from '@/lib/constants';

const iconMap = {
  Mail,
  MessageCircle,
  X,
  Github: GithubIcon,
};

export default function FooterNew() {
  return (
    <footer className="border-t border-border/30 bg-muted/10 shadow-deep">
      <div className="container mx-auto px-6 py-8">
        {/* Empty footer - minimal design */}
      </div>
    </footer>
  );
}

