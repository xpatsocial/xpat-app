# Android Authentication, Security & Privacy Research for x/pat

> Comprehensive research for a React Native/Expo social travel app with Supabase auth, Google/Apple Sign-In, and user-generated content.
> Researched: April 2026

---

## Table of Contents

1. [Google Sign-In on Android with Supabase](#1-google-sign-in-on-android-with-supabase)
2. [@react-native-google-signin Setup 2026](#2-react-native-google-signin-setup-2026)
3. [Google One Tap Sign-In](#3-google-one-tap-sign-in-on-android)
4. [Android Credential Manager API](#4-android-credential-manager-api)
5. [Android BiometricPrompt](#5-android-biometricprompt)
6. [Android Keystore System](#6-android-keystore-system)
7. [SSL Pinning on Android](#7-ssl-pinning-on-android)
8. [Firebase App Check / Bot Protection](#8-firebase-app-check--bot-protection)
9. [Play Integrity API (SafetyNet Replacement)](#9-play-integrity-api)
10. [Certificate Transparency](#10-certificate-transparency-on-android)
11. [Android Network Security Config](#11-android-network-security-config)
12. [OWASP Mobile Top 10 for Android](#12-owasp-mobile-top-10-for-android)
13. [Content Provider Security](#13-android-content-provider-security)
14. [Root/Jailbreak Detection](#14-rootjailbreak-detection-on-android)
15. [Android Privacy Dashboard](#15-android-privacy-dashboard)
16. [Play Store Data Safety Section](#16-android-data-safety-section)
17. [Android Permission Best Practices](#17-android-permission-best-practices-2026)
18. [Android 14/15/16 Privacy Changes](#18-android-141516-privacy-changes)
19. [Secure Storage Comparison](#19-secure-storage-comparison-on-android)
20. [WebView Security for OAuth](#20-android-webview-security-for-oauth-flows)
21. [Deep Link Hijacking Prevention](#21-deep-link-hijacking-prevention)
22. [Clipboard Security](#22-android-clipboard-security)
23. [Two-Factor Authentication UX](#23-two-factor-authentication-ux-on-android)
24. [Account Deletion Requirements](#24-android-account-deletion-requirements)
25. [Rate Limiting & Brute Force Protection](#25-rate-limiting-and-brute-force-protection)

---

## 1. Google Sign-In on Android with Supabase

**Priority for x/pat: CRITICAL** -- Currently the Android auth screen shows "Google Sign-In -- coming soon" as a disabled button. This is the #1 blocker for Android launch.

### Current State in x/pat

The `AuthScreen.tsx` has a TODO comment and a disabled placeholder button for Google Sign-In on Android. Apple Sign-In is iOS-only (working). The `useAuth.tsx` hook has `signInWithApple()` but no `signInWithGoogle()` method.

### Implementation Approach

**Step 1: Google Cloud Console Setup**
- Create an OAuth 2.0 Web Application client (for Supabase server-side verification)
- Create an Android OAuth client with SHA-1 fingerprint from your EAS build signing key
- CRITICAL: Use the **Web Client ID** (not Android Client ID) in `GoogleSignin.configure()` -- this is the most common mistake

**Step 2: Supabase Dashboard Configuration**
- Go to Authentication > Providers > Google
- Enter the Web Application Client ID and Client Secret
- Enable the Google provider

**Step 3: Code Implementation**

```typescript
// In useAuth.tsx - add signInWithGoogle method
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
});

async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      return { error: { message: 'No ID token returned from Google.' } };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
    });

    return { error, user: data?.user ?? null };
  } catch (e: any) {
    if (e.code === 'SIGN_IN_CANCELLED') return { error: null };
    return { error: { message: e.message || 'Google sign-in failed.' } };
  }
}
```

### Gotchas

1. **SHA-1 fingerprint mismatch**: Debug and production builds use DIFFERENT signing keys. Get your EAS production SHA-1 from `eas credentials` and add it to Google Cloud Console
2. **Web Client ID, not Android Client ID**: The `webClientId` parameter must be the Web Application type client from Google Console
3. **Play Services availability**: Always call `GoogleSignin.hasPlayServices()` before sign-in -- some Android devices lack Google Play Services (Huawei, Amazon Fire)
4. **Nonce handling**: For enhanced security, generate a nonce and pass it through, similar to Apple Sign-In flow
5. **Age gate**: Must implement the same age verification gate as Apple Sign-In for COPPA/GDPR compliance

---

## 2. @react-native-google-signin Setup 2026

**Priority for x/pat: CRITICAL** -- Required for Topic #1.

### Installation

```bash
npx expo install @react-native-google-signin/google-signin
```

### Expo Config Plugin (app.json)

```json
{
  "expo": {
    "plugins": [
      "@react-native-google-signin/google-signin"
    ]
  }
}
```

### Requirements for Expo SDK 55

- `compileSdkVersion` >= 35 (met by Expo SDK 53+)
- `kotlinVersion` >= 2.0.21 (met by Expo SDK 53+)
- Cannot be tested in Expo Go -- requires development build or EAS Build

### EAS Build Configuration

The plugin auto-configures the native Android project during EAS Build. No manual `android/` folder modifications needed for managed workflow.

### Version Compatibility

Use version 12.x or higher of `@react-native-google-signin/google-signin` for compatibility with the latest Credential Manager APIs. The library now uses Google's Credential Manager under the hood on Android (replacing the legacy Google Sign-In SDK).

---

## 3. Google One Tap Sign-In on Android

**Priority for x/pat: HIGH** -- Significantly reduces sign-in friction. Can increase sign-in conversion by up to 90%.

### What It Is

Google One Tap presents a bottom sheet with the user's saved Google account(s), allowing sign-in with a single tap -- no password entry, no redirect to browser.

### Implementation

The `@react-native-google-signin/google-signin` library (v12+) includes One Tap support via the `GoogleOneTapSignIn` module:

```typescript
import { GoogleOneTapSignIn } from '@react-native-google-signin/google-signin';

async function oneTapSignIn() {
  try {
    const response = await GoogleOneTapSignIn.signIn({
      webClientId: 'YOUR_WEB_CLIENT_ID',
      nonce: generatedNonce, // optional but recommended
    });

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.idToken,
    });

    return { data, error };
  } catch (e) {
    // Fall back to regular Google Sign-In
    return signInWithGoogle();
  }
}
```

### UX Strategy for x/pat

- Show One Tap prompt automatically on AuthScreen for returning users
- Fall back to standard Google Sign-In button if One Tap is dismissed or unavailable
- One Tap requires Play Services to be up-to-date -- gracefully degrade

---

## 4. Android Credential Manager API

**Priority for x/pat: MEDIUM** -- Future-proofing for passkeys. Not urgent for MVP but important for 2026+ roadmap.

### What It Is

Android Credential Manager is the unified API (replacing Smart Lock, FIDO2, Google Sign-In SDK) for:
- Passkeys (FIDO2/WebAuthn)
- Passwords (saved in Google Password Manager)
- Federated sign-in (Google, etc.)
- Biometric authentication

### React Native Libraries

1. **react-native-credentials-manager**: Implements Credential Manager API for Android and AuthenticationServices for iOS
   - Android 4.4+ for username/password
   - Android 9+ (API 28) for full passkey support

2. **react-native-passkeys**: An Expo module for passkeys on iOS, Android & web with unified API

### x/pat Roadmap Recommendation

- Phase 1 (now): Implement Google Sign-In via `@react-native-google-signin/google-signin` which already uses Credential Manager under the hood
- Phase 2 (future): Add passkey support as an optional auth method
- Passkeys require server-side WebAuthn relying party setup (Supabase does not natively support passkeys yet as of early 2026)

---

## 5. Android BiometricPrompt

**Priority for x/pat: MEDIUM** -- Nice for app-lock feature, especially for DMs and sensitive profile data.

### What It Is

BiometricPrompt provides system-level fingerprint, face, and iris authentication with a consistent UI across all Android devices.

### Implementation with Expo

```bash
npx expo install expo-local-authentication
```

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

// Check availability
const hasHardware = await LocalAuthentication.hasHardwareAsync();
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

// Authenticate
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Unlock x/pat',
  cancelLabel: 'Use Password',
  disableDeviceFallback: false, // Allow PIN/pattern fallback
});

if (result.success) {
  // Grant access
}
```

### Use Cases for x/pat

1. **App lock**: Optional biometric lock when app comes to foreground (Settings toggle)
2. **Sensitive actions**: Confirm identity before deleting account, changing email
3. **View DMs**: Optional biometric gate for private messages

### Important Notes

- Biometrics is a **verification** method, not an **identity** method -- it confirms the person holding the phone is the enrolled user, not who they are
- Always provide PIN/pattern fallback for accessibility
- Add `expo-local-authentication` to app.json plugins array
- Requires `<uses-permission android:name="android.permission.USE_BIOMETRIC" />` (auto-added by plugin)

---

## 6. Android Keystore System

**Priority for x/pat: HIGH** -- Current setup stores Supabase session tokens in AsyncStorage (unencrypted).

### The Problem

x/pat currently uses `AsyncStorage` for Supabase session persistence (`src/lib/supabase.ts`):

```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage, // INSECURE: unencrypted SharedPreferences on Android
  },
});
```

AsyncStorage on Android stores data in unencrypted SharedPreferences -- any app with root access or a backup extraction can read session tokens.

### Solution: expo-secure-store

```bash
npx expo install expo-secure-store
```

```typescript
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### How It Works on Android

- Values are encrypted using Android Keystore system
- Keys are stored in hardware-backed keystore when available (TEE/Strongbox)
- Encrypted SharedPreferences wraps data with AES-256
- Data is not included in device backups
- Not accessible to other apps even on rooted devices (without hardware exploit)

### Size Limitation

expo-secure-store has a 2048-byte value limit per key. Supabase JWTs can exceed this. Solution: split the session data across multiple keys, or use `react-native-mmkv` with encryption enabled for larger values.

---

## 7. SSL Pinning on Android

**Priority for x/pat: LOW** -- Supabase handles TLS. SSL pinning adds complexity with certificate rotation. Not recommended for early-stage apps connecting to managed services.

### What It Is

SSL/certificate pinning binds the app to a specific server certificate or public key, preventing man-in-the-middle attacks even if a rogue CA is trusted on the device.

### Implementation Options

1. **Network Security Config (XML-based)**:
```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<network-security-config>
  <domain-config>
    <domain includeSubdomains="true">diiqponrvrcpwoerenwz.supabase.co</domain>
    <pin-set expiration="2027-01-01">
      <pin digest="SHA-256">YOUR_PIN_HERE</pin>
      <pin digest="SHA-256">BACKUP_PIN_HERE</pin>
    </pin-set>
  </domain-config>
</network-security-config>
```

2. **react-native-ssl-public-key-pinning**: No native config needed, set up in JS
3. **react-native-ssl-pinning**: Uses OkHttp's CertificatePinner on Android

### Why LOW Priority for x/pat

- Supabase manages its own TLS certificates and may rotate them
- Pinning to a Supabase certificate risks breaking the app when Supabase rotates certs
- The primary threat (MITM on public WiFi) is mitigated by HTTPS enforcement
- Certificate rotation requires app update -- can lock out users on old versions
- Consider adding only if handling payment data or extremely sensitive PII

---

## 8. Firebase App Check / Bot Protection

**Priority for x/pat: MEDIUM** -- Protects Supabase API from being called by bots or spoofed clients. Becomes important as the app grows.

### What It Is

Firebase App Check verifies that requests to your backend come from your genuine app, not from bots, scripts, or modified APKs. On Android, it uses the Play Integrity API for attestation.

### Implementation

```bash
npm install @react-native-firebase/app @react-native-firebase/app-check
```

```typescript
import { firebase } from '@react-native-firebase/app-check';

await firebase.appCheck().initializeAppCheck({
  provider: firebase.appCheck.AndroidProvider.PLAY_INTEGRITY,
  isTokenAutoRefreshEnabled: true,
});
```

### x/pat Consideration

Since x/pat uses Supabase (not Firebase) as the backend, App Check integration requires:
1. Getting an App Check token from Firebase
2. Sending it as a custom header to Supabase Edge Functions
3. Verifying the token server-side in Edge Functions

**Alternative**: Supabase does not natively support App Check. Instead, implement server-side rate limiting and API key rotation on Supabase Edge Functions. This is simpler and equally effective for x/pat's current scale.

---

## 9. Play Integrity API

**Priority for x/pat: LOW-MEDIUM** -- Device attestation to detect tampered/rooted devices. SafetyNet was fully shut down May 2025.

### What It Is

The Play Integrity API replaces SafetyNet and provides three integrity verdicts:
- **App integrity**: Is the app unmodified and installed from Play Store?
- **Device integrity**: Is the device genuine and not rooted?
- **Account integrity**: Is the user signed into a licensed Google account?

### Current State (2026)

- SafetyNet fully deprecated and turned off (May 2025)
- Play Integrity requires hardware-backed security signals since May 2025
- `react-native-firebase` v17+ supports Play Integrity via App Check
- Stronger integrity checks make it harder for rooted/custom ROM devices to pass

### x/pat Implementation

For a social travel app, device attestation is less critical than for banking or payment apps. Recommended approach:
- Use Play Integrity via Firebase App Check if bot abuse becomes a problem
- Do NOT block rooted users entirely -- many digital nomads use custom ROMs
- Log integrity status server-side for abuse detection, don't hard-block

---

## 10. Certificate Transparency on Android

**Priority for x/pat: LOW** -- Automatically handled by Android 16+ and Chrome. No app-level action needed.

### What It Is

Certificate Transparency (CT) requires that TLS certificates be logged to public, auditable logs. This prevents CAs from issuing fraudulent certificates undetected.

### Android 16 (API 36) Changes

- New `certificateTransparency` tag in Network Security Config
- Can be enabled globally or per-domain
- CT enforcement follows Chrome's policy
- If the CT log list is unavailable or older than 70 days, CT enforcement is disabled

### x/pat Action Required

None. Supabase uses certificates from well-known CAs (likely Let's Encrypt or AWS Certificate Manager) that already comply with CT requirements. Android handles CT verification automatically for HTTPS connections.

For pre-Android 16 support, the `certificatetransparency` library by Matt Dolan provides CT support for Android 4.4+, but this is overkill for x/pat.

---

## 11. Android Network Security Config

**Priority for x/pat: HIGH** -- Simple XML configuration that significantly improves security posture.

### What It Is

An XML file that controls HTTPS enforcement, trusted CAs, certificate pinning, and cleartext traffic policy for the entire app.

### Recommended Configuration for x/pat

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- Block all cleartext (HTTP) traffic -->
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <!-- Trust only system CAs (not user-installed certs) -->
      <certificates src="system" />
    </trust-anchors>
  </base-config>

  <!-- Allow cleartext only for localhost in development -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">10.0.2.2</domain>
  </domain-config>
</network-security-config>
```

### Expo Managed Workflow

For Expo managed workflow, create a config plugin to inject the network security config:

```javascript
// plugins/withNetworkSecurityConfig.js
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNetworkSecurityConfig(config) {
  return withAndroidManifest(config, async (config) => {
    const application = config.modResults.manifest.application[0];
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return config;
  });
};
```

### Key Points

- Cleartext (HTTP) is disabled by default since Android 9, but explicitly declaring it is best practice
- Not trusting user-installed CAs prevents corporate proxy MITM inspection from intercepting your API calls
- This is already partially handled by Expo's defaults, but explicit config is recommended

---

## 12. OWASP Mobile Top 10 for Android

**Priority for x/pat: HIGH** -- Framework for prioritizing security work.

### 2024 List (Current) -- x/pat Relevance

| # | Vulnerability | x/pat Status | Priority |
|---|---|---|---|
| M1 | Improper Credential Usage | VULNERABLE: AsyncStorage for tokens | CRITICAL |
| M2 | Inadequate Supply Chain Security | PARTIAL: No automated dep scanning | HIGH |
| M3 | Insecure Authentication/Authorization | PARTIAL: No Google Sign-In on Android | HIGH |
| M4 | Insufficient Input/Output Validation | OK: Content moderation exists | MEDIUM |
| M5 | Insecure Communication | OK: HTTPS via Supabase | LOW |
| M6 | Inadequate Privacy Controls | OK: GDPR consent, privacy policy | LOW |
| M7 | Insufficient Binary Protections | NOT ADDRESSED: No obfuscation | MEDIUM |
| M8 | Security Misconfiguration | PARTIAL: No network security config | HIGH |
| M9 | Insecure Data Storage | VULNERABLE: AsyncStorage for tokens | CRITICAL |
| M10 | Insufficient Cryptography | OK: Supabase handles crypto | LOW |

### React Native-Specific Risks

1. **JavaScript bridge exposure**: Methods bridged between JS and native code lack obfuscation, making them visible to reverse engineers
2. **Dependency vulnerabilities**: JS ecosystem has high dependency counts. Use `npm audit` and Dependabot
3. **Bundle inspection**: JS bundle can be extracted from APK and read. Avoid hardcoding secrets
4. **Hermes bytecode**: Hermes compiles JS to bytecode (better than plaintext) but can still be decompiled

### Recommended Actions for x/pat

1. Switch from AsyncStorage to expo-secure-store (M1, M9)
2. Add `npm audit` to CI/CD pipeline (M2)
3. Implement Google Sign-In (M3)
4. Add network security config (M8)
5. Enable ProGuard/R8 code shrinking for release builds (M7)

---

## 13. Android Content Provider Security

**Priority for x/pat: LOW** -- React Native apps typically do not expose content providers.

### What It Is

Android Content Providers allow apps to share structured data with other apps. Improperly configured providers can leak user data to any app on the device.

### x/pat Risk Assessment

- x/pat does not define custom content providers
- React Native apps rarely use content providers
- The main risk is from third-party SDKs that might register providers
- Expo manages AndroidManifest.xml, reducing misconfiguration risk

### Prevention Checklist

- Ensure no exported content providers in AndroidManifest.xml (`android:exported="false"`)
- If using file sharing (e.g., sharing spot photos), use `FileProvider` with restricted paths
- Never expose database URIs through content providers
- Audit third-party SDK manifests for unintended providers

---

## 14. Root/Jailbreak Detection on Android

**Priority for x/pat: LOW** -- Digital nomads often use custom ROMs. Blocking rooted devices would alienate the target audience.

### Detection Libraries

1. **jail-monkey**: Lightweight, detects root, mock locations, external storage tampering
2. **react-native-jailbreak**: Basic root detection
3. **freeRASP by Talsec**: Comprehensive RASP (Runtime Application Self-Protection) including root detection, Frida detection, emulator detection, tampering detection

### Bypass Risks

- Root detection is **never foolproof** -- tools like Magisk Hide and Zygisk can bypass most checks
- Frida can hook and modify detection functions at runtime
- Determined attackers will always bypass client-side checks
- False positives on legitimate custom ROMs frustrate users

### x/pat Recommendation

**Do NOT implement hard blocking.** Instead:
- Log device integrity status for analytics (detect abuse patterns)
- Perform critical operations server-side (Supabase RLS, Edge Functions)
- If abuse is detected from a specific device, ban the account, not the device
- Consider freeRASP only if bot/scraping abuse becomes a measurable problem

---

## 15. Android Privacy Dashboard

**Priority for x/pat: INFORMATIONAL** -- No app-level action required, but important for user trust.

### What the Dashboard Shows Users

- Which apps accessed Location, Camera, Microphone in the last 24 hours
- Timeline view of when each access occurred
- One-tap permission revocation

### Impact on x/pat

x/pat requests three sensitive permissions:
1. **Location** (when in use): For nearby spots, map features
2. **Camera**: For spot photos
3. **Photo Library**: For uploading photos

Users WILL see x/pat in their Privacy Dashboard. Best practices:
- Only request permissions when the user takes an action that requires them (e.g., tap "Add Spot" before requesting camera)
- Release location listeners when the app goes to background
- Never access camera or microphone in the background
- Excessive permission access shows up prominently and erodes trust

---

## 16. Android Data Safety Section

**Priority for x/pat: CRITICAL for Play Store launch** -- Required for all apps on Google Play Store.

### Required Disclosures for x/pat

Based on the app's current data collection:

| Data Type | Collected | Shared | Purpose |
|---|---|---|---|
| Email address | Yes | No | Account management |
| Name | Yes | No | App functionality (profile) |
| User ID | Yes | No | App functionality, Analytics |
| Precise location | Yes | No | App functionality (nearby spots) |
| Photos | Yes | No | App functionality (spot photos) |
| In-app messages | Yes | No | App functionality (chat, DMs) |
| App interactions | Yes | No | Analytics (PostHog) |
| Crash logs | Yes | No | App functionality (Sentry) |

### 2025-2026 Updates

- Starting April 2025: Android ID no longer considered a persistent device identifier
- Starting January 2026: Age Signals API required for age-appropriate experiences
- Developers are responsible for third-party SDK data collection (PostHog, Sentry)
- Mismatches between declared and actual data access can result in app removal

### Action Items

1. Fill out the Data Safety form accurately in Google Play Console
2. Audit PostHog and Sentry SDKs for any data collection not currently disclosed
3. Ensure privacy policy URL is accurate and accessible
4. Declare data deletion mechanism (already implemented in Settings)
5. Mark all data as "not shared with third parties" (verify PostHog/Sentry data handling)

---

## 17. Android Permission Best Practices 2026

**Priority for x/pat: HIGH** -- Directly affects user trust and app store ratings.

### Current Permissions Used by x/pat

- `ACCESS_FINE_LOCATION` (dangerous) -- map and nearby features
- `CAMERA` (dangerous) -- spot photos
- `READ_MEDIA_IMAGES` (dangerous, Android 13+) -- photo uploads
- `POST_NOTIFICATIONS` (dangerous, Android 13+) -- push notifications
- `INTERNET` (normal) -- network access
- `USE_BIOMETRIC` (normal) -- if biometric auth is added

### Best Practices

1. **Request at point of use**: Never request all permissions on first launch. Request location when user opens the map, camera when they tap "Take Photo"
2. **Provide rationale**: If a user has previously denied a permission, show a custom explanation dialog BEFORE the system dialog appears
3. **Graceful degradation**: If location is denied, show a "search by city" fallback instead of a broken map
4. **Minimal permissions**: Only request `ACCESS_FINE_LOCATION` (not `ACCESS_BACKGROUND_LOCATION`). x/pat has no need for background location

### Implementation Pattern

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

async function requestLocationPermission() {
  if (Platform.OS !== 'android') return true;

  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  if (granted) return true;

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Access',
      message: 'x/pat uses your location to show nearby spots shared by other nomads.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not Now',
    }
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
}
```

---

## 18. Android 14/15/16 Privacy Changes

**Priority for x/pat: MEDIUM** -- Must comply with target SDK requirements.

### Android 14 (API 34)

- **Photo picker**: Users can grant access to specific photos rather than entire library. Use `expo-image-picker` which automatically uses the system photo picker
- **Health Connect**: Integrated into system settings (not relevant for x/pat)
- **Partial photo access**: New `READ_MEDIA_VISUAL_USER_SELECTED` permission for granular photo access

### Android 15 (API 35) -- Released March 2025

- **Private Space**: Users can hide apps behind extra authentication. x/pat should function normally if placed in Private Space
- **Local network permission**: Apps must request explicit permission for local network access (does not affect x/pat -- only uses internet)
- **Refined photo picker**: Users can revoke access to previously selected media
- **Background activity limits**: Stricter background processing rules
- **ANDROID_ID changes**: No longer a reliable persistent identifier

### Android 16 (API 36) -- Released June 2025

- **Privacy Sandbox**: Better ad tracking controls (not relevant for x/pat -- no ads)
- **Health Connect FHIR**: Medical records support (not relevant)
- **Updated photo picker**: Cloud and local photos together with search
- **Certificate Transparency**: Native CT enforcement (see Topic #10)

### x/pat Actions

- Ensure `targetSdkVersion` is set to at least 34 (Expo SDK 55 handles this)
- Use `expo-image-picker` (already in use) which handles photo picker changes
- Do not rely on ANDROID_ID for tracking -- use PostHog's device-level anonymized IDs
- Test in Private Space to ensure normal functionality

---

## 19. Secure Storage Comparison on Android

**Priority for x/pat: HIGH** -- Must choose the right storage for different data types.

### Comparison Matrix

| Feature | expo-secure-store | react-native-keychain | MMKV (encrypted) | AsyncStorage |
|---|---|---|---|---|
| **Encryption** | AES via Android Keystore | AES via Android Keystore | AES CFB-128 | None |
| **Hardware-backed** | Yes (when available) | Yes (when available) | No | No |
| **Max value size** | 2048 bytes | Unlimited | Unlimited | Unlimited |
| **Performance** | Moderate | Moderate | Very fast (mmap) | Moderate |
| **Biometric gate** | No | Yes (FaceID/fingerprint) | No | No |
| **Weekly downloads** | 1.3M | 374K | ~15K (mmkv-storage) | Bundled |
| **Expo compatibility** | Native | Requires config plugin | Requires config plugin | Native |

### Recommendation for x/pat

| Data Type | Storage | Reason |
|---|---|---|
| Supabase session/JWT | expo-secure-store | Encrypted, hardware-backed, Expo-native |
| User preferences | AsyncStorage | Non-sensitive, performance acceptable |
| Draft messages | MMKV | Fast read/write, large values, optional encryption |
| Cached API responses | AsyncStorage or MMKV | Non-sensitive, performance matters |

### Migration Plan

1. Install `expo-secure-store`
2. Create adapter wrapper (see Topic #6)
3. Replace `AsyncStorage` in Supabase client config
4. Existing sessions will be invalidated (users will need to re-login once)
5. Add migration logic to copy non-sensitive preferences if needed

---

## 20. Android WebView Security for OAuth Flows

**Priority for x/pat: HIGH** -- x/pat must NEVER use WebView for OAuth. Use native SDKs instead.

### The Rule

**Never use WebView for OAuth flows.** This is an explicit OWASP recommendation and is prohibited by Google's OAuth policies.

### Why WebView is Dangerous for OAuth

1. The app can inject JavaScript to steal credentials
2. The user cannot verify the URL (no address bar)
3. Cookies and sessions are shared with the app
4. Google blocks OAuth requests from embedded WebViews

### What x/pat Should Use Instead

- **Google Sign-In**: Native `@react-native-google-signin/google-signin` SDK (uses Chrome Custom Tabs under the hood)
- **Apple Sign-In**: Native `expo-apple-authentication` (already implemented)
- **Email/Password**: Direct API call to Supabase (already implemented)
- **Any future OAuth**: Use `expo-auth-session` or `react-native-app-auth` which use system browser (Chrome Custom Tabs on Android)

### Chrome Custom Tabs Benefits

- Runs in the system browser sandbox (isolated from your app)
- User can see the URL and verify the domain
- Shares cookies with Chrome (auto-fill, saved passwords)
- App cannot read or modify the page content
- PKCE (Proof Key for Code Exchange) prevents code interception

---

## 21. Deep Link Hijacking Prevention

**Priority for x/pat: HIGH** -- x/pat already has Android App Links configured in app.json, but verification must be confirmed.

### Current x/pat Setup

```json
"intentFilters": [
  {
    "action": "VIEW",
    "autoVerify": true,
    "data": [
      { "scheme": "https", "host": "xpat.social", "pathPrefix": "/spot" },
      { "scheme": "https", "host": "xpat.social", "pathPrefix": "/profile" },
      { "scheme": "https", "host": "xpat.social", "pathPrefix": "/feed" }
    ],
    "category": ["BROWSABLE", "DEFAULT"]
  }
]
```

`autoVerify: true` is set, which means Android will verify that xpat.social hosts a Digital Asset Links file.

### Required: Digital Asset Links File

For `autoVerify` to work, the domain must serve a verification file at:
```
https://xpat.social/.well-known/assetlinks.json
```

Content:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app_namespace",
    "package_name": "com.aycholdings.xpat",
    "sha256_cert_fingerprints": [
      "YOUR_APP_SIGNING_KEY_SHA256"
    ]
  }
}]
```

### Action Items

1. **Verify assetlinks.json exists** at `https://xpat.social/.well-known/assetlinks.json`
2. **Add SHA-256 fingerprint** from EAS build signing key
3. **Test verification**: `adb shell pm get-app-links com.aycholdings.xpat` should show "verified"
4. **Data validation**: Sanitize all parameters from deep links -- never trust deep link data for auth or sensitive operations
5. The `xpat://` custom scheme is also registered -- this is fine for internal routing but should never carry sensitive tokens

### Prevention Checklist

- Use verified App Links (HTTPS + autoVerify) instead of custom scheme URLs for any public-facing links
- Validate and sanitize all deep link parameters against an allowlist
- Never pass auth tokens or session data through deep links
- Log deep link sources for abuse detection

---

## 22. Android Clipboard Security

**Priority for x/pat: LOW-MEDIUM** -- Relevant if users copy passwords, referral codes, or invite links.

### The Problem

- Android 13+ shows a visual preview of clipboard contents in a popover
- If a user copies a password or sensitive code, it's briefly visible on screen
- Clipboard data is accessible to any app with `RECEIVE_BOOT_COMPLETED` or clipboard listener
- Malware ("clipboard hijackers") can monitor and replace clipboard content

### Android 13+ Solution: EXTRA_IS_SENSITIVE Flag

When copying sensitive data, mark it as sensitive to prevent the visual preview:

```kotlin
// Native Android - would need a native module for React Native
val clipData = ClipData.newPlainText("password", sensitiveText)
clipData.description.extras = PersistableBundle().apply {
    putBoolean("android.content.extra.IS_SENSITIVE", true)
}
clipboardManager.setPrimaryClip(clipData)
```

### React Native Implementation

The `@react-native-clipboard/clipboard` library has an open issue (#222) for exposing `EXTRA_IS_SENSITIVE`. As of 2026, this is not yet available in the JS API.

### x/pat Recommendations

- Avoid features that require copying sensitive data
- Referral codes/invite links: Use share sheets (native share API) instead of clipboard
- If implementing 2FA: Use SMS autofill or authenticator app integration, not clipboard paste
- If users must copy data: clear clipboard after a timeout

---

## 23. Two-Factor Authentication UX on Android

**Priority for x/pat: LOW** -- Not needed for MVP. Consider after reaching significant user base.

### Supabase MFA Support

Supabase Auth supports TOTP-based MFA (free, enabled by default on all projects):

```typescript
// Enrollment
const { data } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Authenticator App',
});
// data.totp.qr_code contains SVG QR code
// data.totp.uri contains otpauth:// URI

// Challenge & Verify (use separate calls in React Native)
const { data: challenge } = await supabase.auth.mfa.challenge({
  factorId: data.id,
});
const { data: verify } = await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: challenge.id,
  code: userEnteredCode,
});
```

### React Native Gotcha

In React Native, do NOT use `challengeAndVerify()` -- it has a known bug. Always separate the `challenge()` and `verify()` calls (confirmed fix as of Feb 2025 Supabase discussion).

### SMS Autofill on Android

For SMS-based OTP codes:
- Use `autoComplete="one-time-code"` on TextInput
- Android will detect incoming SMS with OTP codes and offer autofill
- SMS is considered less secure than TOTP apps (SIM swapping risk)
- Expo/Supabase recommends TOTP over SMS

### x/pat Recommendation

- Phase 1: No MFA (email/password + social sign-in is sufficient)
- Phase 2: Optional TOTP MFA in Settings for security-conscious users
- Never require MFA -- it adds friction for a social app
- If implemented, show QR code for authenticator app enrollment

---

## 24. Android Account Deletion Requirements

**Priority for x/pat: CRITICAL** -- Already implemented but must verify compliance.

### Google Play Policy Requirements

1. **In-app deletion**: Users must be able to initiate deletion from within the app
2. **Web-based deletion**: A web link must also be available for users to delete their account
3. **Data deletion**: All user data must be deleted unless required for legitimate reasons (security, fraud prevention, regulatory compliance)
4. **Transparency**: Clearly explain what data is deleted and the timeline

### x/pat Current Implementation

The app has account deletion in two places:
- `SettingsScreen.tsx`: Calls `supabase.rpc('delete_user_account')` with a 7-day grace period
- `ProfileScreen.tsx`: Simpler flow that signs out and directs user to email

### Compliance Checklist

| Requirement | Status | Notes |
|---|---|---|
| In-app delete button | DONE | Settings > Delete Account |
| Confirmation dialog | DONE | Double confirmation with "Delete My Account" |
| 7-day grace period | DONE | Can cancel by signing back in |
| Web-based deletion option | MISSING | Need a web page at xpat.social for deletion |
| Data deletion description | DONE | Explains what will be deleted |
| Server-side deletion | PARTIAL | Verify `delete_user_account` RPC removes all data |

### Action Items

1. **Create web deletion page** at `https://xpat.social/delete-account` (required by Google Play)
2. **Verify RPC function** deletes: profile, spots, posts, comments, messages, connections, events, push tokens, storage files
3. **Add deletion link** to the Data Safety section in Play Console
4. **Test the full flow**: Delete account > wait 7 days > verify all data is removed

---

## 25. Rate Limiting and Brute Force Protection

**Priority for x/pat: DONE (client-side) + NEEDS WORK (server-side)**

### Current x/pat Implementation

`src/lib/rateLimiter.ts` implements a client-side sliding-window rate limiter with sensible defaults:

| Action | Limit | Window |
|---|---|---|
| chat_message | 10 | 60s |
| direct_message | 10 | 60s |
| post | 3 | 60s |
| comment | 10 | 60s |
| spot | 3 | 5min |
| event | 2 | 5min |
| report | 5 | 5min |
| connection_request | 20 | 5min |
| like | 30 | 60s |
| rsvp | 10 | 60s |

### Limitation

The comment in the code says it all: "Resets on app restart (intentional -- server-side RLS is the real guard)." Client-side rate limiting is easily bypassed by:
- Restarting the app
- Modifying the JS bundle
- Calling the Supabase API directly

### Server-Side Recommendations

1. **Supabase RLS policies**: Already in place (per the code comment). Verify they actually enforce rate limits
2. **Supabase Edge Function rate limiter**: For critical endpoints (auth, report, message), add server-side rate limiting:

```typescript
// Supabase Edge Function example
import { rateLimiter } from './utils/rateLimiter.ts';

Deno.serve(async (req) => {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userId = req.headers.get('authorization'); // extract from JWT

  if (!rateLimiter.check(`${userId}:message`, { max: 10, windowMs: 60000 })) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // Process request...
});
```

3. **Auth brute force**: Supabase Auth has built-in rate limiting on sign-in attempts. Verify it's configured appropriately in the Supabase dashboard (Auth > Rate Limits)
4. **Database-level**: Add a `last_action_at` column to key tables and use RLS policies to enforce minimum intervals between actions

---

## Priority Summary for x/pat

### CRITICAL (Do Before Android Launch)

| # | Topic | Action |
|---|---|---|
| 1 | Google Sign-In | Implement `signInWithGoogle()` in useAuth.tsx |
| 2 | @react-native-google-signin | Install and configure with Expo plugin |
| 6 | Secure Token Storage | Replace AsyncStorage with expo-secure-store |
| 16 | Data Safety Section | Fill out Play Store Data Safety form |
| 24 | Account Deletion | Add web-based deletion page |

### HIGH (Do for Launch Quality)

| # | Topic | Action |
|---|---|---|
| 3 | One Tap Sign-In | Add for better conversion UX |
| 11 | Network Security Config | Add XML config to block cleartext |
| 12 | OWASP Top 10 | Audit against checklist, fix M1/M9 |
| 17 | Permissions | Implement request-at-point-of-use pattern |
| 19 | Secure Storage | Choose right storage per data type |
| 20 | WebView OAuth | Ensure no WebView is used for auth |
| 21 | Deep Links | Verify assetlinks.json on xpat.social |

### MEDIUM (Post-Launch Improvements)

| # | Topic | Action |
|---|---|---|
| 4 | Credential Manager | Passkey support roadmap |
| 5 | BiometricPrompt | Optional app lock feature |
| 8 | App Check | Bot protection when scale warrants it |
| 18 | Android 14/15 Changes | Stay current with target SDK |
| 22 | Clipboard Security | Use share sheets instead of clipboard |
| 25 | Rate Limiting | Add server-side enforcement |

### LOW (Monitor / Future)

| # | Topic | Action |
|---|---|---|
| 7 | SSL Pinning | Only if handling payment data |
| 9 | Play Integrity | Only if bot abuse detected |
| 10 | Certificate Transparency | Automatic on Android 16+ |
| 13 | Content Providers | No action needed |
| 14 | Root Detection | Do not block -- log for analytics |
| 15 | Privacy Dashboard | Informational only |
| 23 | 2FA/MFA | Optional TOTP after user base grows |

---

## Sources

- [Supabase Google Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [React Native Google Sign-In - Expo Setup](https://react-native-google-signin.github.io/docs/setting-up/expo)
- [Google One Tap - React Native](https://react-native-google-signin.github.io/docs/one-tap)
- [react-native-credentials-manager](https://github.com/benjamineruvieru/react-native-credentials-manager)
- [react-native-passkeys](https://github.com/peterferguson/react-native-passkeys)
- [Expo LocalAuthentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [React Native Security Docs](https://reactnative.dev/docs/security)
- [SSL Pinning in React Native](https://dev.to/ajmal_hasan/guide-to-implementing-ssl-pinning-in-react-native-for-ios-and-android-4coo)
- [Firebase App Check - React Native](https://rnfirebase.io/app-check/usage)
- [Play Integrity API Limitations](https://securityboulevard.com/2025/11/the-limitations-of-google-play-integrity-api-ex-safetynet-2/)
- [Android Certificate Transparency Policy](https://developer.android.com/privacy-and-security/certificate-transparency-policy)
- [Android Network Security Configuration](https://developer.android.com/privacy-and-security/security-config)
- [OWASP Mobile Top 10 2024](https://owasp.org/www-project-mobile-top-10/)
- [Securing React Native with OWASP MAS](https://owasp.org/blog/2024/10/02/Securing-React-Native-Mobile-Apps-with-OWASP-MAS)
- [Root Detection - OneUptime](https://oneuptime.com/blog/post/2026-01-15-react-native-jailbreak-root-detection/view)
- [freeRASP for React Native](https://github.com/talsec/Free-RASP-ReactNative)
- [Android Privacy Dashboard](https://support.google.com/android/answer/13530434)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Android Permissions - React Native](https://reactnative.dev/docs/permissionsandroid)
- [Android 15 Features](https://developer.android.com/about/versions/15/summary)
- [Secure Storage Comparison (npm trends)](https://npmtrends.com/expo-secure-store-vs-react-native-keychain-vs-react-native-mmkv-storage)
- [Deep Link Security - Android Developers](https://developer.android.com/privacy-and-security/risks/unsafe-use-of-deeplinks)
- [Clipboard Security - Android Developers](https://developer.android.com/privacy-and-security/risks/secure-clipboard-handling)
- [Supabase MFA TOTP Docs](https://supabase.com/docs/guides/auth/auth-mfa/totp)
- [Google Play Account Deletion Requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Expo Google Authentication Guide](https://docs.expo.dev/guides/google-authentication/)
- [React Native Google Sign-In Supabase 2026 Guide](https://www.agilesoftlabs.com/blog/2026/02/react-native-google-sign-in-supabase_11)
- [Google Play 2026 Policy Changes](https://openforge.io/google-play-developer-policy-changes-that-matter-in-2026/)
