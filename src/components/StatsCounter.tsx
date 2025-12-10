import { FileText, Users, Hospital, Clock } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import { FadeInOnScroll } from "./FadeInOnScroll";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  documentsCount: number;
  patientsCount: number;
  hospitalsCount: number;
}

export function StatsCounter() {
  const [stats, setStats] = useState<Stats>({
    documentsCount: 0,
    patientsCount: 0,
    hospitalsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [documentsRes, patientsRes, hospitalsRes] = await Promise.all([
          supabase.from("documents").select("id", { count: "exact", head: true }),
          supabase.from("patients").select("id", { count: "exact", head: true }),
          supabase.from("hospitals").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          documentsCount: documentsRes.count || 0,
          patientsCount: patientsRes.count || 0,
          hospitalsCount: hospitalsRes.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statItems = [
    {
      icon: FileText,
      value: stats.documentsCount,
      suffix: "+",
      label: "Records Secured",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Users,
      value: stats.patientsCount,
      suffix: "+",
      label: "Happy Patients",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      icon: Hospital,
      value: stats.hospitalsCount,
      suffix: "+",
      label: "Healthcare Providers",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Clock,
      value: 99.9,
      suffix: "%",
      label: "Uptime Guarantee",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 animated-gradient opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        <FadeInOnScroll>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">
              Trusted by Thousands
            </h2>
            <p className="text-muted-foreground">
              Join the growing community of healthcare providers and patients
            </p>
          </div>
        </FadeInOnScroll>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {statItems.map((stat, index) => (
            <FadeInOnScroll key={stat.label} delay={index * 100}>
              <div className="text-center group">
                <div
                  className={`${stat.bgColor} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div className="text-4xl font-bold mb-1">
                  {loading ? (
                    <span className="animate-pulse">—</span>
                  ) : (
                    <AnimatedCounter
                      value={stat.value}
                      suffix={stat.suffix}
                      duration={2500}
                    />
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
