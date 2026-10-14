# apps/mobile

Expo (React Native) + Expo Router. This doc covers the Google sign-in setup added in
`feat/auth` — see the root `CLAUDE.md` for the monorepo as a whole.

## How sign-in works

Google sign-in goes through **Supabase's hosted OAuth redirect** (PKCE flow) — not the native
Google Sign-In SDK. Supabase holds the Google OAuth client id/secret on its side (configured in
its dashboard, below); this app only ever handles the Supabase **anon** key.

1. `lib/auth.ts`'s `signInWithGoogle()` calls `supabase.auth.signInWithOAuth({ provider: "google",
options: { redirectTo, skipBrowserRedirect: true } })` to get a Google auth URL without
   Supabase trying (and failing, on native) to redirect the browser itself.
2. That URL opens in `expo-web-browser`'s `WebBrowser.openAuthSessionAsync`, which hands control
   back to the app once Google redirects to `redirectTo` (a deep link built with
   `Linking.createURL("auth/callback")`, so it resolves correctly whether you're running a dev
   client, a standalone build, or Expo Go — see "Redirect URLs" below).
3. The callback URL's `code` query param is exchanged for a session via
   `supabase.auth.exchangeCodeForSession(code)`.
4. The session persists in `expo-secure-store` via a chunking adapter (`lib/secureStorage.ts`) —
   SecureStore caps individual values at roughly 2048 bytes, which a full session (access +
   refresh token + user metadata) can exceed, so larger values are split across several entries
   and reassembled on read.
5. `lib/AuthProvider.tsx` exposes `useSession()` (`{ session, loading }`); the root
   `app/_layout.tsx` uses `<Stack.Protected guard={...}>` to show `(auth)/login` or `(app)` based
   on it, with a loading spinner while the session restores.

Every outcome of `signInWithGoogle()` — success, the user cancelling/dismissing the browser, or a
real error — comes back as a tagged `SignInResult`, never a thrown exception. A cancel is treated
as a silent no-op; the Login screen only ever shows an error for genuine failures. Nothing in this
flow logs the authorization code, a token, or the session object.

## Setup

### 1. Environment variables

Create `apps/mobile/.env.local` (gitignored — never commit this) with:

```
EXPO_PUBLIC_SUPABASE_URL=<your local Supabase URL, or the hosted project's for a release build>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<matching anon key>
EXPO_PUBLIC_API_URL=<apps/web's base URL for that same backend>
```

Day-to-day development: point these at a **local** Supabase (`npx supabase start` from
`packages/db`, local `apps/web` dev server as `EXPO_PUBLIC_API_URL`) — the hosted project is
PRODUCTION (see root `CLAUDE.md` "Production" and `docs/PRODUCTION.md`), not a dev sandbox. Only
point at the hosted project's URL and the deployed `apps/web` URL deliberately — testing a real
release build, or reproducing a production-only issue.

Only the **anon** key — never the service-role key, which must never exist anywhere in this app.
`EXPO_PUBLIC_API_URL` is apps/web's base URL — lib/api.ts calls it for every server route
(quest generation/completion, onboarding, profile updates).
Expo's env loading reads `.env*` files from the directory you run `expo start`/`expo export`
from (`apps/mobile/`, not the monorepo root), so the root `.env.local` doesn't reach this app on
its own; copy these two values in from there.

One optional extra:

```
EXPO_PUBLIC_BOOT_TRACE=1
```

Turns on `lib/bootTrace.ts`, which logs each cold-start phase (`fonts`, `session restore`,
`onboarding check`, `home data`) with its own duration and a running total. It's an env flag
rather than a `__DEV__` check because cold start is only worth measuring on a release build on a
real device over a real network — build with it set and read the output over
`adb logcat -s ReactNativeJS:V`. Leave it unset for the builds you ship.

### 2. Google Cloud OAuth client

In the Google Cloud Console, under the relevant project: Credentials → Create Credentials →
OAuth client ID → **Web application** (not Android/iOS — the redirect target is Supabase's own
callback URL, not this app directly). Authorized redirect URI:

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

### 3. Supabase provider configuration

Supabase Dashboard → Authentication → Providers → Google: enable it, paste in the Google OAuth
client ID and secret from step 2.

### 4. Redirect URLs (Supabase Dashboard → Authentication → URL Configuration)

Add:

```
levelup://auth/callback
```

This is what `Linking.createURL("auth/callback")` resolves to in a **development build**
(EAS Build or a local prebuild) or a standalone production build — see "Running it" below for
why Expo Go can't reliably be used for this flow at all.

**Expo Go only, for quick local testing — never add this to a production project:**

```
exp://**
```

Expo Go's own scheme is dynamic (`exp://192.168.x.x:8081/--/...`, different per machine/network),
so there's no single fixed URL to allowlist. Supabase's redirect-URL matching supports a `*`
wildcard for exactly this case, but a wildcard redirect allowlist entry means _any_ URL matching
that pattern can receive the OAuth callback — acceptable for a disposable local dev project you
fully control, a real security loosening on anything shared or production-facing. Remove it
before the project is anything but your own local Expo Go testing.

## Running it

**Expo Go is not a reliable way to test this flow.** Custom URL scheme handling (`levelup://...`)
either doesn't work or behaves inconsistently in Expo Go, since the app isn't actually installed
under its own scheme — it's running inside the Expo Go client. Use a **development build**
instead (that's what `expo-dev-client` is for):

```bash
# Local (needs Android Studio / Xcode toolchains installed):
npx expo prebuild
npx expo run:android   # or: npx expo run:ios

# Or via EAS Build (no local native toolchain needed, needs an Expo account):
npx eas build --profile development --platform android   # or ios
# install the resulting build on a device/emulator, then:
npx expo start --dev-client
```

Either way, the app is installed as an actual `levelup://` app, so Google's redirect back to
Supabase's callback, and Supabase's redirect back to `levelup://auth/callback`, both resolve to
this installed app correctly.

## Commands

```bash
pnpm --filter @levelup/mobile typecheck
pnpm --filter @levelup/mobile lint
```

## What's verified vs. not

- **Verified**: `typecheck` and `lint` pass clean; a static Metro bundle export
  (`npx expo export -p android`) succeeds with the new code; the anon key is confirmed present in
  the bundle (expected — anon keys are meant to be client-embedded) and the service-role key is
  confirmed **absent** (checked by grepping the compiled bundle for a fragment of each).
- **Not verified**: the actual Google OAuth round-trip on a device or emulator. That needs a
  development build (see above) plus the Google Cloud + Supabase dashboard configuration from
  "Setup", none of which can be exercised from this environment. Test it on a real device/
  emulator with a dev client before trusting the flow end-to-end.
