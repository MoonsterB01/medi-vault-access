import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeInOnScroll } from "./FadeInOnScroll";

const testimonials = [
  {
    id: 1,
    name: "Dr. Priya Sharma",
    role: "Cardiologist, Apollo Hospital",
    content:
      "MediVault has transformed how we manage patient records. The instant access to complete medical history has significantly improved our diagnostic accuracy.",
    rating: 5,
    avatar: "PS",
  },
  {
    id: 2,
    name: "Rajesh Kumar",
    role: "Patient",
    content:
      "Finally, all my family's medical records in one secure place. The family sharing feature is a lifesaver when managing my parents' healthcare.",
    rating: 5,
    avatar: "RK",
  },
  {
    id: 3,
    name: "Dr. Amit Patel",
    role: "Hospital Administrator",
    content:
      "The automated notifications and audit trails have streamlined our compliance. Our patients love the transparency and easy access to their reports.",
    rating: 5,
    avatar: "AP",
  },
  {
    id: 4,
    name: "Sneha Reddy",
    role: "Patient",
    content:
      "I was always worried about losing important medical documents. MediVault gives me peace of mind knowing everything is safely stored and accessible.",
    rating: 5,
    avatar: "SR",
  },
];

export function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <FadeInOnScroll>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">
              Trusted by Healthcare Professionals & Patients
            </h2>
            <p className="text-muted-foreground">
              See what our users have to say about MediVault
            </p>
          </div>
        </FadeInOnScroll>

        <div className="max-w-4xl mx-auto relative">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="w-full flex-shrink-0 px-4"
                >
                  <div className="bg-card rounded-2xl p-8 shadow-lg relative">
                    <Quote className="absolute top-6 right-6 h-10 w-10 text-primary/10" />
                    
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-5 w-5 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>

                    <p className="text-lg mb-6 text-foreground/90 leading-relaxed">
                      "{testimonial.content}"
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {testimonial.avatar}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrev}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setCurrentIndex(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}