-- ============================================================================
-- TRINETRA TASKS - MONETIZATION, COUPONS & ADMIN SYSTEM MIGRATION
-- ============================================================================

-- 1. Extend profiles with role, subscription plan, and expiry
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- 2. Ensure profiles can be read by public/anon for admin stats & member lookups
DROP POLICY IF EXISTS "Profiles select" ON public.profiles;
CREATE POLICY "Profiles select" ON public.profiles FOR SELECT TO public USING (true);

-- 3. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FLAT')),
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  payment_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  plan TEXT NOT NULL,
  coupon_code TEXT,
  discount_applied NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'CREATED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Set RLS on coupons and payments
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 6. Clean, open RLS Policies for coupons (Backend endpoints enforce x-admin-key)
DROP POLICY IF EXISTS "Anyone can view coupons" ON public.coupons;
DROP POLICY IF EXISTS "Anyone authenticated can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;

CREATE POLICY "Anyone can view and manage coupons"
  ON public.coupons FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 7. RLS Policies for payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;

CREATE POLICY "Anyone can manage payments"
  ON public.payments FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 8. Seed initial default promo coupons
INSERT INTO public.coupons (code, discount_type, discount_value, max_uses, is_active)
VALUES
  ('WELCOME50', 'PERCENTAGE', 50, 200, true),
  ('LAUNCH100', 'PERCENTAGE', 100, 50, true),
  ('FLAT50', 'FLAT', 50, 100, true)
ON CONFLICT (code) DO UPDATE 
SET discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    is_active = true;
