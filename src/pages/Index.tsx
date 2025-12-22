import { Button } from "@/components/ui/button";
import { Shield, Users, FileText, Lock, Clock, Search, ArrowRight, Heart } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import PublicLayout from "@/components/PublicLayout";
import { TrustBadges } from "@/components/TrustBadges";
import { FadeInOnScroll } from "@/components/FadeInOnScroll";
import { DataSecurityVisual } from "@/components/trust/DataSecurityVisual";
import { TeamSection } from "@/components/trust/TeamSection";
import { EnhancedFooter } from "@/components/trust/EnhancedFooter";
import { TrustedBySection } from "@/components/trust/TrustedBySection";
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

  const handleTryNow = () => {
    navigate("/public-upload");
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
      {/* Hero Section with animated background */}
      <header className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 animated-gradient" />

        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float-slow" />

        <div className="container mx-auto px-4 py-20 text-center relative z-10">
          {/* Logo with animation */}
          <div className="flex justify-center mb-6 opacity-0 animate-fade-in">
            <div className="relative">
              <img src={logo} alt="Medilock Logo" className="h-24 w-24 object-contain animate-float" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-soft" />
            </div>
          </div>

          {/* Title with gradient */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 opacity-0 animate-fade-in animate-delay-100">
            <span className="gradient-text">Medilock</span>
          </h1>

          {/* Main Tagline */}
          <div className="opacity-0 animate-fade-in animate-delay-200">
            <p className="text-xl md:text-2xl text-foreground font-medium mb-3 max-w-3xl mx-auto">
              Stop searching WhatsApp, folders, and PDFs for medical reports.
            </p>
            <p className="text-lg md:text-xl text-primary font-semibold mb-4">
              Keep them in one place. Find them in seconds.
            </p>
            <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto">
              A simple way for families to organize medical documents.
              <br />
              No medical advice. No pressure. No spam.
            </p>
          </div>

          {/* CTA Buttons with animations */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in animate-delay-300">
            <Button
              size="lg"
              className="px-8 py-3 group relative overflow-hidden animate-pulse-glow"
              onClick={handleTryNow}
            >
              <span className="relative z-10 flex items-center gap-2">
                Try with one report — no signup
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3 hover-lift"
              onClick={() => navigate("/how-it-works")}
            >
              See how it works
            </Button>
          </div>

          {/* Portal Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 opacity-0 animate-fade-in animate-delay-400">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/doctor-auth")}
            >
              Doctor Portal
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/hospital-auth")}
            >
              Hospital Portal
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="mt-6 text-sm text-muted-foreground opacity-0 animate-fade-in animate-delay-400">
            Medilock does not provide medical advice.
          </p>
        </div>
      </header>

      {/* Trusted By Section with human imagery */}
      <TrustedBySection />

      {/* Features for Families Section */}
      <section className="container mx-auto px-4 py-16">
        <FadeInOnScroll>
          <h2 className="text-3xl font-bold text-center mb-4">Designed for Indian Families</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Whether you're managing your children's health records, caring for elderly parents, or tracking long-term treatments.
          </p>
        </FadeInOnScroll>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FadeInOnScroll delay={0}>
            <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border border-border/50 text-center">
              <div className="bg-blue-500/10 p-4 rounded-xl mx-auto w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Upload Any Document</h3>
              <p className="text-muted-foreground">
                PDFs, images, prescriptions, test reports — all in one secure place.
              </p>
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll delay={150}>
            <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border border-border/50 text-center">
              <div className="bg-purple-500/10 p-4 rounded-xl mx-auto w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <Search className="h-10 w-10 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Find in Seconds</h3>
              <p className="text-muted-foreground">
                Simple search by name, date, or label. No more digging through folders.
              </p>
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll delay={300}>
            <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border border-border/50 text-center">
              <div className="bg-emerald-500/10 p-4 rounded-xl mx-auto w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Share with Family</h3>
              <p className="text-muted-foreground">
                Grant access to family members or doctors when needed.
              </p>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Trust Badges Section */}
      <TrustBadges />

      {/* Data Security Visual */}
      <DataSecurityVisual />

      {/* How It Works Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-center mb-12">How Medilock Works</h2>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: 1,
                title: "Upload Your Documents",
                desc: "Take a photo or upload PDFs of prescriptions, test reports, or any medical document.",
              },
              {
                step: 2,
                title: "Add a Label (Optional)",
                desc: "Tag it as 'Blood Test', 'Prescription', 'X-Ray' or anything that helps you remember.",
              },
              {
                step: 3,
                title: "Find It Anytime",
                desc: "Search by filename or label. Access your records from any device, anywhere.",
              },
            ].map((item, index) => (
              <FadeInOnScroll key={item.step} delay={index * 150}>
                <div className="text-center group">
                  <div className="relative mx-auto mb-6 w-20 h-20">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
                    <div className="relative bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl font-bold text-primary">{item.step}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <TeamSection />

      {/* Key Features Section */}
      <section className="container mx-auto px-4 py-16">
        <FadeInOnScroll>
          <h2 className="text-3xl font-bold text-center mb-12">Simple & Secure</h2>
        </FadeInOnScroll>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Lock,
              title: "Your Data is Private",
              desc: "We never share or sell your information",
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
            {
              icon: FileText,
              title: "Easy Organization",
              desc: "Label and organize documents your way",
              color: "text-purple-500",
              bg: "bg-purple-500/10",
            },
            {
              icon: Clock,
              title: "Always Available",
              desc: "Access your records anytime, anywhere",
              color: "text-orange-500",
              bg: "bg-orange-500/10",
            },
            {
              icon: Users,
              title: "Family Sharing",
              desc: "Grant secure access to family members",
              color: "text-emerald-500",
              bg: "bg-emerald-500/10",
            },
          ].map((feature, index) => (
            <FadeInOnScroll key={feature.title} delay={index * 100}>
              <div className="bg-card p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group border border-border/50">
                <div
                  className={`${feature.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-30" />
        <FadeInOnScroll>
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to organize your family's medical records?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Start with just one document. No signup required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button size="lg" className="px-10 py-4 text-lg animate-pulse-glow" onClick={handleTryNow}>
                Try with one report — no signup
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleGetStarted}>
                <Shield className="mr-2 h-5 w-5" />
                Sign up for free
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No credit card required • Free plan available • No spam
            </p>
          </div>
        </FadeInOnScroll>
      </section>

      {/* Enhanced Footer */}
      <EnhancedFooter />
      
      {/* ElevenLabs Voice Assistant - Only on home page */}
      <VoiceAssistant />
      
      {/* Chat Assistant - Only on home page */}
      <ChatAssistant />
    </PublicLayout>
  );
}
