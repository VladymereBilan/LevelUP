/**
 * Intercepts incoming deep links before expo-router tries to match a
 * screen to them. The Google OAuth redirect (`levelup://auth/callback`)
 * isn't a real screen route — without this, the router renders its
 * "Unmatched Route" screen instead of letting the root layout's session
 * guard take over. Never log `path`: it carries the OAuth authorization
 * code as a query param.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (path.startsWith("/auth/callback")) {
    return "/";
  }
  return path;
}
