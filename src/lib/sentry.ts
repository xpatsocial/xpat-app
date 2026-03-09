import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

let initialized = false;

export function initSentry(): void {
  if (initialized || !SENTRY_DSN) return;
  initialized = true;

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    attachScreenshot: true,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error, { extra: context });
}

export function setUser(id: string, email?: string): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser({ id, email });
}

export function clearUser(): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

export { Sentry };
