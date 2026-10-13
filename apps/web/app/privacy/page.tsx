import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — LEVEL UP",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-wide text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted">Last updated: 2026-10-11</p>
      </div>

      <Section title="What this covers">
        <p>
          This policy describes what LEVEL UP (&quot;the app&quot;) collects, why, and how you can
          get it deleted. LEVEL UP is a habit-tracking app that turns real-life activities into
          quests that award experience points, stats, and ranks.
        </p>
      </Section>

      <Section title="Account data">
        <p>
          When you sign up, we store your email address (via Supabase Auth), a username you choose,
          and your device&apos;s timezone. If you sign in with Google, we receive your Google
          account&apos;s email and basic profile info from Google&apos;s sign-in flow — we never see
          or store your Google password.
        </p>
      </Section>

      <Section title="Gameplay data">
        <p>
          Your level, XP, rank, stats, streaks, and the categories/activities/quests you create are
          stored so your progress persists across devices. XP and level changes are computed and
          written only by our server — the app itself never has permission to set these values
          directly.
        </p>
      </Section>

      <Section title="Health data (Health Connect)">
        <p>
          If you connect Android Health Connect, the app reads your step counts and exercise session
          times — read-only, and only while the app is open. Raw health records never leave your
          device: we send our server only the computed progress number for a specific quest (e.g.
          &quot;4,312 steps&quot; or &quot;32 minutes&quot;), not the underlying records themselves.
        </p>
      </Section>

      <Section title="Location data (run tracking)">
        <p>
          If you use a distance-based quest&apos;s run tracking, the app uses your device&apos;s GPS
          location in the foreground, only while a run is actively being tracked, to compute
          distance traveled. Raw GPS coordinates are never stored or transmitted — only the final
          computed distance for that run is sent to our server as quest progress.
        </p>
      </Section>

      <Section title="What we don't do">
        <p>
          We don&apos;t sell your data. We don&apos;t share health or location data with third-party
          advertisers or data brokers. We don&apos;t run background location tracking — location is
          only ever read while the app is open and a run is active.
        </p>
      </Section>

      <Section title="Data deletion">
        <p>
          You can delete your account and all associated data yourself, in-app: Profile → Danger
          Zone → Delete my account. If you&apos;d rather not sign back in, you can request deletion
          by email instead. See{" "}
          <a href="/delete-account" className="text-violet underline">
            Delete Your Account
          </a>{" "}
          for exactly how to do either, what&apos;s deleted, and how long it can persist in a backup
          afterward.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If this policy changes meaningfully, we&apos;ll update the date above and, where
          practical, notify you in-app.
        </p>
      </Section>
    </main>
  );
}
