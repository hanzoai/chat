import { useState, useEffect, useCallback } from 'react';
import { OGDialog, OGDialogTemplate, Button } from '@hanzochat/client';
import { useAnalytics } from '@hanzo/event/react';
import { EVENTS } from '@hanzo/event';
import { LOGIN_REQUIRED, startHanzoLogin, takePendingLogin, type LoginReason } from '~/utils/login';
import { useLocalize, type TranslationKeys } from '~/hooks';

/**
 * Where a reader who is ready to pay goes. No price is repeated here: the plans
 * page reads the billing catalog, and a number copied into a dialog is a number
 * that cannot know when the catalog moves.
 */
const PLANS_URL = 'https://hanzo.ai/pricing';

/** Copy per reason the gate opened. */
const copy: Record<LoginReason, { title: TranslationKeys; message: TranslationKeys }> = {
  limit: {
    title: 'com_auth_login_limit_title',
    message: 'com_auth_login_limit_message',
  },
  anonymous: {
    title: 'com_auth_login_anonymous_title',
    message: 'com_auth_login_anonymous_message',
  },
  // The signed-out preview itself was refused, so there is no anonymous product
  // behind this gate to explain away. Saying so beats what used to happen: the
  // marketing page rendered with no composer and no reason given.
  unavailable: {
    title: 'com_auth_login_unavailable_title',
    message: 'com_auth_login_unavailable_message',
  },
};

/**
 * The ONE login gate for a visitor who is not signed in. It stands in for the
 * raw server error a refused chat request would otherwise render as a reply, and
 * offers the existing OpenID / Hanzo IAM login — it does not implement a new one.
 *
 * Opens on the `loginRequired` window event (see `requireLogin`), dispatched by
 * the chat submission path on a `402 { type: 'GUEST_LIMIT' }` (free preview quota
 * spent) or a `401` (not signed in).
 */
export default function LoginGate() {
  /** A refusal that landed before this mounted is still news. Rendering it consumes it. */
  const [reason, setReason] = useState<LoginReason | null>(takePendingLogin);
  const localize = useLocalize();
  const analytics = useAnalytics();

  /**
   * The gate is the highest-intent moment this product has — someone spent the
   * preview and asked for more — and it emitted nothing, so the step from
   * "wanted more" to "made an account" could not be measured at all.
   *
   * It rides FEATURE_USED with the moment in a property rather than under a name
   * of its own. That is what keeps the event taxonomy a closed set: a new name
   * per surface is how a taxonomy stops being one.
   */
  useEffect(() => {
    if (reason !== null) {
      analytics.capture(EVENTS.FEATURE_USED, { feature: 'login_gate', reason });
    }
  }, [reason, analytics]);

  useEffect(() => {
    const handler = (event: Event) => {
      takePendingLogin();
      const detail = (event as CustomEvent<{ reason?: LoginReason }>).detail;
      setReason(detail?.reason ?? 'anonymous');
    };
    window.addEventListener(LOGIN_REQUIRED, handler);
    return () => window.removeEventListener(LOGIN_REQUIRED, handler);
  }, []);

  const handleLogin = useCallback(() => {
    analytics.capture(EVENTS.FEATURE_USED, { feature: 'login_gate', reason, action: 'account' });
    startHanzoLogin();
  }, [analytics, reason]);

  const handlePlans = useCallback(() => {
    analytics.capture(EVENTS.PLAN_CLICKED, { cta: 'login_gate' });
  }, [analytics]);

  const { title, message } = copy[reason ?? 'anonymous'];

  return (
    // Escape and overlay clicks are ignored, deliberately: this gate renders a
    // REFUSAL (the request already failed), so "dismissing" it would leave the
    // visitor on a product that cannot answer them, with no explanation.
    <OGDialog open={reason !== null} onOpenChange={() => {}}>
      <OGDialogTemplate
        title={localize(title)}
        className="max-w-md"
        main={
          <div className="text-sm text-text-secondary">
            {localize(message)}
            {/* Only where the visitor has actually used the product. Someone who
                spent the preview has a reason to weigh a plan; someone who never
                got a reply has not earned the question yet, and asking anyway is
                how a gate starts reading as a toll booth. */}
            {reason === 'limit' && (
              <a
                href={PLANS_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePlans}
                className="mt-3 block underline underline-offset-4 hover:no-underline"
              >
                {localize('com_auth_login_plans')}
              </a>
            )}
          </div>
        }
        /* The template volunteers a Cancel button unless told not to, and it
           renders BESIDE whatever `buttons` say. Every reason here is a refusal
           with nothing behind it to go back to, so this gate names its own one
           exit and declines the volunteered dismissal. */
        showCancelButton={false}
        buttons={
          <Button variant="submit" onClick={handleLogin}>
            {localize('com_auth_login_button')}
          </Button>
        }
      />
    </OGDialog>
  );
}
