import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, BedDouble, Stethoscope, CreditCard } from "lucide-react";

export default function OverviewPage({ hospitalData }: { hospitalData: any }) {
  const [stats, setStats] = useState({
    totalPatients: 0,
    ipdAdmissions: 0,
    opdVisits: 0,
    pendingBills: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [hospitalData]);

  const fetchStats = async () => {
    if (!hospitalData?.id) return;

    try {
      const [patientsRes, ipdRes, opdRes, billsRes] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalData.id),
        supabase.from('ipd_admissions').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalData.id).eq('status', 'admitted'),
        supabase.from('opd_visits').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalData.id),
        supabase.from('billing').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalData.id).eq('payment_status', 'pending'),
      ]);

      setStats({
        totalPatients: patientsRes.count || 0,
        ipdAdmissions: ipdRes.count || 0,
        opdVisits: opdRes.count || 0,
        pendingBills: billsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statCards = [
    { title: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'text-blue-600' },
    { title: 'IPD Admissions', value: stats.ipdAdmissions, icon: BedDouble, color: 'text-green-600' },
    { title: 'OPD Visits (Today)', value: stats.opdVisits, icon: Stethoscope, color: 'text-purple-600' },
    { title: 'Pending Bills', value: stats.pendingBills, icon: CreditCard, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard Overview</h2>
        <p className="text-muted-foreground">Welcome to your hospital management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the navigation bar above to access different modules of the hospital management system.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
