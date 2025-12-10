import { Shield, Lock, Cloud, CheckCircle, Award } from "lucide-react";
import { FadeInOnScroll } from "./FadeInOnScroll";

const badges = [
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Healthcare data protection standards",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Lock,
    title: "256-bit Encryption",
    description: "Bank-level security for all data",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Cloud,
    title: "Cloud Secured",
    description: "Enterprise-grade infrastructure",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: CheckCircle,
    title: "99.9% Uptime",
    description: "Reliable access to your records",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

export function TrustBadges() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <FadeInOnScroll>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-trust/10 text-trust mb-4">
              <Award className="h-4 w-4" />
              <span className="text-sm font-medium">Trusted & Secure</span>
            </div>
            <h2 className="text-3xl font-bold mb-3">
              Your Data Security is Our Priority
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We employ industry-leading security measures to protect your sensitive medical information
            </p>
          </div>
        </FadeInOnScroll>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {badges.map((badge, index) => (
            <FadeInOnScroll key={badge.title} delay={index * 100}>
              <div className="group bg-card rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
                <div
                  className={`${badge.bgColor} w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <badge.icon className={`h-7 w-7 ${badge.color}`} />
                </div>
                <h3 className="font-semibold mb-1">{badge.title}</h3>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}