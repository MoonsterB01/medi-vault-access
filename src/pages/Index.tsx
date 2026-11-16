import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { FileText, Lock, Clock, Search, ArrowRight, Users, CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import familyPassportImage from "@/assets/indian-family-health-passport.jpg";
import PublicLayout from "@/components/PublicLayout";
import SEO from "@/components/SEO";
import { EnhancedFooter } from "@/components/trust/EnhancedFooter";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { ChatAssistant } from "@/components/ChatAssistant";

export default function Index() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
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
      <SEO title="MediVault — A Health Passport for Your Family" description="Keep your family’s medical reports, prescriptions and scans together. Build a health record you can return to over time, one document at a time." path="/" />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "MediVault",
          "applicationCategory": "HealthApplication",
          "operatingSystem": "Web",
          "description": "A family-focused place to keep medical reports, prescriptions and scans together and find them over time.",
          "featureList": [
            "Organize medical documents",
            "Search saved records",
            "Manage family access"
          ]
        })}</script>
      </Helmet>
      <section aria-labelledby="home-title" className="relative isolate flex min-h-[680px] items-center overflow-hidden bg-muted lg:min-h-[720px]">
        <img
          src={familyPassportImage}
          alt="An Indian daughter and her father looking through health papers together at home"
          width={1600}
          height={1104}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[25%_center] sm:object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-background/60" />
        <div className="container mx-auto px-4 py-14">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold text-primary">A calmer way to keep family health records together</p>
            <h1 id="home-title" className="mb-6 max-w-xl text-4xl font-bold leading-tight text-foreground lg:text-5xl">
              A Health Passport for your family, one report at a time.
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-foreground">
              Keep prescriptions, test reports and scans together. Build a health record you can return to before the next doctor visit—without searching through chats, folders and scattered PDFs.
            </p>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="gap-2" onClick={handleGetStarted}>
                Start your Health Passport
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("health-passport")?.scrollIntoView({ behavior: "smooth" })}>
                Explore the vision
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-trust" />Family access is yours to manage</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-trust" />Encrypted in transit and at rest</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-4 border-t border-foreground/20 pt-4">
              <Button variant="link" className="h-auto p-0 text-foreground" onClick={() => navigate("/doctor-auth")}>Doctor Portal →</Button>
              <Button variant="link" className="h-auto p-0 text-foreground" onClick={() => navigate("/hospital-auth")}>Hospital Portal →</Button>
            </div>
          </div>
        </div>
      </section>

      <section id="health-passport" className="scroll-mt-20 border-b border-border py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">A health history that grows with your family.</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              What happened before should be easier to find when your family needs it again.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:gap-16">
            <div className="border-t-2 border-primary pt-5">
              <div className="mb-4 flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">The Health Passport</h3>
              </div>
              <p className="leading-relaxed text-muted-foreground">
                Today, MediVault helps keep a family member’s important reports, prescriptions and scans together in one place. Start with what you already have; add to the record as care continues.
              </p>
            </div>
            <div className="border-t-2 border-trust pt-5">
              <div className="mb-4 flex items-center gap-3">
                <Clock className="h-6 w-6 text-trust" />
                <h3 className="text-xl font-semibold">The Health Time Machine</h3>
              </div>
              <p className="leading-relaxed text-muted-foreground">
                Our longer-term vision is to make it easier to look back through a family’s saved records over time. Today, MediVault helps keep that record together and searchable—not diagnose or predict what comes next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Start with the records you already have.
            </h2>
            <p className="text-muted-foreground">
              One report is enough to begin building a more complete family health record.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Keep a report",
                description: "Save a photo or PDF of a prescription, test report, or scan.",
                icon: FileText,
              },
              {
                step: "02",
                title: "Keep it with the family",
                description: "Add records for the family member they belong to, with access you choose.",
                icon: Users,
              },
              {
                step: "03",
                title: "Return to it later",
                description: "Search your saved records when you need to revisit a report or prepare for a doctor visit.",
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
              Made for real family care
            </h2>
            <p className="text-muted-foreground">
              Because one person often ends up keeping everyone’s papers in order.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Lock,
                title: "Your records, your choice",
                description: "Choose who can access your records and change family access when you need to.",
              },
              {
                icon: FileText,
                title: "Less paper chasing",
                description: "Keep photos and PDFs together instead of searching across chats, folders, and devices.",
              },
              {
                icon: Clock,
                title: "A record to look back on",
                description: "Find saved documents again as your family’s health story continues.",
              },
              {
                icon: Users,
                title: "Care across generations",
                description: "Keep track of the records you help manage for children, parents, and loved ones.",
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
              <h3 className="font-semibold text-foreground mb-1">For your doctor conversations</h3>
              <p className="text-sm text-muted-foreground">
                MediVault helps organize documents; it does not diagnose, predict, or replace medical advice. Please speak with a qualified healthcare professional about medical decisions.
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
              Begin your family’s Health Passport with one report.
            </h2>
            <p className="text-muted-foreground mb-8">
              Keep the report you already have. Build the record over time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button size="lg" className="gap-2" onClick={handleGetStarted}>
              Start your Health Passport
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/how-it-works")}>
                See how it works
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your medical records remain yours to manage.
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
