import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PlanCard } from "@/components/PlanCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  monthly_price: number;
  yearly_price: number;
  upload_limit: number;
  features: string[];
}

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlanName, setCurrentPlanName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
    fetchCurrentPlan();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true });

      if (error) throw error;
      
      // Cast features from Json to string[]
      const plansWithFeatures = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : []
      })) as Plan[];
      
      setPlans(plansWithFeatures);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('subscription_plans(name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscription) {
        const planData = subscription as any;
        setCurrentPlanName(planData.subscription_plans?.name || '');
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
    }
  };

  const handlePlanSelect = (planName: string) => {
    if (planName === 'free') {
      navigate('/patient');
      return;
    }

    toast({
      title: "Coming Soon",
      description: "Payment integration will be available soon. Please contact support to upgrade your plan.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Secure your medical records with the perfect plan for your needs
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'outline'}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'outline'}
              onClick={() => setBillingCycle('yearly')}
              className="relative"
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 10%
              </span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              name={plan.name}
              displayName={plan.display_name}
              monthlyPrice={plan.monthly_price}
              yearlyPrice={plan.yearly_price}
              uploadLimit={plan.upload_limit}
              features={plan.features}
              billingCycle={billingCycle}
              isCurrentPlan={plan.name === currentPlanName}
              isPopular={plan.name === 'standard'}
              onSelect={() => handlePlanSelect(plan.name)}
            />
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>All plans include secure document storage and AI-powered analysis</p>
          <p className="mt-2">Need help choosing? <a href="/contact" className="text-primary hover:underline">Contact us</a></p>
        </div>
      </div>
    </div>
  );
}
