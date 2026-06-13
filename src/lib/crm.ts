import { supabase } from "@/integrations/supabase/client";

// Local types — schema added via migration; supabase types.ts does not yet include them.
export type Client = {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
};


export type Quote = {
  id: string;
  owner_id: string;
  client_id: string | null;
  aircraft_id: string | null;
  departure: string;
  arrival: string;
  departure_date: string;
  passengers: number;
  price: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  created_at: string;
};

export type Lead = {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  trip_type: "one-way" | "round-trip";
  departure: string | null;
  arrival: string | null;
  departure_date: string | null;
  return_date: string | null;
  passengers: number;
  aircraft_preference: string | null;
  budget: number;
  source: string | null;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  notes: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;
