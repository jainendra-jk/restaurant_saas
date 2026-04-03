import type { SupabaseClient } from '@supabase/supabase-js';
import type { MenuConfig } from '../types/menu-config';

function slugifySegment(s: string): string {
  let x = s
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return x || 'item';
}

function mapSaveError(message: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('row-level security') || m.includes('new row violates')) {
    return 'Permission error while saving menu. Please sign in again and retry.';
  }
  return message;
}

export async function saveMenuConfigToSupabase(
  supabase: SupabaseClient,
  restaurantId: string,
  config: MenuConfig,
  existingBranding: Record<string, unknown>
): Promise<{ error: string | null }> {
  if (!config.categories?.length) {
    return { error: 'No categories to save' };
  }

  const currency = (config.currency ?? config.branding?.currency ?? 'Rs').trim() || 'Rs';
  const nextBranding = {
    ...existingBranding,
    tagline: config.branding.tagline,
    welcomeMessage: config.branding.welcomeMessage,
    orderNumberPrefix: config.branding.orderNumberPrefix,
  };

  const categories = config.categories.map((c, idx) => ({
    restaurant_id: restaurantId,
    slug: slugifySegment(c.id),
    name: c.name,
    sort_order: idx,
  }));

  const categorySlugCounts = new Map<string, number>();
  for (const c of categories) {
    categorySlugCounts.set(c.slug, (categorySlugCounts.get(c.slug) ?? 0) + 1);
  }
  const duplicateCategorySlug = Array.from(categorySlugCounts.entries()).find(([, count]) => count > 1)?.[0];
  if (duplicateCategorySlug) {
    return { error: `Duplicate category slug detected: ${duplicateCategorySlug}` };
  }

  const { error: upsertCategoriesErr } = await supabase
    .from('menu_categories')
    .upsert(categories, { onConflict: 'restaurant_id,slug' });
  if (upsertCategoriesErr) return { error: mapSaveError(upsertCategoriesErr.message) };

  const { data: persistedCategories, error: persistedCategoriesErr } = await supabase
    .from('menu_categories')
    .select('id, slug')
    .eq('restaurant_id', restaurantId);
  if (persistedCategoriesErr) return { error: mapSaveError(persistedCategoriesErr.message) };

  const categoryIdBySlug = new Map<string, string>();
  for (const row of persistedCategories ?? []) {
    const slug = String((row as { slug?: string }).slug ?? '');
    const id = String((row as { id?: string }).id ?? '');
    if (slug && id) categoryIdBySlug.set(slug, id);
  }

  for (const c of config.categories) {
    const catSlug = slugifySegment(c.id);
    const itemSlugCounts = new Map<string, number>();
    for (const it of c.items ?? []) {
      const slug = slugifySegment(it.id);
      itemSlugCounts.set(slug, (itemSlugCounts.get(slug) ?? 0) + 1);
    }
    const duplicateItemSlug = Array.from(itemSlugCounts.entries()).find(([, count]) => count > 1)?.[0];
    if (duplicateItemSlug) {
      return { error: `Duplicate item slug in category "${catSlug}": ${duplicateItemSlug}` };
    }
  }

  for (const c of config.categories) {
    const catSlug = slugifySegment(c.id);
    const categoryId = categoryIdBySlug.get(catSlug);
    if (!categoryId) return { error: `Missing category id for ${catSlug}` };

    const itemRows = (c.items ?? []).map((it, itemIdx) => ({
      category_id: categoryId,
      slug: slugifySegment(it.id),
      name: it.name,
      diet: it.diet,
      description: it.description ?? '',
      options: it.options ?? [],
      variants: it.variants?.length ? it.variants : [{ type: 'full' as const, price: 0 }],
      is_available: it.isAvailable ?? true,
      sort_order: itemIdx,
    }));

    if (itemRows.length) {
      const { error: upsertItemsErr } = await supabase
        .from('menu_items')
        .upsert(itemRows, { onConflict: 'category_id,slug' });
      if (upsertItemsErr) return { error: mapSaveError(upsertItemsErr.message) };
    }

    const incomingItemSlugs = itemRows.map((r) => String(r.slug));
    if (incomingItemSlugs.length) {
      const inClause = `(${incomingItemSlugs.map((s) => `"${s}"`).join(',')})`;
      const { error: deleteStaleItemsErr } = await supabase
        .from('menu_items')
        .delete()
        .eq('category_id', categoryId)
        .not('slug', 'in', inClause);
      if (deleteStaleItemsErr) return { error: mapSaveError(deleteStaleItemsErr.message) };
    } else {
      const { error: clearCategoryItemsErr } = await supabase
        .from('menu_items')
        .delete()
        .eq('category_id', categoryId);
      if (clearCategoryItemsErr) return { error: mapSaveError(clearCategoryItemsErr.message) };
    }
  }

  const incomingCategorySlugs = categories.map((c) => c.slug);
  if (incomingCategorySlugs.length) {
    const inClause = `(${incomingCategorySlugs.map((s) => `"${s}"`).join(',')})`;
    const { error: deleteStaleCategoriesErr } = await supabase
      .from('menu_categories')
      .delete()
      .eq('restaurant_id', restaurantId)
      .not('slug', 'in', inClause);
    if (deleteStaleCategoriesErr) return { error: mapSaveError(deleteStaleCategoriesErr.message) };
  }

  const { error: updateRestaurantErr } = await supabase
    .from('restaurants')
    .update({
      palette: config.palette,
      currency,
      branding: nextBranding,
      updated_at: new Date().toISOString(),
    })
    .eq('id', restaurantId);
  if (updateRestaurantErr) return { error: mapSaveError(updateRestaurantErr.message) };

  return { error: null };
}
