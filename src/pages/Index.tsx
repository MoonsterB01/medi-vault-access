import { Button } from "@/components/ui/button";
import { Shield, FileText, Lock, Clock, Search, ArrowRight, Users, CheckCircle, Zap, BarChart3, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import PublicLayout from "@/components/PublicLayout";
import { EnhancedFooter } from "@/components/trust/EnhancedFooter";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { ChatAssistant } from "@/components/ChatAssistant";
import { usePublicStats, formatStatNumber } from "@/hooks/usePublicStats";
import { Skeleton } from "@/components/ui/skeleton";

export default function Index() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const stats = usePublicStats();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase.from("users").select("role").eq("id", authUser.id).single();
        setUser(userData);
      }
    };
    checkUser();
  }, []);

  const handleTryNow = () => {
    navigate("/patient-dashboard");
  };

  const handleGetStarted = () => {
    if (user) {
      if (user.role === "hospital_staff" || user.role === "admin") {
        navigate("/hospital-dashboard");
      } else {
        navigate("/patient-dashboard");
      }
    } else {
      navigate("/auth");
    }
  };

  return (
    <PublicLayout>
      {/* Hero Section - Clean, Professional */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="max-w-xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                AI-Powered Document Analysis
              </div>

              {/* Headline */}
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
                Your Medical History, Intelligently Organized
              </h1>

              {/* Subheadline */}
              <p className="text-lg text-muted-foreground mb-8">
                Stop searching through WhatsApp, folders, and scattered PDFs. Keep all your family's medical records in one secure place and find them in seconds.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Button size="lg" className="gap-2" onClick={handleGetStarted}>
                  Start Your Health Analysis
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/how-it-works")}>
                  View Demo
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-trust" />
                  Private & Secure
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-trust" />
                  Bank-level Encryption
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-trust" />
                  Free to Start
                </span>
              </div>

              {/* Portal Links */}
              <div className="flex gap-4 mt-6 pt-6 border-t border-border">
                <Button
                  variant="link"
                  className="text-muted-foreground hover:text-primary p-0 h-auto"
                  onClick={() => navigate("/doctor-auth")}
                >
                  Doctor Portal →
                </Button>
                <Button
                  variant="link"
                  className="text-muted-foreground hover:text-primary p-0 h-auto"
                  onClick={() => navigate("/hospital-auth")}
                >
                  Hospital Portal →
                </Button>
              </div>
            </div>

            {/* Right: Product Mockup */}
            <div className="relative hidden lg:block">
              <div className="bg-muted/50 rounded-2xl p-8 border border-border">
                <div className="bg-background rounded-xl shadow-sm border border-border overflow-hidden">
                  {/* Mock Dashboard Header */}
                  <div className="bg-primary/5 px-4 py-3 border-b border-border flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive/60" />
                      <div className="w-3 h-3 rounded-full bg-warning/60" />
                      <div className="w-3 h-3 rounded-full bg-trust/60" />
                    </div>
                    <div className="flex-1 bg-muted rounded-md h-6" />
                  </div>
                  {/* Mock Content */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                        <div className="h-3 bg-muted/60 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-trust/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-trust" />
                      </div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-2/3 mb-1" />
                        <div className="h-3 bg-muted/60 rounded w-2/5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Search className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-4/5 mb-1" />
                        <div className="h-3 bg-muted/60 rounded w-3/5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: stats.isLoading ? null : formatStatNumber(stats.documentsCount), label: "Documents Organized", icon: FileText },
              { value: stats.isLoading ? null : formatStatNumber(stats.patientsCount), label: "Families Trust Us", icon: Users },
              { value: "99.9%", label: "Uptime", icon: BarChart3 },
              { value: stats.isLoading ? null : formatStatNumber(stats.hospitalsCount || 4), label: "Healthcare Partners", icon: CheckCircle },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-2">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                {stat.value === null ? (
                  <Skeleton className="h-8 w-16 mx-auto mb-1" />
                ) : (
                  <div className="text-2xl lg:text-3xl font-bold text-foreground">{stat.value}</div>
                )}
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How Medilock Works
            </h2>
            <p className="text-muted-foreground">
              Three simple steps to organize all your family's medical records
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Upload Documents",
                description: "Take a photo or upload PDFs of prescriptions, test reports, or any medical document.",
                icon: FileText,
              },
              {
                step: "02",
                title: "Auto-Organize",
                description: "Our AI automatically categorizes and tags your documents for easy retrieval.",
                icon: Zap,
              },
              {
                step: "03",
                title: "Find Instantly",
                description: "Search by name, date, or type. Access your records anytime, from any device.",
                icon: Search,
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-card rounded-xl p-6 border border-border h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Built for Security & Simplicity
            </h2>
            <p className="text-muted-foreground">
              Everything you need to manage your family's health records
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Lock,
                title: "Your Data is Private",
                description: "We never share or sell your information. Your data belongs to you.",
              },
              {
                icon: FileText,
                title: "Easy Organization",
                description: "AI-powered categorization keeps everything organized automatically.",
              },
              {
                icon: Clock,
                title: "Always Available",
                description: "Access your records anytime, anywhere, from any device.",
              },
              {
                icon: Users,
                title: "Family Sharing",
                description: "Securely share access with family members or doctors when needed.",
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-card p-6 rounded-xl border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <section className="py-8 bg-warning/10 border-y border-warning/20">
        <div className="container mx-auto px-4">
          <div className="flex items-start gap-4 max-w-3xl mx-auto">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Medical Disclaimer</h3>
              <p className="text-sm text-muted-foreground">
                Medilock is a document organization tool and does not provide medical advice, diagnosis, or treatment. 
                Always consult with qualified healthcare professionals for medical decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to organize your family's medical records?
            </h2>
            <p className="text-muted-foreground mb-8">
              Start for free. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button size="lg" className="gap-2" onClick={handleTryNow}>
                Try Now — No Signup
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleGetStarted}>
                <Shield className="mr-2 h-4 w-4" />
                Create Free Account
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Free plan includes 50 documents • Upgrade anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <EnhancedFooter />
      
      {/* Assistants */}
      <VoiceAssistant />
      <ChatAssistant />
    </PublicLayout>
  );
}
