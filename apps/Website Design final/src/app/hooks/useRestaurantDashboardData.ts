import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  table_id: string;
  tables: { number: number } | null;
  total: number;
  status: string;
  placed_at: string;
};

export type MenuItemRow = {
  id: string;
  name: string;
  slug: string;
  diet: string;
  description: string;
  is_available: boolean;
  category_id: string;
  menu_categories: { name: string; slug: string; restaurant_id: string } | null;
};

export type DashboardStats = {
  orderCount: number;
  revenueTotal: number;
  menuItemCount: number;
  tableCount: number;
  activeTableCount: number;
};

export function useRestaurantDashboardData(restaurantId: string | null) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!supabase || !restaurantId) {
      setStats(null);
      setRecentOrders([]);
      setMenuItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [countRes, totalsRes, recentRes, tablesRes, itemsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId),
        supabase.from("orders").select("total").eq("restaurant_id", restaurantId),
        supabase
          .from("orders")
          .select("id, order_number, customer_name, table_id, tables(number), total, status, placed_at")
          .eq("restaurant_id", restaurantId)
          .order("placed_at", { ascending: false })
          .limit(8),
        supabase.from("tables").select("id, status").eq("restaurant_id", restaurantId),
        supabase
          .from("menu_items")
          .select(
            "id, name, slug, diet, description, is_available, category_id, menu_categories!inner(name, slug, restaurant_id)",
          )
          .eq("menu_categories.restaurant_id", restaurantId),
      ]);

      if (countRes.error) throw countRes.error;
      if (totalsRes.error) throw totalsRes.error;
      if (recentRes.error) throw recentRes.error;
      if (tablesRes.error) throw tablesRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const revenueTotal = (totalsRes.data ?? []).reduce(
        (s, row: { total: number }) => s + Number(row.total ?? 0),
        0,
      );
      const tables = tablesRes.data ?? [];
      const items = (itemsRes.data ?? []) as MenuItemRow[];
      const activeTableCount = tables.filter((t) => t.status === "active").length;

      setStats({
        orderCount: countRes.count ?? 0,
        revenueTotal,
        menuItemCount: items.length,
        tableCount: tables.length,
        activeTableCount,
      });
      setRecentOrders((recentRes.data ?? []) as OrderRow[]);
      setMenuItems(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
      setStats(null);
      setRecentOrders([]);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!supabase || !restaurantId) return;
    const channel = supabase
      .channel(`website-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchAll();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchAll]);

  return { stats, recentOrders, menuItems, loading, error, refetch: fetchAll };
}
