import { Linkedin, Mail, Shield } from "lucide-react";
import { FadeInOnScroll } from "../FadeInOnScroll";
import { Button } from "../ui/button";
import mrigankPhoto from "@/assets/team/mrigank.jpg";
import akshPhoto from "@/assets/team/aksh.jpg";
import aryavPhoto from "@/assets/team/aryav.jpg";

const teamMembers = [
  {
    name: "Mrigank Agarwal",
    role: "Co-Founder & CEO",
    photo: mrigankPhoto,
    email: "mrigankagarwal810@gmail.com",
    linkedin: "#",
  },
  {
    name: "Aksh Gaur",
    role: "Co-Founder & CTO",
    photo: akshPhoto,
    email: "akshgaur23@gmail.com",
    linkedin: "#",
  },
  {
    name: "Aryav Barmecha",
    role: "Chief Medical Officer",
    photo: aryavPhoto,
    linkedin: "#",
  },
];

export function TeamSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <FadeInOnScroll>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Meet Our Team</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The People Behind MediVault
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A team of healthcare professionals, security experts, and technologists committed to protecting your health data
            </p>
          </div>
        </FadeInOnScroll>

        {/* Core Team */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {teamMembers.map((member, index) => (
            <FadeInOnScroll key={member.name} delay={index * 100}>
              <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center group">
                {/* Photo */}
                <div className="w-28 h-28 rounded-full mx-auto mb-4 overflow-hidden group-hover:scale-105 transition-transform shadow-lg ring-4 ring-primary/20">
                  <img 
                    src={member.photo} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                <p className="text-primary font-medium text-sm mb-4">{member.role}</p>
                
                {/* Social links */}
                <div className="flex justify-center gap-2">
                  {member.email && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`mailto:${member.email}`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
