CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  trip_type TEXT NOT NULL DEFAULT 'one-way',
  departure TEXT,
  arrival TEXT,
  departure_date DATE,
  return_date DATE,
  passengers INTEGER NOT NULL DEFAULT 1,
  aircraft_preference TEXT,
  budget NUMERIC NOT NULL DEFAULT 0,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own leads" ON public.leads
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.seed_demo_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c1 UUID; c2 UUID; c3 UUID; c4 UUID; c5 UUID;
  a1 UUID; a2 UUID; a3 UUID; a4 UUID;
BEGIN
  INSERT INTO public.clients (owner_id, name, email, phone, company, notes) VALUES
    (NEW.id, 'James Whitfield', 'james@whitfieldcap.com', '+1 212 555 0142', 'Whitfield Capital', 'Prefers Gulfstream. Allergic to nuts.') RETURNING id INTO c1;
  INSERT INTO public.clients (owner_id, name, email, phone, company, notes) VALUES
    (NEW.id, 'Sofia Marchetti', 'sofia@marchetti.it', '+39 02 5550 8821', 'Marchetti Group', 'Frequent Milan–Nice routes.') RETURNING id INTO c2;
  INSERT INTO public.clients (owner_id, name, email, phone, company, notes) VALUES
    (NEW.id, 'Alexander Volkov', 'av@volkovholdings.com', '+971 4 555 7711', 'Volkov Holdings', 'VIP. Always books catering.') RETURNING id INTO c3;
  INSERT INTO public.clients (owner_id, name, email, phone, company, notes) VALUES
    (NEW.id, 'Priya Anand', 'priya@anandventures.in', '+91 22 5550 6610', 'Anand Ventures', 'New client – referred by Whitfield.') RETURNING id INTO c4;
  INSERT INTO public.clients (owner_id, name, email, phone, company, notes) VALUES
    (NEW.id, 'David Chen', 'dchen@meridianfund.com', '+1 415 555 0199', 'Meridian Fund', 'Often last-minute requests.') RETURNING id INTO c5;

  INSERT INTO public.aircraft (owner_id, tail_number, model, capacity, hourly_rate, status) VALUES
    (NEW.id, 'N812JX', 'Gulfstream G650', 14, 11500, 'available') RETURNING id INTO a1;
  INSERT INTO public.aircraft (owner_id, tail_number, model, capacity, hourly_rate, status) VALUES
    (NEW.id, 'N441AB', 'Bombardier Global 7500', 17, 12800, 'in-use') RETURNING id INTO a2;
  INSERT INTO public.aircraft (owner_id, tail_number, model, capacity, hourly_rate, status) VALUES
    (NEW.id, 'N220CX', 'Cessna Citation Longitude', 12, 6800, 'available') RETURNING id INTO a3;
  INSERT INTO public.aircraft (owner_id, tail_number, model, capacity, hourly_rate, status) VALUES
    (NEW.id, 'N705DA', 'Dassault Falcon 8X', 16, 9900, 'maintenance') RETURNING id INTO a4;

  INSERT INTO public.quotes (owner_id, client_id, aircraft_id, departure, arrival, departure_date, passengers, price, status) VALUES
    (NEW.id, c1, a1, 'New York (KTEB)', 'London (EGGW)', CURRENT_DATE + 7, 6, 92000, 'sent'),
    (NEW.id, c2, a3, 'Milan (LIML)', 'Nice (LFMN)', CURRENT_DATE + 3, 4, 18500, 'accepted'),
    (NEW.id, c3, a2, 'Dubai (OMDB)', 'Geneva (LSGG)', CURRENT_DATE + 14, 10, 138000, 'draft'),
    (NEW.id, c4, a1, 'Mumbai (VABB)', 'Singapore (WSSS)', CURRENT_DATE + 21, 8, 78500, 'draft'),
    (NEW.id, c5, a3, 'San Francisco (KSFO)', 'Aspen (KASE)', CURRENT_DATE + 2, 5, 24800, 'accepted'),
    (NEW.id, c1, a2, 'Teterboro (KTEB)', 'Palm Beach (KPBI)', CURRENT_DATE - 4, 4, 16200, 'rejected');

  INSERT INTO public.leads (owner_id, name, email, phone, company, trip_type, departure, arrival, departure_date, return_date, passengers, aircraft_preference, budget, source, status, notes) VALUES
    (NEW.id, 'Eleanor Hayes', 'eleanor.hayes@hayesco.com', '+1 305 555 0188', 'Hayes & Co', 'round-trip', 'Miami (KMIA)', 'New York (KTEB)', CURRENT_DATE + 10, CURRENT_DATE + 14, 4, 'Light Jet', 45000, 'Website', 'new', 'Family trip. Needs pet-friendly cabin.'),
    (NEW.id, 'Hiroshi Tanaka', 'h.tanaka@tanakaholdings.jp', '+81 3 5550 2244', 'Tanaka Holdings', 'one-way', 'Tokyo (RJTT)', 'Honolulu (PHNL)', CURRENT_DATE + 30, NULL, 8, 'Heavy Jet', 180000, 'Referral', 'qualified', 'Corporate retreat. Catering required.'),
    (NEW.id, 'Isabella Romano', 'isabella@romanoluxury.com', '+39 06 5550 4477', 'Romano Luxury', 'round-trip', 'Rome (LIRA)', 'Ibiza (LEIB)', CURRENT_DATE + 5, CURRENT_DATE + 8, 6, 'Midsize Jet', 32000, 'Instagram', 'contacted', 'Wedding party. VIP service.'),
    (NEW.id, 'Marcus Bennett', 'mbennett@bennettcap.com', '+44 20 5550 9988', 'Bennett Capital', 'one-way', 'London (EGGW)', 'Geneva (LSGG)', CURRENT_DATE + 2, NULL, 3, 'Light Jet', 18000, 'Cold Call', 'new', 'Urgent business meeting.'),
    (NEW.id, 'Fatima Al-Rashid', 'fatima@alrashidgroup.ae', '+971 2 5550 6633', 'Al-Rashid Group', 'round-trip', 'Abu Dhabi (OMAA)', 'Maldives (VRMM)', CURRENT_DATE + 45, CURRENT_DATE + 52, 10, 'Heavy Jet', 220000, 'Referral', 'qualified', 'Annual vacation. Repeat inquiry.');

  RETURN NEW;
END;
$function$;