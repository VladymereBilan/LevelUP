import { getRank, xpToNext } from "@levelup/engine";

export default function Home() {
  const level = 1;
  const xpNeeded = xpToNext(level);
  const rank = getRank(level);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-extrabold tracking-widest">LEVEL UP</h1>
      <p className="max-w-md text-center text-sm text-muted">
        Turn real-life habits into quests that award XP, raise stats, and level up your character.{" "}
        <span className="text-foreground">@levelup/engine</span> is wired up and running.
      </p>

      <div className="w-full max-w-sm rounded-2xl border border-violet bg-surface p-6 shadow-[0_0_32px_-8px_var(--violet)]">
        <p className="text-sm font-bold text-blue">Level {level}</p>
        <p className="text-xl font-semibold">
          {xpNeeded} XP to level {level + 1}
        </p>
        <p className="text-xl font-semibold">Rank {rank}</p>
      </div>
    </main>
  );
}
