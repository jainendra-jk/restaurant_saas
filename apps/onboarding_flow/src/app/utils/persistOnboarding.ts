import { supabase } from '../../lib/supabase';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export interface OnboardingFormData {
  restaurantName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  fssaiNumber: string;
  tables: string;
  username: string;
  password: string;
  domain: string;
}

export async function persistOnboardingToSupabase(
  formData: OnboardingFormData
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const slug = slugify(formData.restaurantName) || 'restaurant-' + Date.now();
  const tableCount = Math.min(50, Math.max(1, parseInt(formData.tables, 10) || 5));

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
  });
  if (authErr) return { error: authErr.message };
  const userId = authData.user?.id;
  if (!userId) return { error: 'Sign up failed' };

  const { data: restaurant, error: restErr } = await supabase
    .from('restaurants')
    .insert({
      slug,
      name: formData.restaurantName,
      branding: {
        tagline: '',
        welcomeMessage: 'Welcome back',
        orderNumberPrefix: '#',
        address: [formData.address, formData.city, formData.state, formData.pincode].filter(Boolean).join(', '),
        currency: 'Rs',
      },
    })
    .select('id')
    .single();
  if (restErr) return { error: restErr.message };
  if (!restaurant?.id) return { error: 'Failed to create restaurant' };

  const { error: profileErr } = await supabase.from('staff_profiles').insert({
    user_id: userId,
    restaurant_id: restaurant.id,
    role: 'owner',
  });
  if (profileErr) return { error: profileErr.message };

  const tables = Array.from({ length: tableCount }, (_, i) => ({
    restaurant_id: restaurant.id,
    number: i + 1,
    status: 'inactive',
    seats: i % 3 === 0 ? 6 : i % 3 === 1 ? 4 : 2,
  }));
  const { error: tablesErr } = await supabase.from('tables').insert(tables);
  if (tablesErr) return { error: tablesErr.message };

  return { error: null };
}
