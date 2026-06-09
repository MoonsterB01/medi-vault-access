import PublicLayout from "@/components/PublicLayout";
import SEO from "@/components/SEO";
import { Shield, Lock, Server, Eye, FileCheck, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeInOnScroll } from "@/components/FadeInOnScroll";
import { EnhancedFooter } from "@/components/trust/EnhancedFooter";

const securityPractices = [
  {
    icon: Lock,
    title: "Data Encryption",
    items: [
      "AES-256 encryption at rest (Supabase Storage)",
      "TLS for all data in transit",
      "Signed, time-limited URLs for file access",
      "Automated encrypted backups (managed by Supabase)",
    ],
  },
  {
    icon: Server,
    title: "Infrastructure",
    items: [
      "Hosted on Supabase managed cloud infrastructure",
      "Geographic redundancy via managed cloud",
      "Platform-level DDoS protection",
      "Continuous platform monitoring",
    ],
  },
  {
    icon: Eye,
    title: "Access Controls",
    items: [
      "Row-Level Security on every record",
      "Email + password authentication",
      "Family access via explicit, revocable consent",
      "Access audit logging",
    ],
  },
  {
    icon: FileCheck,
    title: "Privacy Practices",
    items: [
      "Aligned with India's DPDP Act principles",
      "Minimal data collection",
      "No selling of user data",
      "User-initiated data export & deletion",
    ],
  },
];

const faqItems = [
  {
    question: "Can MediVault employees see my medical records?",
    answer: "Access to production data is restricted to a small number of operators for support and incident response, and is logged. We do not claim a zero-knowledge architecture — please review our Privacy Policy for the full data access model.",
  },
  {
    question: "What happens if MediVault shuts down?",
    answer: "You always own your data. You can export your records at any time from Settings. In the unlikely event of shutdown, you'll receive advance notice and tools to migrate your data.",
  },
  {
    question: "Where is my data stored?",
    answer: "Data is stored on Supabase managed infrastructure. Region selection follows our hosting plan; please contact us if you have specific data-residency requirements.",
  },
  {
    question: "How do you handle data breaches?",
    answer: "We have an incident response process. In case of a security incident affecting user data, we will notify affected users without undue delay in line with applicable regulations.",
  },
  {
    question: "Is MediVault HIPAA / SOC 2 certified?",
    answer: "No. MediVault is not currently HIPAA, SOC 2, or ISO 27001 certified, and we do not represent ourselves as such. We're working toward a stronger compliance posture as the product matures.",
  },
];

export default function Security() {
  return (
    <PublicLayout>
      <SEO title="Security - How MediVault Protects Your Data" description="Discover MediVault's security practices: encryption, access controls, audit trails and DPDP-aligned safeguards for medical records." path="/security" />
      {/* Hero Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-30" />
        <div className="container mx-auto px-4 relative z-10">
          <FadeInOnScroll>
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-trust/10 text-trust mb-6">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Security Center</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Your Data Security is Our{" "}
                <span className="text-trust">Top Priority</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                We've built MediVault from the ground up with security and privacy at its core. 
                Learn how we protect your sensitive medical information.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild size="lg">
                  <a href="/privacy-policy">Read Privacy Policy</a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="mailto:security@medivault.in">Contact Security Team</a>
                </Button>
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Detailed Security Practices */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-center mb-12">Our Security Practices</h2>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {securityPractices.map((practice, index) => (
              <FadeInOnScroll key={practice.title} delay={index * 100}>
                <div className="bg-card rounded-2xl p-8 border border-border/50 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <practice.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">{practice.title}</h3>
                  </div>
                  <ul className="space-y-3">
                    {practice.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-trust flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Vulnerability Reporting */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <FadeInOnScroll>
            <div className="max-w-3xl mx-auto bg-gradient-to-br from-primary/5 to-trust/5 rounded-2xl p-8 border border-border/50 text-center">
              <AlertTriangle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Security Vulnerability Reporting</h2>
              <p className="text-muted-foreground mb-6">
                Found a security vulnerability? We appreciate responsible disclosure and will work with you to address it promptly.
              </p>
              <Button asChild>
                <a href="mailto:security@medivault.health">Report a Vulnerability</a>
              </Button>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Security FAQ */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-center mb-12">Security FAQ</h2>
          </FadeInOnScroll>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqItems.map((faq, index) => (
              <FadeInOnScroll key={faq.question} delay={index * 50}>
                <div className="bg-card rounded-xl p-6 border border-border/50">
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
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
