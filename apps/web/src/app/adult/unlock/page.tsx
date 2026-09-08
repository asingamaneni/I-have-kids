import Link from "next/link";
import { sanitizeAdultReturnPath } from "@/lib/routes";

export default async function AdultUnlockPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const query = await searchParams;
  const next = sanitizeAdultReturnPath(query.next);
  if (!process.env.LEARNING_ADULT_PIN) return <main className="unlock-page"><section className="unlock-card"><p className="eyebrow">Adult workspace</p><h1>No PIN is configured.</h1><p>The local adult workspace is currently open. Set <code>LEARNING_ADULT_PIN</code> before starting the app to protect adult pages.</p><Link className="button button-primary" href={next}>Continue to adult view</Link></section></main>;
  return <main className="unlock-page"><form className="unlock-card" action={`/api/adult/unlock?next=${encodeURIComponent(next)}`} method="post"><p className="eyebrow">Adult workspace</p><h1>Open the evidence view</h1><p>Enter the local adult PIN. Child pages never receive answer contracts or adult analytics.</p><label>Adult PIN<input type="password" name="pin" inputMode="numeric" autoComplete="current-password" required autoFocus /></label>{query.error && <p className="error-note" role="alert">The PIN did not match.</p>}<button className="button button-primary" type="submit">Open adult view</button></form></main>;
}
