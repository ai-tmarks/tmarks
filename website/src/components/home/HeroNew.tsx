import { ArrowRight, Sparkles } from 'lucide-react';
import { APP_URL } from '@/lib/constants';

export default function HeroNew() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-40 overflow-hidden">
      {/* Minimal background */}
      <div className="absolute inset-0 bg-background" />

      {/* Subtle floating orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-foreground/[0.02] rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-foreground/[0.02] rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border/20 mb-12 animate-fade-in-down bg-muted/30">
            <Sparkles className="w-4 h-4 text-foreground/50 animate-pulse-slow" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground/60 tracking-wide">
              AI 驱动的智能书签管理
            </span>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black mb-6 leading-[0.95] text-foreground tracking-tighter animate-fade-in-up">
              让知识触手可及
            </h1>
            <p className="text-3xl md:text-4xl lg:text-5xl font-light text-foreground/40 tracking-wide leading-relaxed animate-fade-in-up stagger-1">
              让浏览更加高效
            </p>
          </div>

          {/* Description */}
          <p className="text-xl md:text-2xl text-muted-foreground/80 mb-16 max-w-3xl mx-auto leading-relaxed font-light animate-fade-in-up stagger-1">
            AI 智能标签 × 标签页管理
            <br />
            <span className="text-lg md:text-xl text-muted-foreground/60">前所未有的浏览器书签管理体验</span>
          </p>

          {/* CTA Button */}
          <div className="flex items-center justify-center animate-fade-in-up stagger-2">
            <a
              href={`${APP_URL}/register`}
              className="group inline-flex items-center gap-3 px-12 py-6 bg-foreground text-background rounded-xl text-lg font-medium hover:bg-foreground/90 transition-all duration-300 shadow-deeper hover:shadow-deepest hover:-translate-y-1"
            >
              <span>免费开始使用</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </a>
          </div>


        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-border/50 flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/50" />
        </div>
      </div>
    </section>
  );
}

