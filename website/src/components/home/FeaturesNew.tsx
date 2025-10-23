import { Sparkles, Layers, Puzzle, RefreshCw, Share2, Download, Check } from 'lucide-react';
import { FEATURES } from '@/lib/constants';

const iconMap = {
  Sparkles,
  Layers,
  Puzzle,
  RefreshCw,
  Share2,
  Download,
};

export default function FeaturesNew() {
  return (
    <section className="py-40 px-6 relative overflow-hidden bg-muted/5">
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-foreground tracking-tight">
            核心功能
          </h2>
          <p className="text-xl text-muted-foreground/70 max-w-2xl mx-auto font-light leading-relaxed">
            AI 智能标签 × 多端同步 × 标签页管理
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {FEATURES.map((feature) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap];
            
            return (
              <div
                key={feature.id}
                className="group relative"
              >
                {/* Card */}
                <div className="h-full glass rounded-2xl p-10 transition-all duration-500 shadow-deep hover:shadow-deepest hover:-translate-y-2 border border-border/30 hover:border-foreground/20 animate-fade-in-up">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-foreground/5 mb-8 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 flex items-center justify-center shadow-deep">
                    <Icon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold mb-4 text-foreground transition-colors tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground mb-8 leading-relaxed font-light">
                    {feature.description}
                  </p>

                  {/* Highlights */}
                  <ul className="space-y-3">
                    {feature.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-success" strokeWidth={3} />
                        </div>
                        <span className="text-foreground/80">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

