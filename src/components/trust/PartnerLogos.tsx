import { FadeInOnScroll } from "../FadeInOnScroll";

const partners = [
  { name: "Apollo Hospitals", type: "Healthcare Partner" },
  { name: "Fortis Healthcare", type: "Healthcare Partner" },
  { name: "Max Healthcare", type: "Healthcare Partner" },
  { name: "Medanta", type: "Healthcare Partner" },
  { name: "AIIMS Delhi", type: "Government Partner" },
  { name: "Manipal Hospitals", type: "Healthcare Partner" },
];

export function PartnerLogos() {
  return (
    <section className="py-12 border-y border-border/50 bg-muted/20">
      <div className="container mx-auto px-4">
        <FadeInOnScroll>
          <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-wider font-medium">
            Trusted by Leading Healthcare Institutions
          </p>
        </FadeInOnScroll>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 max-w-5xl mx-auto">
          {partners.map((partner, index) => (
            <FadeInOnScroll key={partner.name} delay={index * 50}>
              <div className="group flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity duration-300">
                <div className="w-20 h-20 rounded-xl bg-card border border-border/50 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <span className="text-2xl font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                    {partner.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-medium text-center max-w-[100px]">
                  {partner.name}
                </span>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
        
        <FadeInOnScroll delay={400}>
          <p className="text-center text-xs text-muted-foreground mt-8">
            + 50 more healthcare providers across India
          </p>
        </FadeInOnScroll>
      </div>
    </section>
  );
}
