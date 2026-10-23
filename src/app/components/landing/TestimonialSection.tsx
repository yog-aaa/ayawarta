import Image from "next/image";
import { Star } from "lucide-react";
import { TESTIMONIALS_DATA } from "@/config/landing";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AnimateIn } from "@/components/ui/AnimateIn";

const StarRating = ({ rating }: { rating: number }) => (
  <div
    className="flex items-center gap-1"
    role="img"
    aria-label={`Penilaian ${rating} dari 5 bintang`}
  >
    {Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={`${rating}-${index}`}
        aria-hidden="true"
        className={`h-5 w-5 ${
          index < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ))}
  </div>
);

export default function TestimonialSection() {
  return (
    <section
      id="testimoni"
      className="bg-gray-50 py-20 lg:py-32 scroll-mt-20 lg:scroll-mt-24"
    >
      <Container>
        <AnimateIn direction="up">
          <SectionHeader
            title="Testimoni"
            subtitle="Intip beberapa kesan dari para pengguna yang telah merayakan momen istimewanya bersama kami."
          />
        </AnimateIn>

        <div className="-mx-4 flex snap-x snap-mandatory space-x-8 overflow-x-auto px-4 pb-8 scroll-pl-4 md:scroll-pl-6 lg:scroll-pl-8">
          {TESTIMONIALS_DATA.map((testimonial, index) => (
            <AnimateIn
              key={testimonial.name}
              direction="none"
              delay={index * 0.1}
              className="relative aspect-[9/12] w-[85vw] shrink-0 snap-center overflow-hidden rounded-3xl shadow-xl sm:w-[350px]"
            >
              <Image
                src={testimonial.imageSrc}
                alt={`Foto pengguna ${testimonial.name}`}
                fill
                className="object-cover"
                sizes="(min-width: 640px) 350px, 85vw"
              />

              <div className="absolute bottom-4 left-4 right-4">
                <div className="rounded-2xl bg-white/80 p-4 shadow-lg backdrop-blur-[10px]">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {testimonial.name}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {testimonial.category}
                      </p>
                    </div>
                    <StarRating rating={testimonial.rating} />
                  </div>
                  <p className="text-xs leading-relaxed text-gray-700">
                    {testimonial.text}
                  </p>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
