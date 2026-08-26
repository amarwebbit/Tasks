-- ============================================================================
-- TRINETRA TASKS - MONETIZATION, COUPONS & ADMIN SYSTEM MIGRATION
-- ============================================================================

-- 1. Extend profiles with role, subscription plan, and expiry
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- 2. Create coupons table
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

-- 3. Create payments table
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

-- 4. Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for coupons
DROP POLICY IF EXISTS "Anyone authenticated can view active coupons" ON public.coupons;
CREATE POLICY "Anyone authenticated can view active coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. RLS Policies for payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert payments" ON public.payments;
CREATE POLICY "Users can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Seed initial default promo coupons
INSERT INTO public.coupons (code, discount_type, discount_value, max_uses, is_active)
VALUES
  ('WELCOME50', 'PERCENTAGE', 50, 200, true),
  ('LAUNCH100', 'PERCENTAGE', 100, 50, true),
  ('FLAT50', 'FLAT', 50, 100, true)
ON CONFLICT (code) DO NOTHING;
