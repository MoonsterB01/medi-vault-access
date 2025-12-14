import { Shield, Lock, Server, Key, Eye, FileCheck, Database, Cloud } from "lucide-react";
import { FadeInOnScroll } from "../FadeInOnScroll";

const securityLayers = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "AES-256 encryption for data at rest and TLS 1.3 for data in transit",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Key,
    title: "Zero-Knowledge Architecture",
    description: "Your encryption keys are never stored on our servers",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Server,
    title: "SOC 2 Type II Certified",
    description: "Annual third-party security audits and penetration testing",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Eye,
    title: "Role-Based Access Control",
    description: "Granular permissions ensure only authorized users see your data",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

const complianceItems = [
  { label: "HIPAA", description: "US Healthcare Compliance" },
  { label: "GDPR", description: "EU Data Protection" },
  { label: "ISO 27001", description: "Information Security" },
  { label: "DISHA", description: "India Digital Health" },
];

export function DataSecurityVisual() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-trust/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <FadeInOnScroll>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-trust/10 text-trust mb-4">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Security First Architecture</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How We Protect Your Data
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Multiple layers of security ensure your medical records remain private and protected
            </p>
          </div>
        </FadeInOnScroll>

        {/* Security flow visualization */}
        <div className="max-w-5xl mx-auto mb-16">
          <FadeInOnScroll delay={100}>
            <div className="relative bg-card rounded-2xl border border-border/50 p-8 shadow-lg">
              {/* Flow diagram */}
              <div className="grid md:grid-cols-4 gap-6 relative">
                {/* Connection lines (hidden on mobile) */}
                <div className="hidden md:block absolute top-1/2 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/20 via-trust/40 to-primary/20 -translate-y-1/2" />
                
                <div className="text-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-3">
                    <FileCheck className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">1. Upload</h4>
                  <p className="text-xs text-muted-foreground">Document encrypted locally before upload</p>
                </div>
                
                <div className="text-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-trust/10 border-2 border-trust/30 flex items-center justify-center mx-auto mb-3">
                    <Lock className="h-8 w-8 text-trust" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">2. Transit</h4>
                  <p className="text-xs text-muted-foreground">TLS 1.3 encrypted connection</p>
                </div>
                
                <div className="text-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center mx-auto mb-3">
                    <Database className="h-8 w-8 text-purple-500" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">3. Storage</h4>
                  <p className="text-xs text-muted-foreground">AES-256 encrypted at rest</p>
                </div>
                
                <div className="text-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center mx-auto mb-3">
                    <Cloud className="h-8 w-8 text-orange-500" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">4. Access</h4>
                  <p className="text-xs text-muted-foreground">Role-based permissions & audit logs</p>
                </div>
              </div>
            </div>
          </FadeInOnScroll>
        </div>

        {/* Security features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 max-w-5xl mx-auto">
          {securityLayers.map((layer, index) => (
            <FadeInOnScroll key={layer.title} delay={150 + index * 100}>
              <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow group">
                <div className={`${layer.bgColor} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <layer.icon className={`h-6 w-6 ${layer.color}`} />
                </div>
                <h3 className="font-semibold mb-2">{layer.title}</h3>
                <p className="text-sm text-muted-foreground">{layer.description}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>

        {/* Compliance badges */}
        <FadeInOnScroll delay={500}>
          <div className="bg-muted/30 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-center font-semibold mb-6">Compliance & Certifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {complianceItems.map((item) => (
                <div key={item.label} className="text-center p-4 bg-card rounded-xl border border-border/50">
                  <div className="text-2xl font-bold text-primary mb-1">{item.label}</div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeInOnScroll>
      </div>
    </section>
  );
}
