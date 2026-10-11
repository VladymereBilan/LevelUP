import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Your Account — LEVEL UP",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-wide text-foreground">
          Delete Your Account
        </h1>
        <p className="text-sm text-muted">Last updated: 2026-10-11</p>
      </div>

      <Section title="Delete in the app">
        <p>Open LEVEL UP and go to the Profile tab. Scroll to the Danger Zone section at the bottom, and tap &quot;Delete my account&quot;. You&apos;ll be asked to type DELETE to confirm — this is permanent and cannot be undone.</p>
      </Section>

      <Section title="Request deletion without the app">
        <p>
          If you can&apos;t or don&apos;t want to sign back in, email{" "}
          <a href="mailto:dimmybilan@gmail.com" className="text-violet underline">
            dimmybilan@gmail.com
          </a>{" "}
          from the email address on your account, asking us to delete it. We&apos;ll confirm and
          complete the deletion within 30 days.
        </p>
      </Section>

      <Section title="What gets deleted">
        <p>
          Deleting your account removes your auth record and every row tied to it: your
          profile, level/XP/rank, stats, streaks, categories, activities, quests, the XP ledger,
          unlocked titles, and challenge progress. Nothing is kept in a &quot;soft-deleted&quot;
          state in the live database — the delete is immediate and the underlying database
          cascade removes all of it in the same operation.
        </p>
      </Section>

      <Section title="Backups">
        <p>
          We take a weekly encrypted database backup for disaster recovery, retained for 90
          days. If your account was included in a backup taken before you deleted it, your data
          persists in that backup artifact only until it&apos;s overwritten by the next week&apos;s
          backup or ages out of the 90-day retention window — whichever comes first. Backups are
          never restored into the live product except for disaster recovery, and are not used
          to recreate a deleted account.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          See the{" "}
          <a href="/privacy" className="text-violet underline">
            Privacy Policy
          </a>{" "}
          for what we collect and why, or email{" "}
          <a href="mailto:dimmybilan@gmail.com" className="text-violet underline">
            dimmybilan@gmail.com
          </a>{" "}
          with any other questions about your data.
        </p>
      </Section>
    </main>
  );
}
