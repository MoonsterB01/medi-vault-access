import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star, Quote, BadgeCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeInOnScroll } from "./FadeInOnScroll";

const testimonials = [
  {
    id: 1,
    name: "Dr. Priya Sharma",
    role: "Senior Cardiologist",
    organization: "Apollo Hospitals, Mumbai",
    location: "Mumbai, Maharashtra",
    content:
      "MediVault has transformed how we manage patient records. The instant access to complete medical history has significantly improved our diagnostic accuracy. I can now see a patient's entire cardiac history in seconds.",
    rating: 5,
    initials: "PS",
    color: "bg-rose-500",
    verified: true,
    yearsUsing: "2 years",
  },
  {
    id: 2,
    name: "Rajesh Kumar",
    role: "Business Owner & Patient",
    organization: "Managing Director, Tech Solutions",
    location: "Bangalore, Karnataka",
    content:
      "Finally, all my family's medical records in one secure place. The family sharing feature is a lifesaver when managing my elderly parents' healthcare. No more searching through piles of old reports!",
    rating: 5,
    initials: "RK",
    color: "bg-blue-500",
    verified: true,
    yearsUsing: "1.5 years",
  },
  {
    id: 3,
    name: "Dr. Amit Patel",
    role: "Chief Medical Officer",
    organization: "Fortis Healthcare",
    location: "Delhi NCR",
    content:
      "The automated notifications and audit trails have streamlined our compliance process significantly. Our patients love the transparency and easy access to their reports. A must-have for any modern hospital.",
    rating: 5,
    initials: "AP",
    color: "bg-emerald-500",
    verified: true,
    yearsUsing: "1 year",
  },
  {
    id: 4,
    name: "Sneha Reddy",
    role: "Working Professional & Caregiver",
    organization: "IT Manager, Infosys",
    location: "Hyderabad, Telangana",
    content:
      "I was always worried about losing important medical documents during our frequent relocations. MediVault gives me peace of mind knowing everything is safely stored and I can access it from anywhere.",
    rating: 5,
    initials: "SR",
    color: "bg-purple-500",
    verified: true,
    yearsUsing: "8 months",
  },
  {
    id: 5,
    name: "Dr. Kavitha Menon",
    role: "Pediatrician",
    organization: "Rainbow Children's Hospital",
    location: "Chennai, Tamil Nadu",
    content:
      "For pediatric care, having access to a child's complete vaccination and health history is crucial. MediVault has made this seamless for parents and doctors alike. The AI-powered summaries save me hours every week.",
    rating: 5,
    initials: "KM",
    color: "bg-orange-500",
    verified: true,
    yearsUsing: "1 year",
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
                  <div className="bg-card rounded-2xl p-8 shadow-lg relative border border-border/50">
                    <Quote className="absolute top-6 right-6 h-10 w-10 text-primary/10" />
                    
                    {/* Rating and verification */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-5 w-5 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                      </div>
                      {testimonial.verified && (
                        <div className="flex items-center gap-1 text-xs text-trust bg-trust/10 px-2 py-1 rounded-full">
                          <BadgeCheck className="h-3 w-3" />
                          Verified User
                        </div>
                      )}
                    </div>

                    <p className="text-lg mb-6 text-foreground/90 leading-relaxed">
                      "{testimonial.content}"
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar with initials */}
                        <div className={`w-14 h-14 rounded-full ${testimonial.color} flex items-center justify-center shadow-lg`}>
                          <span className="font-bold text-white text-lg">
                            {testimonial.initials}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{testimonial.name}</p>
                          <p className="text-sm text-primary font-medium">
                            {testimonial.role}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {testimonial.organization}
                          </p>
                        </div>
                      </div>
                      
                      {/* Location and usage */}
                      <div className="hidden md:block text-right">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end mb-1">
                          <MapPin className="h-3 w-3" />
                          {testimonial.location}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Using for {testimonial.yearsUsing}
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