import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const getAdminSupabase = () => {
  const key = serviceRoleKey && serviceRoleKey !== 'your-service-role-key-here' ? serviceRoleKey : supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function GET(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    const systemAdminKey = process.env.ADMIN_SECRET_KEY || 'TRINETRA_ADMIN_2026';
    if (adminKey !== systemAdminKey) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const supabase = getAdminSupabase();

    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, coupons });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    const systemAdminKey = process.env.ADMIN_SECRET_KEY || 'TRINETRA_ADMIN_2026';
    if (adminKey !== systemAdminKey) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const body = await req.json();
    const { code, discount_type, discount_value, max_uses, expires_at } = body;

    if (!code || !discount_type || discount_value === undefined) {
      return NextResponse.json({ error: 'Missing required coupon parameters' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const supabase = getAdminSupabase();

    const { data: newCoupon, error } = await supabase
      .from('coupons')
      .insert({
        code: cleanCode,
        discount_type,
        discount_value: Number(discount_value),
        max_uses: max_uses ? Number(max_uses) : 100,
        expires_at: expires_at || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, coupon: newCoupon });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create coupon' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key');
    const systemAdminKey = process.env.ADMIN_SECRET_KEY || 'TRINETRA_ADMIN_2026';
    if (adminKey !== systemAdminKey) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing coupon ID' }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { error } = await supabase.from('coupons').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete coupon' }, { status: 500 });
  }
}
