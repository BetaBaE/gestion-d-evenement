import { useImperativeHandle, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { useTurnstileConfig } from './turnstileConfig.js';

/**
 * Cloudflare Turnstile bot check. Invisible unless Cloudflare needs an
 * interaction (then a single checkbox). Renders nothing when the check is off.
 *
 * Tokens are single-use: the parent calls `ref.current.reset()` after every
 * failed submission to get a fresh one. Expired tokens are renewed
 * automatically (refreshExpired: 'auto'); `onExpire` lets the parent forget
 * the old one in the meantime.
 *
 * Props: action ('login' | 'inscription'), onToken(token), onExpire(), onError(),
 * theme ('light' | 'dark' | 'auto').
 */
export function TurnstileField({ ref, action, onToken, onExpire, onError, theme = 'auto' }) {
  const widgetRef = useRef(null);
  const { loading, enabled, siteKey, misconfigured } = useTurnstileConfig();

  useImperativeHandle(ref, () => ({
    reset: () => widgetRef.current?.reset(),
  }));

  if (loading || !enabled) return null;
  if (misconfigured) {
    return (
      <div role="alert" style={{ color: '#c92a2a', fontSize: 13 }}>
        Vérification anti-robot non configurée (clé du site manquante). Contactez l’administrateur.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <Turnstile
        ref={widgetRef}
        siteKey={siteKey}
        options={{
          action,
          appearance: 'interaction-only',
          theme,
          language: 'fr',
          refreshExpired: 'auto',
          size: 'flexible',
        }}
        onSuccess={(token) => onToken?.(token)}
        onExpire={() => onExpire?.()}
        onTimeout={() => onExpire?.()}
        onError={() => onError?.()}
        onUnsupported={() => onError?.()}
      />
    </div>
  );
}
