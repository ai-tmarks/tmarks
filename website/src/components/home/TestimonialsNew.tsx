import { Star, User, Quote } from 'lucide-react';
import { TESTIMONIALS } from '@/lib/constants';

export default function TestimonialsNew() {
  return (
    <section className="py-40 px-6 bg-muted/5">
      <div className="container mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-foreground tracking-tight">
            用户反馈
          </h2>
          <p className="text-xl text-muted-foreground/70 max-w-2xl mx-auto font-light leading-relaxed">
            来自真实用户的声音
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {TESTIMONIALS.map((testimonial, index) => (
            <div
              key={index}
              className="group relative"
            >
              {/* Card */}
              <div className="h-full glass rounded-2xl p-10 transition-all duration-500 shadow-deep hover:shadow-deepest hover:-translate-y-2 border border-border/30 hover:border-foreground/20 animate-fade-in-up">
                {/* Quote icon */}
                <div className="mb-6">
                  <Quote className="w-10 h-10 text-primary/20" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <p className="text-foreground/80 mb-8 leading-relaxed text-lg">
                  "{testimonial.content}"
                </p>

                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" strokeWidth={0} />
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-foreground/60" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

