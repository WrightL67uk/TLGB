import 'server-only';
import { db } from '@/lib/supabase';

/** Whether the homepage shows the coming soon / waiting list page. On unless switched off in admin. */
export async function comingSoon(): Promise<boolean> {
  try {
    const { data, error } = await db().from('site_settings').select('value').eq('key', 'launch').maybeSingle();
    if (error || !data) return true;
    return (data.value as { coming_soon?: boolean })?.coming_soon !== false;
  } catch {
    return true;
  }
}

export async function setComingSoon(on: boolean) {
  return db().from('site_settings').upsert({ key: 'launch', value: { coming_soon: on }, updated_at: new Date().toISOString() });
}
