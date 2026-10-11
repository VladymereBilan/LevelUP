import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — LEVEL UP",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-wide text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted">Last updated: 2026-10-11</p>
      </div>

      <Section title="Using the app">
        <p>
          LEVEL UP is a personal habit tracker. You create an account, define activities you want to
          track, and complete quests to earn XP, stats, and ranks. It&apos;s for personal use —
          don&apos;t use it to impersonate another person or submit activity data that isn&apos;t
          your own.
        </p>
      </Section>

      <Section title="Server-authoritative progress">
        <p>
          Level, XP, rank, and stats are computed and written only by our server. The app sends what
          you did (a completed quest, a synced step count, a tracked run); the server decides how
          much that&apos;s worth, including daily caps meant to keep progress fair.
        </p>
      </Section>

      <Section title="Health and location data">
        <p>
          Health Connect and location-based run tracking are optional. If you enable them, see the{" "}
          <a href="/privacy" className="text-violet underline">
            Privacy Policy
          </a>{" "}
          for exactly what&apos;s read and what&apos;s sent to our servers.
        </p>
      </Section>

      <Section title="No physical penalties">
        <p>
          Missing a quest never prescribes a physical penalty — any penalty is limited to XP loss,
          stat decay, or a locked in-app reward. The app will never tell you to exercise, or do
          anything physical, as a punishment.
        </p>
      </Section>

      <Section title="Account termination">
        <p>
          You can stop using the app at any time and delete your account yourself, in-app or by
          email — see{" "}
          <a href="/delete-account" className="text-violet underline">
            Delete Your Account
          </a>
          . We may suspend an account used to abuse the service, including attempts to submit
          forged progress data.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          The app is provided as-is, without warranty of any kind. We&apos;re not liable for any
          damages arising from your use of it.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          If these terms change meaningfully, we&apos;ll update the date above and, where practical,
          notify you in-app.
        </p>
      </Section>
    </main>
  );
}
