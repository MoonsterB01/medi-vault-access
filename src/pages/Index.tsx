import { Button } from "@/components/ui/button";
import { Shield, Users, Hospital, FileText, Lock, Clock, Bell, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import PublicLayout from "@/components/PublicLayout";
import { TrustBadges } from "@/components/TrustBadges";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { StatsCounter } from "@/components/StatsCounter";
import { FadeInOnScroll } from "@/components/FadeInOnScroll";
import { PartnerLogos } from "@/components/trust/PartnerLogos";
import { DataSecurityVisual } from "@/components/trust/DataSecurityVisual";
import { EnhancedFooter } from "@/components/trust/EnhancedFooter";
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

  const handleHospitalPortal = () => {
    if (user && (user.role === "hospital_staff" || user.role === "admin")) {
      navigate("/hospital-dashboard");
    } else {
      navigate("/auth");
    }
  };

  const handlePatientPortal = () => {
    if (user && user.role === "patient") {
      navigate("/patient-dashboard");
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
              <img src={logo} alt="MediVault Logo" className="h-24 w-24 object-contain animate-float" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-soft" />
            </div>
          </div>

          {/* Title with gradient */}
          <h1 className="text-5xl md:text-6xl font-bold mb-4 opacity-0 animate-fade-in animate-delay-100">
            <span className="gradient-text">MediVault</span>
          </h1>

          {/* Tagline with typing effect simulation */}
          <div className="opacity-0 animate-fade-in animate-delay-200">
            <p className="text-xl md:text-2xl text-muted-foreground mb-2 max-w-2xl mx-auto">
              Secure Digital Medical Records Management
            </p>
            <p className="text-lg text-muted-foreground/80 mb-8 max-w-xl mx-auto">
              For Hospitals, Doctors, and Patients
            </p>
          </div>

          {/* CTA Buttons with animations */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in animate-delay-300">
            <Button
              size="lg"
              className="px-8 py-3 group relative overflow-hidden animate-pulse-glow"
              onClick={handleGetStarted}
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3 hover-lift"
              onClick={() => navigate("/how-it-works")}
            >
              How It Works
            </Button>
          </div>

          {/* Portal buttons */}
          <div className="flex flex-wrap gap-3 justify-center mt-6 opacity-0 animate-fade-in animate-delay-400">
            <Button variant="secondary" size="sm" className="hover-scale" onClick={() => navigate("/doctor-auth")}>
              <Sparkles className="h-4 w-4 mr-2" />
              Doctor Portal
            </Button>
            <Button variant="secondary" size="sm" className="hover-scale" onClick={() => navigate("/hospital-auth")}>
              <Hospital className="h-4 w-4 mr-2" />
              Hospital Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Partner Logos */}
      <PartnerLogos />

      {/* Stats Counter Section */}
      <StatsCounter />

      {/* For Hospitals & Patients Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <FadeInOnScroll delay={0}>
            <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border border-border/50">
              <div className="flex items-center mb-6">
                <div className="bg-blue-500/10 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300">
                  <Hospital className="h-10 w-10 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold">For Hospitals</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Securely upload, manage, and share patient medical records with automated notifications and audit
                trails.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  { icon: Lock, text: "HIPAA-compliant security" },
                  { icon: FileText, text: "Automated report uploads" },
                  { icon: Bell, text: "Real-time notifications" },
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center opacity-0 animate-fade-in"
                    style={{ animationDelay: `${(i + 1) * 100}ms`, animationFillMode: "forwards" }}
                  >
                    <item.icon className="h-5 w-5 text-trust mr-3" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full group/btn" onClick={handleHospitalPortal}>
                Hospital Portal
                <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </div>
          </FadeInOnScroll>

          <FadeInOnScroll delay={150}>
            <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border border-border/50">
              <div className="flex items-center mb-6">
                <div className="bg-purple-500/10 p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-10 w-10 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold">For Patients</h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Access your complete medical history in a secure timeline view with family sharing capabilities.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  { icon: Clock, text: "Timeline view of records" },
                  { icon: Users, text: "Family access sharing" },
                  { icon: Shield, text: "Secure document access" },
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center opacity-0 animate-fade-in"
                    style={{ animationDelay: `${(i + 1) * 100}ms`, animationFillMode: "forwards" }}
                  >
                    <item.icon className="h-5 w-5 text-trust mr-3" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full group/btn" onClick={handlePatientPortal}>
                Patient Portal
                <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
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
            <h2 className="text-3xl font-bold text-center mb-12">How MediVault Works</h2>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: 1,
                title: "Secure Upload",
                desc: "Hospitals upload patient reports directly to secure cloud storage with automated categorization.",
              },
              {
                step: 2,
                title: "Instant Notification",
                desc: "Patients and authorized family members receive immediate notifications of new records.",
              },
              {
                step: 3,
                title: "Access Anywhere",
                desc: "View complete medical timeline with severity-based organization and secure document access.",
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

      {/* Testimonials Section */}
      <TestimonialsCarousel />

      {/* Key Features Section */}
      <section className="container mx-auto px-4 py-16">
        <FadeInOnScroll>
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        </FadeInOnScroll>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Lock,
              title: "Bank-Level Security",
              desc: "End-to-end encryption with role-based access control",
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
            {
              icon: FileText,
              title: "Document Management",
              desc: "Organize by type, date, and severity for easy access",
              color: "text-purple-500",
              bg: "bg-purple-500/10",
            },
            {
              icon: Bell,
              title: "Smart Notifications",
              desc: "Email and SMS alerts for critical updates",
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Secure Your Medical Records?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join 10,000+ healthcare providers and patients who trust MediVault with their medical data
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button size="lg" className="px-10 py-4 text-lg animate-pulse-glow" onClick={handleGetStarted}>
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/security")}>
                <Shield className="mr-2 h-5 w-5" />
                View Security Details
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No credit card required • Free plan available • HIPAA compliant
            </p>
          </div>
        </FadeInOnScroll>
      </section>

      {/* Enhanced Footer */}
      <EnhancedFooter />
    </PublicLayout>
  );
}
