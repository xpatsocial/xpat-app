import React, { createContext, useContext, useEffect, useRef } from 'react';
import { setIdentifyFn, setPostHogClient, setCaptureFn } from './analytics';

// ---------------------------------------------------------------------------
// PostHog analytics — graceful no-op when the API key is missing or when
// posthog-react-native is not installed. This lets the app compile and run in
// every environment while still collecting events in production.
// ---------------------------------------------------------------------------

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// ---- lightweight client wrapper ----

interface PostHogClient {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
}

const noopClient: PostHogClient = {
  capture: () => {},
  identify: () => {},
  reset: () => {},
};

let _client: PostHogClient = noopClient;
let _rawClient: any = null;

async function initPostHog(): Promise<PostHogClient> {
  if (!POSTHOG_API_KEY) return noopClient;

  try {
    // Dynamic import so the app compiles even if posthog-react-native is not
    // installed yet.  `require()` is evaluated at bundle time in Metro so we
    // use a try/catch to swallow the error gracefully.
    const PostHog = require('posthog-react-native');
    const client = await PostHog.PostHog.initAsync(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });
    _rawClient = client;
    const wrappedClient: PostHogClient = {
      capture: (event, props) => client.capture(event, props),
      identify: (id, props) => client.identify(id, props),
      reset: () => client.reset(),
    };
    // Set the module-level client for the fire-and-forget track() helper
    _client = wrappedClient;
    // Wire the raw client into the centralized analytics module
    setPostHogClient(client);
    setCaptureFn((event, props) => client.capture(event, props));
    setIdentifyFn((id, props) => client.identify(id, props));
    return wrappedClient;
  } catch {
    // posthog-react-native not installed — fall back to no-op
    return noopClient;
  }
}

// ---- React context + provider ----

const PostHogContext = createContext<PostHogClient>(noopClient);

export function usePostHog(): PostHogClient {
  return useContext(PostHogContext);
}

/**
 * Wrap the app with `<PostHogProvider>` to initialise analytics once.
 * Safe to render even without an API key — everything becomes a no-op.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = React.useState<PostHogClient>(noopClient);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initPostHog().then(setClient);
  }, []);

  return React.createElement(PostHogContext.Provider, { value: client }, children);
}

// ---- Convenience fire-and-forget helper (works outside React trees) ----

/**
 * Track an event. If PostHog is not yet initialised the call is silently
 * dropped — no crash, no queued replay.
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  _client.capture(event, properties);
}

/**
 * Call once after the PostHog client is ready so that the module-level
 * `track()` helper works outside of React components.
 */
export function _setModuleClient(c: PostHogClient): void {
  _client = c;
}

/**
 * Opt the user out of PostHog tracking (GDPR decline / settings toggle).
 * All future capture calls become no-ops.
 */
export function optOutPostHog(): void {
  if (_rawClient && typeof _rawClient.optOut === 'function') {
    _rawClient.optOut();
  }
}

/**
 * Opt the user back into PostHog tracking (GDPR accept / settings toggle).
 */
export function optInPostHog(): void {
  if (_rawClient && typeof _rawClient.optIn === 'function') {
    _rawClient.optIn();
  }
}
