/**
 * The subscription plans this landing page advertises, read from the catalog.
 *
 * They used to be three literals here — Pro $20, Plus $100, Max $200 — copied
 * from commerce and correct on the day they were written. By the time anyone
 * looked, all three were wrong: Pro is $49, Max is $99, and Plus was retired
 * altogether. Every card links to hanzo.ai/pricing, so a visitor read one price
 * here and a different one the moment they clicked. That page's own comment
 * records the SAME class of failure happening once before, when Pro and Plus were
 * swapped.
 *
 * @hanzo/plans paints first (it ships in the bundle, so there is no blank strip)
 * and GET /v1/billing/plans replaces it on load. Both are the catalog; the live
 * read is just the fresher copy.
 */
import { subscriptionPlans } from '@hanzo/plans';
import { useEffect, useState } from 'react';

export interface LandingPlan {
  id: string;
  name: string;
  /** Rendered as-is: "$49", or "Custom" when the price is a conversation. */
  price: string;
  blurb: string;
  featured: boolean;
}

const API = `${import.meta.env.VITE_HANZO_API_URL || 'https://api.hanzo.ai'}/v1/billing/plans`;

/** Blurbs are marketing copy, not catalog data — keyed by slug so a new tier
 *  still renders (with the catalog's own description) rather than vanishing. */
const BLURBS: Record<string, string> = {
  free: 'To try it properly',
  go: 'To get started',
  pro: 'For everyday building',
  max: 'For power users & teams',
};

interface CatalogRow {
  slug: string;
  name: string;
  price: number | null;
  category: string;
  description?: string;
  popular?: boolean;
  contactSales?: boolean;
}

/** Cents from the wire, dollars on the page. Converted in ONE place. */
function toLanding(rows: CatalogRow[]): LandingPlan[] {
  return rows
    .filter((p) => p.category === 'personal' && !p.contactSales)
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    .map((p) => ({
      id: p.slug,
      name: p.name,
      price: p.price == null ? 'Custom' : `$${Math.round(p.price / 100)}`,
      blurb: BLURBS[p.slug] ?? p.description ?? '',
      featured: Boolean(p.popular),
    }));
}

export function useLandingPlans(): LandingPlan[] {
  const [plans, setPlans] = useState<LandingPlan[]>(() =>
    toLanding(
      (subscriptionPlans as unknown as { id: string; name: string; priceMonthly: number | null; category: string; description?: string; popular?: boolean; contactSales?: boolean }[]).map((p) => ({
        // The package publishes DOLLARS, the wire publishes CENTS; normalize to
        // the wire's shape so toLanding has one input to reason about.
        slug: p.id,
        name: p.name,
        price: p.priceMonthly == null ? null : Math.round(p.priceMonthly * 100),
        category: p.category,
        description: p.description,
        popular: p.popular,
        contactSales: p.contactSales,
      })),
    ),
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(API);
        if (!res.ok) return;
        const body = await res.json();
        const rows: CatalogRow[] = Array.isArray(body) ? body : (body?.plans ?? []);
        const next = toLanding(rows);
        if (alive && next.length) setPlans(next);
      } catch {
        /* keep the bundled catalog — a blank strip is worse than a stale one */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return plans;
}
