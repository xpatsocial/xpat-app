# Google OAuth Setup — One-Time Configuration
**Required before Google Sign-In works in production**

---

## Step 1 — Google Cloud Console

1. Go to https://console.cloud.google.com
2. Create a new project or select existing (name it "x/pat")
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**

### Create 3 clients:

**A. Web application** (used by Supabase as the backend client)
- Application type: **Web application**
- Name: `x/pat Supabase`
- Authorized redirect URIs:
  ```
  https://diiqponrvrcpwoerenwz.supabase.co/auth/v1/callback
  ```
- Save the **Client ID** and **Client Secret** — you'll need these for Supabase.

**B. iOS** (used by the native iOS app)
- Application type: **iOS**
- Bundle ID: `com.aycholdings.xpat`
- Save the **Client ID** (looks like `xxx.apps.googleusercontent.com`)

**C. Android** (used by the native Android app)
- Application type: **Android**
- Package name: `com.aycholdings.xpat`
- SHA-1 certificate fingerprint: get from EAS after first build:
  ```
  eas credentials
  ```
  (Select Android → production → show keystore details)
- Save the **Client ID**

---

## Step 2 — Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/diiqponrvrcpwoerenwz
2. Navigate to **Authentication → Providers → Google**
3. Enable Google provider
4. Enter:
   - **Client ID**: the Web application Client ID from Step 1A
   - **Client Secret**: the Web application Client Secret from Step 1A
5. Save

### Add redirect URL allowlist:
In **Authentication → URL Configuration**:
- Add to **Redirect URLs**:
  ```
  xpat://auth/callback
  ```
- Site URL should already be `https://xpat.social`

---

## Step 3 — Magic Link Redirect (already configured in code)
In **Authentication → URL Configuration**:
- Ensure `xpat://auth/callback` is in the **Redirect URLs** list
- This covers both magic links AND Google OAuth callbacks

---

## Step 4 — Verify in app.json (already done)
The `scheme: "xpat"` in app.json registers the `xpat://` deep link scheme.
The `expo-web-browser` plugin is installed and added to plugins.

---

## Testing
Once configured:
1. Run `eas build --profile preview --platform ios` (or android)
2. Install on device
3. Tap "Continue with Google" → system browser opens Google
4. Sign in → browser closes → app receives session

For magic links:
1. Tap "Continue with email"
2. Enter email → "Send magic link"
3. Check email → tap link → app opens with session

---

## Notes
- Google Sign-In works on BOTH iOS and Android
- Apple Sign-In is iOS only (already working)
- Magic links work on all platforms
- No password storage anywhere in the system
