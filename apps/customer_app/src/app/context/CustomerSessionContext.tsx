import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import { useParams, useSearchParams } from 'react-router';
import { supabase } from '../../lib/supabase';

export interface CustomerSession {
  slug: string | null;
  tableNum: number | null;
  tableId: string | null;
  ready: boolean;
}

const CustomerSessionContext = createContext<CustomerSession | null>(null);

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const params = useParams<{ slug?: string; tableNum?: string; restaurantSlug?: string; tableNumber?: string }>();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<CustomerSession>({
    slug: null,
    tableNum: null,
    tableId: null,
    ready: false,
  });

  useEffect(() => {
    const slug = params.restaurantSlug ?? params.slug ?? searchParams.get('r');
    const tableParam = params.tableNumber ?? params.tableNum ?? searchParams.get('t');
    const tableNum = tableParam ? parseInt(tableParam, 10) : null;
    const validNum = tableNum != null && !isNaN(tableNum) && tableNum > 0;

    if (!slug || !validNum || !supabase) {
      setSession({ slug: slug || null, tableNum: validNum ? tableNum : null, tableId: null, ready: true });
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: rest } = await supabase.from('restaurants').select('id').eq('slug', slug).maybeSingle();
      if (cancelled || !rest) {
        setSession({ slug, tableNum, tableId: null, ready: true });
        return;
      }
      const { data: tbl } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', rest.id)
        .eq('number', tableNum)
        .maybeSingle();
      setSession({
        slug,
        tableNum,
        tableId: tbl?.id ?? null,
        ready: true,
      });
    })();
    return () => { cancelled = true; };
  }, [params.restaurantSlug, params.tableNumber, params.slug, params.tableNum, searchParams]);

  const value = useMemo(
    () => session,
    [session.slug, session.tableNum, session.tableId, session.ready]
  );

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession(): CustomerSession {
  const ctx = useContext(CustomerSessionContext);
  return ctx ?? { slug: null, tableNum: null, tableId: null, ready: true };
}
