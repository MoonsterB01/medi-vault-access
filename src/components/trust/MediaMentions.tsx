import { FadeInOnScroll } from "../FadeInOnScroll";
import { ExternalLink, Award } from "lucide-react";

const mediaMentions = [
  {
    source: "Economic Times",
    title: "Top 10 HealthTech Startups to Watch",
    year: "2024",
  },
  {
    source: "YourStory",
    title: "Securing India's Medical Records",
    year: "2024",
  },
  {
    source: "Inc42",
    title: "Digital Health Innovation Award",
    year: "2024",
  },
];

const awards = [
  { title: "Best HealthTech Solution", event: "Digital India Awards 2024" },
  { title: "Security Excellence", event: "CII Health Summit" },
  { title: "Innovation Award", event: "NASSCOM Healthcare" },
];

export function MediaMentions() {
  return (
    <section className="py-16 border-t border-border/50">
      <div className="container mx-auto px-4">
        <FadeInOnScroll>
          <div className="text-center mb-10">
            <h3 className="text-xl font-semibold mb-2">Recognition & Media</h3>
            <p className="text-sm text-muted-foreground">Featured in leading publications</p>
          </div>
        </FadeInOnScroll>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Media Mentions */}
          <FadeInOnScroll delay={100}>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                As Seen In
              </h4>
              {mediaMentions.map((mention) => (
                <div 
                  key={mention.source} 
                  className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-colors group cursor-pointer"
                >
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">{mention.source}</p>
                    <p className="text-sm text-muted-foreground">{mention.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{mention.year}</span>
                </div>
              ))}
            </div>
          </FadeInOnScroll>

          {/* Awards */}
          <FadeInOnScroll delay={200}>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Awards & Recognition
              </h4>
              {awards.map((award) => (
                <div 
                  key={award.title} 
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-trust/5 rounded-xl border border-border/50"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{award.title}</p>
                    <p className="text-sm text-muted-foreground">{award.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeInOnScroll>
        </div>
      </div>
    </section>
  );
}
