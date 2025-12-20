import { Shield, Lock, Database, Cloud, FileCheck } from "lucide-react";
import { FadeInOnScroll } from "../FadeInOnScroll";

const securityLayers = [
  {
    icon: Lock,
    title: "Secure Storage",
    description: "Your files are protected with strong encryption",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "We never look at, share, or sell your data",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Database,
    title: "Reliable Backup",
    description: "Your documents are safely backed up",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Cloud,
    title: "Access Control",
    description: "Only you decide who can see your files",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
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
              <span className="text-sm font-medium">Your Privacy Matters</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How We Keep Your Data Safe
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Simple security you can trust — no complicated jargon
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
                  <p className="text-xs text-muted-foreground">You upload your document</p>
                </div>
                
                <div className="text-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-trust/10 border-2 border-trust/30 flex items-center justify-center mx-auto mb-3">
                    <Lock className="h-8 w-8 text-trust" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">2. Protect</h4>
                  <p className="text-xs text-muted-foreground">We encrypt it securely</p>
                </div>
                
                <div className="text-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center mx-auto mb-3">
                    <Database className="h-8 w-8 text-purple-500" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">3. Store</h4>
                  <p className="text-xs text-muted-foreground">Safely kept in the cloud</p>
                </div>
                
                <div className="text-center relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center mx-auto mb-3">
                    <Cloud className="h-8 w-8 text-orange-500" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">4. Access</h4>
                  <p className="text-xs text-muted-foreground">Only you can view it</p>
                </div>
              </div>
            </div>
          </FadeInOnScroll>
        </div>

        {/* Security features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
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
      </div>
    </section>
  );
}
