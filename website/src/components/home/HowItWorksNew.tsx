import { UserPlus, Key, Download as DownloadIcon, Rocket } from 'lucide-react';
import { HOW_IT_WORKS } from '@/lib/constants';

const iconMap = {
  1: UserPlus,
  2: Key,
  3: DownloadIcon,
  4: Rocket,
};

export default function HowItWorksNew() {
  return (
    <section className="py-40 px-6 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-foreground tracking-tight">
            快速开始
          </h2>
          <p className="text-xl text-muted-foreground/70 max-w-2xl mx-auto font-light leading-relaxed">
            四步即可开始使用
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {HOW_IT_WORKS.map((step) => {
              const Icon = iconMap[step.step as keyof typeof iconMap];
              
              return (
                <div
                  key={step.step}
                  className="group relative"
                >
                  {/* Card */}
                  <div className="h-full glass rounded-2xl p-10 transition-all duration-500 shadow-deep hover:shadow-deepest hover:-translate-y-2 border border-border/30 hover:border-foreground/20 animate-fade-in-up">
                    {/* Step number and icon */}
                    <div className="flex items-center gap-6 mb-8">
                      {/* Step number */}
                      <div className="w-14 h-14 rounded-xl bg-foreground text-background flex items-center justify-center text-2xl font-bold shadow-deeper group-hover:scale-110 transition-transform duration-300">
                        {step.step}
                      </div>

                      {/* Icon */}
                      <div className="w-14 h-14 rounded-xl bg-foreground/5 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 flex items-center justify-center shadow-deep">
                        <Icon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold mb-4 text-foreground transition-colors tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-lg font-light">
                      {step.description}
                    </p>
                  </div>

                  {/* Connector line (except for last item) */}
                  {step.step < HOW_IT_WORKS.length && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-border to-transparent" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

