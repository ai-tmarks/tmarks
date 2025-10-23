import { ArrowRight } from 'lucide-react';
import { APP_URL } from '@/lib/constants';

export default function CTANew() {
  return (
    <section className="py-40 px-6 relative overflow-hidden bg-background">
      {/* Subtle floating orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-foreground/[0.02] rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-foreground/[0.02] rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Heading */}
          <h2 className="text-5xl md:text-6xl font-bold mb-10 text-foreground tracking-tight animate-fade-in-up">
            开始使用 TMarks
          </h2>

          {/* Description */}
          <p className="text-xl text-muted-foreground/70 mb-16 max-w-2xl mx-auto leading-relaxed font-light animate-fade-in-up stagger-1">
            加入 10,000+ 用户
          </p>

          {/* CTA Button */}
          <div className="flex items-center justify-center animate-fade-in-up stagger-2">
            <a
              href={`${APP_URL}/register`}
              className="group inline-flex items-center gap-3 px-12 py-6 bg-foreground text-background rounded-xl text-lg font-medium hover:bg-foreground/90 transition-all duration-300 shadow-deeper hover:shadow-deepest hover:-translate-y-1"
            >
              <span>免费注册</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

