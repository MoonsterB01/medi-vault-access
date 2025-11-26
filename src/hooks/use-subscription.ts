import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  monthly_price: number;
  yearly_price: number;
  upload_limit: number;
  features: string[];
}

interface UserSubscription {
  id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  status: string;
  subscription_plans: SubscriptionPlan;
}

interface SubscriptionData {
  currentPlan: SubscriptionPlan | null;
  uploadsUsed: number;
  uploadsRemaining: number;
  canUpload: boolean;
  isLoading: boolean;
  billingCycle: 'monthly' | 'yearly';
  refresh: () => Promise<void>;
}

export function useSubscription(userId: string | undefined, patientId?: string): SubscriptionData {
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [uploadsUsed, setUploadsUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const fetchSubscriptionData = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch user's subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
        return;
      }

      const userSub = subscription as unknown as UserSubscription;
      
      if (userSub?.subscription_plans) {
        setCurrentPlan(userSub.subscription_plans);
        setBillingCycle(userSub.billing_cycle);
      } else {
        // Default to free plan if no subscription found
        const { data: freePlan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('name', 'free')
          .single();
        
        if (freePlan) {
          setCurrentPlan(freePlan as SubscriptionPlan);
        }
      }

      // Fetch document count for the patient
      if (patientId) {
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patientId);

        setUploadsUsed(count || 0);
      }
    } catch (error) {
      console.error('Error in useSubscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [userId, patientId]);

  const uploadsRemaining = currentPlan ? currentPlan.upload_limit - uploadsUsed : 0;
  const canUpload = uploadsRemaining > 0;

  return {
    currentPlan,
    uploadsUsed,
    uploadsRemaining,
    canUpload,
    isLoading,
    billingCycle,
    refresh: fetchSubscriptionData,
  };
}
