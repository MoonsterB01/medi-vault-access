import PublicLayout from "@/components/PublicLayout";
import { TeamSection } from "@/components/trust/TeamSection";
import { MediaMentions } from "@/components/trust/MediaMentions";
import { EnhancedFooter } from "@/components/trust/EnhancedFooter";
import { FadeInOnScroll } from "@/components/FadeInOnScroll";
import { Target, Heart, Shield, Lightbulb, Users, Globe } from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Security First",
    description: "Every decision we make prioritizes the security and privacy of patient data.",
  },
  {
    icon: Heart,
    title: "Patient-Centric",
    description: "We build for patients first, making healthcare records accessible and understandable.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We continuously improve our platform with cutting-edge technology and AI.",
  },
  {
    icon: Users,
    title: "Collaboration",
    description: "We work closely with healthcare providers to build solutions that truly work.",
  },
];

const milestones = [
  { year: "2022", event: "MediVault founded with a vision to digitize India's healthcare" },
  { year: "2023", event: "Launched beta with 10 partner hospitals" },
  { year: "2023", event: "Achieved HIPAA compliance certification" },
  { year: "2024", event: "Crossed 10,000+ active patients" },
  { year: "2024", event: "Expanded to 50+ healthcare institutions" },
];

export default function About() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-30" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInOnScroll>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Building Trust in{" "}
                <span className="gradient-text">Digital Healthcare</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                MediVault was born from a simple belief: every patient deserves secure, 
                instant access to their complete medical history. We're on a mission to 
                make that a reality for millions of Indians.
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
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-muted-foreground">
                  To empower every patient with secure, instant access to their complete 
                  medical history while enabling healthcare providers to deliver better, 
                  more informed care.
                </p>
              </div>
            </FadeInOnScroll>

            <FadeInOnScroll delay={100}>
              <div className="bg-card rounded-2xl p-8 border border-border/50 h-full">
                <div className="w-12 h-12 rounded-xl bg-trust/10 flex items-center justify-center mb-6">
                  <Globe className="h-6 w-6 text-trust" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
                <p className="text-muted-foreground">
                  A world where medical records seamlessly follow patients across healthcare 
                  providers, enabling better health outcomes and eliminating the stress of 
                  managing paper records.
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
              <h2 className="text-3xl font-bold text-center mb-8">Our Story</h2>
              <div className="prose prose-lg dark:prose-invert mx-auto text-muted-foreground">
                <p>
                  MediVault started when our founders experienced firsthand the frustration 
                  of managing medical records across multiple hospitals. Lost reports, 
                  repeated tests, and the anxiety of not having crucial health information 
                  when needed most—these were problems they knew affected millions of families.
                </p>
                <p className="mt-4">
                  In 2022, they set out to build a solution that would give patients control 
                  over their health data while maintaining the highest standards of security 
                  and privacy. Today, MediVault serves thousands of patients and healthcare 
                  providers across India.
                </p>
              </div>
            </div>
          </FadeInOnScroll>

          {/* Timeline */}
          <FadeInOnScroll delay={200}>
            <div className="max-w-2xl mx-auto mt-12">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                {milestones.map((milestone, index) => (
                  <div key={milestone.event} className="relative pl-12 pb-8 last:pb-0">
                    <div className="absolute left-0 w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="text-sm font-bold text-primary mb-1">{milestone.year}</div>
                    <p className="text-muted-foreground">{milestone.event}</p>
                  </div>
                ))}
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

      {/* Team Section */}
      <TeamSection />

      {/* Media Mentions */}
      <MediaMentions />

      <EnhancedFooter />
    </PublicLayout>
  );
}
