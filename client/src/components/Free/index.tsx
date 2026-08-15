import { useCallback, useEffect, useState } from 'react';
import { FREE_MODEL, freeCopy, grantConsent } from '@hanzo/ai';
import { OGDialog, OGDialogTemplate, Button } from '@hanzochat/client';
import { useGetStartupConfig } from '~/data-provider';
import { useAuthContext, useSetIndexOptions } from '~/hooks';
import { useChatContext } from '~/Providers';
import { HANZO_ENDPOINT, isHanzoEndpoint } from '~/utils';
import {
  FREE_CONSENT,
  FREE_OFFERED,
  askConsent,
  rememberSwitch,
  type ConsentDetail,
  type Offer,
} from '~/utils/free';

/**
 * Free-tier consent, taken once. A free call shares data with the provider that
 * serves it, so nothing is served free until this is agreed; the record is
 * versioned with the terms and lives in `localStorage`.
 *
 * Opens on the `freeConsent` window event (see `askConsent`), which carries the
 * work waiting on the answer — the guest send being held, or the move to free a
 * visitor just approved. Agreeing runs it; declining runs nothing.
 */
export function Consent() {
  const [proceed, setProceed] = useState<(() => void) | null>(null);
  const { data: config } = useGetStartupConfig();
  const terms = config?.interface?.termsOfService?.externalUrl;

  useEffect(() => {
    const handler = (event: Event) => {
      const { proceed: held } = (event as CustomEvent<ConsentDetail>).detail;
      /* a state setter reads a bare function as an updater, so the held work
         goes in behind one */
      setProceed(() => held);
    };
    window.addEventListener(FREE_CONSENT, handler);
    return () => window.removeEventListener(FREE_CONSENT, handler);
  }, []);

  const agree = useCallback(() => {
    grantConsent(window.localStorage);
    proceed?.();
    setProceed(null);
  }, [proceed]);

  return (
    <OGDialog open={proceed !== null} onOpenChange={(open) => !open && setProceed(null)}>
      <OGDialogTemplate
        title={freeCopy.consentTitle}
        className="max-w-md"
        main={
          <div className="space-y-3 text-sm text-text-secondary">
            <p>{freeCopy.consentBody}</p>
            <ul className="list-disc space-y-1 pl-5">
              {freeCopy.consentPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p>
              {terms != null ? (
                <a
                  className="underline hover:text-text-primary"
                  href={terms}
                  target="_blank"
                  rel="noreferrer"
                >
                  {freeCopy.termsText}
                </a>
              ) : (
                freeCopy.termsText
              )}
            </p>
          </div>
        }
        /* The volunteered cancel is localized; these words are the ones every
           Hanzo surface shows for this decision, so the dialog names both. */
        showCancelButton={false}
        buttons={
          <>
            <Button variant="outline" onClick={() => setProceed(null)}>
              {freeCopy.consentCancelCta}
            </Button>
            <Button variant="submit" onClick={agree}>
              {freeCopy.consentAgreeCta}
            </Button>
          </>
        }
      />
    </OGDialog>
  );
}

/**
 * The calm answer to a paid model that cannot serve, in the two shapes that
 * takes: `keep` — the gateway already answered on free, so the reply is on
 * screen and the offer is to stay there; `switch` — the paid route failed
 * outright, so moving to free also resends the message. Neither is ever taken
 * without approval.
 *
 * Opens on the `freeOffered` window event. The errored reply stays in the thread
 * underneath, so dismissing leaves the conversation readable rather than blank.
 */
export function Notice() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [resend, setResend] = useState<string | null>(null);
  const { isGuest } = useAuthContext();
  const { conversation, latestMessage, regenerate } = useChatContext();
  const { setOption } = useSetIndexOptions();

  const onFree = conversation?.model === FREE_MODEL;

  useEffect(() => {
    const handler = (event: Event) =>
      setOffer((event as CustomEvent<{ offer: Offer }>).detail.offer);
    window.addEventListener(FREE_OFFERED, handler);
    return () => window.removeEventListener(FREE_OFFERED, handler);
  }, []);

  /* A send reads the conversation as it stood when it was built, so the resend
     waits for the move to land rather than racing it. */
  useEffect(() => {
    if (resend == null || !onFree) {
      return;
    }
    setResend(null);
    regenerate({ parentMessageId: resend });
  }, [resend, onFree, regenerate]);

  const approve = useCallback(() => {
    askConsent(() => {
      rememberSwitch();
      setOffer(null);
      if (!isHanzoEndpoint(conversation?.endpoint)) {
        setOption('endpoint')(HANZO_ENDPOINT);
      }
      setOption('model')(FREE_MODEL);
      /* `keep` already has its reply on screen; only a failed turn is resent. */
      if (offer === 'switch') {
        setResend(latestMessage?.parentMessageId ?? null);
      }
    });
  }, [offer, conversation?.endpoint, latestMessage?.parentMessageId, setOption]);

  /* A guest is already on free and pays for nothing, so there is no paid route
     to fall back FROM and nothing here to offer them. */
  if (offer == null || isGuest) {
    return null;
  }

  return (
    <div className="mx-auto mb-2 w-full max-w-3xl px-4">
      <div className="rounded-xl border border-border-medium bg-surface-secondary p-4 text-sm text-text-primary">
        <p className="font-medium">{freeCopy.paidTitle}</p>
        <p className="mt-1 text-text-secondary">
          {offer === 'keep' ? freeCopy.fallbackBody : freeCopy.paidBody}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="submit" onClick={approve}>
            {offer === 'keep' ? freeCopy.keepCta : freeCopy.switchCta}
          </Button>
          <Button variant="outline" onClick={() => setOffer(null)}>
            {freeCopy.dismissCta}
          </Button>
        </div>
      </div>
    </div>
  );
}
