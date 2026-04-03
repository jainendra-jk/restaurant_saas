import type { SupabaseClient } from '@supabase/supabase-js';

const TABLE_STATUS_SNAPSHOT_KEY = 'tableStatusSnapshot';

type TableState = 'active' | 'inactive';

type BrandingPayload = Record<string, unknown> & {
  tableStatusSnapshot?: Record<string, TableState>;
};

export async function closeStoreAndDeactivateTables(
  client: SupabaseClient,
  restaurantId: string
): Promise<void> {
  const { data: restRow } = await client
    .from('restaurants')
    .select('branding')
    .eq('id', restaurantId)
    .maybeSingle()
    .throwOnError();

  const { data: tableRows } = await client
    .from('tables')
    .select('id, status')
    .eq('restaurant_id', restaurantId)
    .throwOnError();

  const snapshot: Record<string, TableState> = {};
  for (const row of tableRows ?? []) {
    if (!row.id) continue;
    snapshot[row.id] = row.status === 'active' ? 'active' : 'inactive';
  }

  const currentBranding =
    (restRow?.branding as BrandingPayload | null) && typeof restRow.branding === 'object'
      ? (restRow.branding as BrandingPayload)
      : {};
  const nextBranding: BrandingPayload = {
    ...currentBranding,
    [TABLE_STATUS_SNAPSHOT_KEY]: snapshot,
  };

  await client
    .from('restaurants')
    .update({ is_open: false, branding: nextBranding })
    .eq('id', restaurantId)
    .throwOnError();

  await client
    .from('tables')
    .update({ status: 'inactive' })
    .eq('restaurant_id', restaurantId)
    .throwOnError();
}

export async function openStore(
  client: SupabaseClient,
  restaurantId: string
): Promise<void> {
  const { data: restRow } = await client
    .from('restaurants')
    .select('branding')
    .eq('id', restaurantId)
    .maybeSingle()
    .throwOnError();

  const currentBranding =
    (restRow?.branding as BrandingPayload | null) && typeof restRow.branding === 'object'
      ? (restRow.branding as BrandingPayload)
      : {};

  const snapshot = currentBranding[TABLE_STATUS_SNAPSHOT_KEY];
  const restoreMap =
    snapshot && typeof snapshot === 'object'
      ? (snapshot as Record<string, TableState>)
      : {};

  const activeIds = Object.entries(restoreMap)
    .filter(([, status]) => status === 'active')
    .map(([tableId]) => tableId);

  const cleanedBranding: BrandingPayload = { ...currentBranding };
  delete cleanedBranding[TABLE_STATUS_SNAPSHOT_KEY];

  // Flip restaurant open first to avoid brief "active tables + closed store" reads.
  await client
    .from('restaurants')
    .update({ is_open: true, branding: cleanedBranding })
    .eq('id', restaurantId)
    .throwOnError();

  await client
    .from('tables')
    .update({ status: 'inactive' })
    .eq('restaurant_id', restaurantId)
    .throwOnError();

  if (activeIds.length > 0) {
    await client
      .from('tables')
      .update({ status: 'active' })
      .in('id', activeIds)
      .throwOnError();
  }
}

