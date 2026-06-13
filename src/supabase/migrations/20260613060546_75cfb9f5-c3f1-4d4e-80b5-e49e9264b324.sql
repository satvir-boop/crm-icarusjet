
-- CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clients" ON public.clients FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- AIRCRAFT
CREATE TABLE public.aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tail_number TEXT NOT NULL,
  model TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aircraft TO authenticated;
GRANT ALL ON public.aircraft TO service_role;
ALTER TABLE public.aircraft ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own aircraft" ON public.aircraft FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- QUOTES
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE SET NULL,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  departure_date DATE NOT NULL,
  passengers INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quotes" ON public.quotes FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- SEED DEMO DATA ON SIGNUP
CREATE OR REPLACE FUNCTION public.seed_demo_for_new_user()
RETURNS TRIGGER AS $$
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_seed_demo
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_demo_for_new_user();
