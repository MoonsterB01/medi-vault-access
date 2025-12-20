import { Shield, Lock, Cloud, Users, Heart } from "lucide-react";
import { FadeInOnScroll } from "./FadeInOnScroll";

const badges = [
  {
    icon: Lock,
    title: "Your Data is Private",
    description: "We never share or sell your information",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Shield,
    title: "You're in Control",
    description: "Only you decide who sees your files",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Cloud,
    title: "Simple & Secure",
    description: "Your documents are safely stored online",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Users,
    title: "Always Available",
    description: "Access your records anytime, anywhere",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

export function TrustBadges() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <FadeInOnScroll>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-trust/10 text-trust mb-4">
              <Heart className="h-4 w-4" />
              <span className="text-sm font-medium">Built for Families</span>
            </div>
            <h2 className="text-3xl font-bold mb-3">
              Your Trust is Our Priority
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Simple, secure, and designed with Indian families in mind
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
