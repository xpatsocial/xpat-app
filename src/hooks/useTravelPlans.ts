import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { TravelPlan, TravelOverlap } from '../types';

export function useTravelPlans() {
  const { user } = useAuth();
  const [myPlans, setMyPlans] = useState<TravelPlan[]>([]);
  const [overlaps, setOverlaps] = useState<TravelOverlap[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!user) {
      setMyPlans([]);
      setOverlaps([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('arrives_at', { ascending: true });

    if (data) setMyPlans(data);
    setLoading(false);
  }, [user]);

  const fetchOverlaps = useCallback(async () => {
    if (!user) {
      setOverlaps([]);
      return;
    }

    const { data } = await supabase.rpc('find_travel_overlaps', {
      p_user_id: user.id,
    });

    if (data) setOverlaps(data as TravelOverlap[]);
  }, [user]);

  useEffect(() => {
    fetchPlans();
    fetchOverlaps();
  }, [fetchPlans, fetchOverlaps]);

  async function addPlan(
    city: string,
    country: string,
    arrives_at: string,
    departs_at?: string | null,
  ) {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase.from('travel_plans').insert({
      user_id: user.id,
      city,
      country,
      arrives_at,
      departs_at: departs_at || null,
    });

    if (!error) {
      await fetchPlans();
      await fetchOverlaps();
    }

    return { error };
  }

  async function removePlan(planId: string) {
    const { error } = await supabase
      .from('travel_plans')
      .delete()
      .eq('id', planId);

    if (!error) {
      setMyPlans((prev) => prev.filter((p) => p.id !== planId));
      await fetchOverlaps();
    }

    return { error };
  }

  /** Find overlaps for a specific other user (used on profile screens) */
  async function getOverlapsWithUser(otherUserId: string): Promise<TravelOverlap[]> {
    if (!user) return [];

    const { data } = await supabase.rpc('find_travel_overlaps', {
      p_user_id: user.id,
    });

    if (!data) return [];
    return (data as TravelOverlap[]).filter(
      (o) => o.other_user_id === otherUserId,
    );
  }

  return {
    myPlans,
    overlaps,
    loading,
    addPlan,
    removePlan,
    getOverlapsWithUser,
    refresh: () => {
      fetchPlans();
      fetchOverlaps();
    },
  };
}
