import PublicLayout from "@/components/PublicLayout";
import SEO from "@/components/SEO";
import { EnhancedFooter } from "@/components/trust/EnhancedFooter";
import { FadeInOnScroll } from "@/components/FadeInOnScroll";
import { Target, Heart, Shield, FileText, Users, Clock } from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Family first",
    description: "Make it easier for the person caring for a family to keep important records together.",
  },
  {
    icon: Heart,
    title: "Clarity over complexity",
    description: "Use plain language and simple ways to organize and find health documents.",
  },
  {
    icon: FileText,
    title: "Useful records",
    description: "Keep the documents families already receive, ready to revisit when needed.",
  },
  {
    icon: Users,
    title: "The long view",
    description: "Build toward a clearer record of a family’s care over time, without replacing clinicians.",
  },
];

export default function About() {
  return (
    <PublicLayout>
      <SEO title="About MediVault — Family Health Records, Together" description="MediVault helps families keep medical reports together today, with a longer-term vision for a personal Health Passport and a clearer view of the health journey." path="/about" />
      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <FadeInOnScroll>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                A clearer health history, built around family.
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                MediVault starts with a simple job: keep your family’s medical records together and easier to find. Our longer-term vision is a Health Passport you can look back through over time—the Health Time Machine.
              </p>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <FadeInOnScroll>
              <div className="bg-card rounded-2xl p-8 border border-border/50 h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-4">What we do today</h2>
                <p className="text-muted-foreground">
                  Help families keep prescriptions, reports, and scans in one place, so they can find and revisit the records they already have.
                </p>
              </div>
            </FadeInOnScroll>

            <FadeInOnScroll delay={100}>
              <div className="bg-card rounded-2xl p-8 border border-border/50 h-full">
                <div className="w-12 h-12 rounded-xl bg-trust/10 flex items-center justify-center mb-6">
                  <Clock className="h-6 w-6 text-trust" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Where we’re going</h2>
                <p className="text-muted-foreground">
                  Toward a personal Health Passport: a clearer record of a family’s health journey that can support conversations with clinicians—not diagnose or predict.
                </p>
              </div>
            </FadeInOnScroll>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <FadeInOnScroll>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-8">From scattered papers to a Health Passport</h2>
              <div className="prose prose-lg dark:prose-invert mx-auto text-muted-foreground">
                <p>
                  A prescription may be in a WhatsApp chat, a test report in a folder, and an older scan on someone else’s phone. Families should not have to piece together a health history from memory each time they need a record.
                </p>
                <p className="mt-4">
                  MediVault brings those documents together as a practical first step. The Health Time Machine is the longer view: making it easier to look back through a family’s saved records over time, while leaving medical decisions to doctors and patients.
                </p>
              </div>
            </div>
          </FadeInOnScroll>

        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <FadeInOnScroll key={value.title} delay={index * 100}>
                <div className="text-center p-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      <EnhancedFooter />
    </PublicLayout>
  );
}
