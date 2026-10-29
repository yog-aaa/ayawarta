import { Quote, Star } from "lucide-react";
import { TESTIMONIALS_DATA } from "@/config/landing";
import { AnimateIn } from "@/components/ui/AnimateIn";
import { Container } from "@/components/ui/Container";

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`Penilaian ${rating} dari 5 bintang`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={15}
          aria-hidden="true"
          className={
            index < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-brand-secondary/20"
          }
        />
      ))}
    </div>
  );
}

export default function TestimonialSection() {
  return (
    <section
      id="testimoni"
      className="scroll-mt-20 lg:scroll-mt-24 bg-white py-20 lg:py-28"
    >
      <Container>
        <AnimateIn className="mb-10 flex flex-col gap-4 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-brand-primary">
              Contoh cerita
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-brand-secondary sm:text-4xl lg:text-5xl">
              Kesan yang <span className="font-heading font-normal italic">tinggal lebih lama.</span>
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-muted-foreground lg:text-right">
            Ilustrasi pengalaman dari beragam perayaan yang bisa dibuat lebih
            personal bersama AyaWarta.
          </p>
        </AnimateIn>

        <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
          {TESTIMONIALS_DATA.map((testimonial, index) => (
            <AnimateIn key={testimonial.name} delay={index * 0.08}>
              <article className="flex h-full flex-col rounded-[1.7rem] border border-brand-secondary/10 bg-brand-soft p-6 shadow-subtle sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-primary shadow-subtle">
                    <Quote size={21} aria-hidden="true" />
                  </span>
                  <StarRating rating={testimonial.rating} />
                </div>

                <blockquote className="my-8 flex-1 text-[15px] leading-7 text-brand-secondary/90 sm:text-base">
                  “{testimonial.text}”
                </blockquote>

                <div className="flex items-center gap-3 border-t border-brand-secondary/10 pt-5">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-secondary font-heading text-lg italic text-white"
                  >
                    {testimonial.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-brand-secondary">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.category} · Cerita ilustratif
                    </p>
                  </div>
                </div>
              </article>
            </AnimateIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
