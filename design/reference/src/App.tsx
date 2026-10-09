import { useState, type ReactNode } from "react";

type IconName =
  | "arrow"
  | "bell"
  | "book"
  | "calendar"
  | "check"
  | "clock"
  | "code"
  | "dumbbell"
  | "edit"
  | "flame"
  | "focus"
  | "google"
  | "home"
  | "logout"
  | "moon"
  | "plus"
  | "pause"
  | "play"
  | "profile"
  | "quest"
  | "shield"
  | "sparkles"
  | "stats"
  | "trophy";

const iconPaths: Record<IconName, ReactNode> = {
  arrow: <path d="m9 18 6-6-6-6" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></>,
  book: <><path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 2V5Z" /><path d="M20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 2V5Z" /></>,
  calendar: <><path d="M5 3v3M19 3v3M4 8h16M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></>,
  dumbbell: <><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" /></>,
  edit: <><path d="m14 4 6 6M4 20l3-1 12-12-3-3L4 16v4Z" /></>,
  flame: <path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-2 4-3 5 0-4-2-7-4-9 0 5-3 7-3 12 0 5 3 8 8 8Z" />,
  focus: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  google: <><path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.7h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7Z" /><path d="M12 21c2.6 0 4.8-.9 6.3-2.3l-3.1-2.4c-.9.6-2 1-3.2 1a5.5 5.5 0 0 1-5.2-3.8H3.6V16A9.5 9.5 0 0 0 12 21Z" /><path d="M6.8 13.5a5.7 5.7 0 0 1 0-3.6V7.4H3.6a9.5 9.5 0 0 0 0 8.6l3.2-2.5Z" /><path d="M12 6.1c1.4 0 2.7.5 3.7 1.5l2.8-2.7A9.4 9.4 0 0 0 3.6 7.4l3.2 2.5A5.5 5.5 0 0 1 12 6.1Z" /></>,
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></>,
  moon: <><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  pause: <><path d="M9 5v14M15 5v14" /></>,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  quest: <><path d="M7 3h10l3 4v13H4V7l3-4Z" /><path d="M8 11h8M8 15h5M9 3v4h6V3" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-5" /></>,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" /></>,
  stats: <><path d="M5 20V10M12 20V4M19 20v-7" /><path d="M2 20h20" /></>,
  trophy: <><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 11v5M8 20h8M9 16h6" /></>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const filled = name === "google";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "google";
  icon?: IconName;
}) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
      {variant === "primary" && <Icon name="arrow" size={17} />}
    </button>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className={`logo ${compact ? "compact" : ""}`}>LEVEL <span>UP</span></div>;
}

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="progress-dots" aria-label={`Onboarding step ${step} of 4`}>
      {[1, 2, 3, 4].map((dot) => <span key={dot} className={dot <= step ? "active" : ""} />)}
    </div>
  );
}

function OnboardingFrame({
  step,
  eyebrow,
  title,
  copy,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
}: {
  step: number;
  eyebrow: string;
  title: string;
  copy: string;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="screen onboarding-screen">
      <div className="onboarding-top">
        <button className="back-button" onClick={onBack} aria-label="Go back"><Icon name="arrow" /></button>
        <Logo compact />
        <span className="step-count">0{step} / 04</span>
      </div>
      <ProgressDots step={step} />
      <div className="onboarding-heading">
        <div className="kicker">{eyebrow}</div>
        <div className="display-title">{title}</div>
        <div className="body-copy">{copy}</div>
      </div>
      <div className="onboarding-content">{children}</div>
      <div className="onboarding-action">
        <Button onClick={onNext}>{nextLabel}</Button>
      </div>
    </div>
  );
}

const focusOptions: { id: string; label: string; copy: string; icon: IconName }[] = [
  { id: "gym", label: "Gym", copy: "Build strength", icon: "dumbbell" },
  { id: "study", label: "Study", copy: "Master knowledge", icon: "book" },
  { id: "coding", label: "Coding", copy: "Ship projects", icon: "code" },
  { id: "reading", label: "Reading", copy: "Expand your mind", icon: "sparkles" },
  { id: "custom", label: "Custom", copy: "Create your path", icon: "plus" },
];

const templates: { id: string; title: string; copy: string; detail: string; icon: IconName; tone: string }[] = [
  { id: "gym", title: "Gym Starter", copy: "Build a consistent training habit", detail: "4 quests · 5 days/week", icon: "dumbbell", tone: "violet" },
  { id: "student", title: "Student", copy: "Focus, study, and read every day", detail: "5 quests · Daily", icon: "book", tone: "blue" },
  { id: "blank", title: "Start from scratch", copy: "Create a system that is fully yours", detail: "No preset quests", icon: "plus", tone: "slate" },
];

const statItems: { code: string; label: string; value: number; icon: IconName; tone: string }[] = [
  { code: "STR", label: "Strength", value: 62, icon: "dumbbell", tone: "red" },
  { code: "AGI", label: "Agility", value: 47, icon: "sparkles", tone: "blue" },
  { code: "VIT", label: "Vitality", value: 71, icon: "shield", tone: "green" },
  { code: "INT", label: "Intellect", value: 58, icon: "book", tone: "violet" },
  { code: "FOC", label: "Focus", value: 66, icon: "focus", tone: "amber" },
];

const navItems: { name: string; icon: IconName }[] = [
  { name: "Home", icon: "home" },
  { name: "Quests", icon: "quest" },
  { name: "Stats", icon: "stats" },
  { name: "Challenges", icon: "trophy" },
  { name: "Profile", icon: "profile" },
];

function Login({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="screen login-screen">
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />
      <div className="login-mark">
        <div className="rune"><Icon name="sparkles" size={31} /></div>
        <Logo />
        <div className="login-tagline">Turn your life into a quest</div>
        <div className="login-rule"><span /><b>BEGIN YOUR JOURNEY</b><span /></div>
      </div>
      <div className="login-actions">
        <Button variant="google" icon="google" onClick={onContinue}>Continue with Google</Button>
        <div className="terms">By continuing, you agree to our <button>Terms</button> and acknowledge our <button>Privacy Policy</button>.</div>
      </div>
    </div>
  );
}

function Splash({ onContinue }: { onContinue: () => void }) {
  return (
    <button className="screen splash-screen" onClick={onContinue} aria-label="Open LEVEL UP">
      <div className="splash-grid" />
      <div className="splash-emblem"><Icon name="sparkles" size={34} /></div>
      <Logo />
      <div className="splash-tagline">Turn your life into a quest</div>
      <div className="splash-loader"><i /></div>
      <span className="splash-hint">TAP TO AWAKEN</span>
    </button>
  );
}

function Welcome({ back, next }: { back: () => void; next: () => void }) {
  return (
    <OnboardingFrame step={1} eyebrow="THE AWAKENING" title="Your next level starts here." copy="Turn daily actions into quests, earn XP, and build the version of yourself you want to become." onBack={back} onNext={next}>
      <div className="awakening-visual">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="awakening-badge"><div><span>LVL</span><strong>01</strong></div></div>
        <div className="float-chip chip-xp"><span>+</span> XP</div>
        <div className="float-chip chip-rank"><Icon name="trophy" size={14} /> RANK</div>
        <div className="float-chip chip-streak"><Icon name="flame" size={14} /> STREAK</div>
      </div>
      <div className="feature-row">
        <div><Icon name="quest" /><span>Complete<br />quests</span></div>
        <span />
        <div><Icon name="sparkles" /><span>Earn<br />XP</span></div>
        <span />
        <div><Icon name="trophy" /><span>Rise in<br />rank</span></div>
      </div>
    </OnboardingFrame>
  );
}

function FocusAreas({
  back,
  next,
  selected,
  setSelected,
}: {
  back: () => void;
  next: () => void;
  selected: string[];
  setSelected: (selected: string[]) => void;
}) {
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  return (
    <OnboardingFrame step={2} eyebrow="CHOOSE YOUR PATH" title="What will you level up?" copy="Pick one or more focus areas. You can always change these later." onBack={back} onNext={next}>
      <div className="focus-grid">
        {focusOptions.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button key={option.id} className={`focus-card ${active ? "selected" : ""} ${option.id === "custom" ? "wide" : ""}`} onClick={() => toggle(option.id)}>
              <span className="select-check">{active && <Icon name="check" size={13} />}</span>
              <span className="focus-icon"><Icon name={option.icon} /></span>
              <b>{option.label}</b>
              <small>{option.copy}</small>
            </button>
          );
        })}
      </div>
      <div className="selection-note">{selected.length} {selected.length === 1 ? "path" : "paths"} selected</div>
    </OnboardingFrame>
  );
}

function Templates({
  back,
  next,
  selected,
  setSelected,
}: {
  back: () => void;
  next: () => void;
  selected: string;
  setSelected: (selected: string) => void;
}) {
  return (
    <OnboardingFrame step={3} eyebrow="STARTER LOADOUT" title="Choose your first quests." copy="Begin with a proven routine or forge your own path from the ground up." onBack={back} onNext={next}>
      <div className="template-list">
        {templates.map((template) => (
          <button key={template.id} className={`template-card ${selected === template.id ? "selected" : ""}`} onClick={() => setSelected(template.id)}>
            <span className={`template-icon tone-${template.tone}`}><Icon name={template.icon} /></span>
            <span className="template-copy"><b>{template.title}</b><small>{template.copy}</small><em>{template.detail}</em></span>
            <span className="radio"><i /></span>
          </button>
        ))}
      </div>
      <div className="tip-card"><Icon name="sparkles" size={18} /><span><b>Starter tip</b>Three to five daily quests is the sweet spot for building momentum.</span></div>
    </OnboardingFrame>
  );
}

function Reminder({
  back,
  next,
  hour,
  setHour,
}: {
  back: () => void;
  next: () => void;
  hour: string;
  setHour: (hour: string) => void;
}) {
  return (
    <OnboardingFrame step={4} eyebrow="SET YOUR RHYTHM" title="When should we summon you?" copy="Choose a daily reminder. A small prompt can keep your streak alive." onBack={back} onNext={next} nextLabel="Begin my journey">
      <div className="reminder-card">
        <div className="reminder-icon"><Icon name="clock" size={28} /></div>
        <div className="reminder-label">DAILY REMINDER</div>
        <div className="time-picker">
          <button onClick={() => setHour(hour === "07" ? "06" : "07")}>⌃</button>
          <div className="time-value">{hour}<span>:</span>30</div>
          <button onClick={() => setHour(hour === "07" ? "08" : "07")}>⌄</button>
          <div className="period"><button className="active">AM</button><button>PM</button></div>
        </div>
        <div className="reminder-subtitle">Every day at {hour}:30 AM</div>
      </div>
      <div className="permission-row">
        <span className="permission-icon"><Icon name="shield" size={18} /></span>
        <span><b>You're in control</b><small>Change or pause reminders anytime in Settings.</small></span>
      </div>
    </OnboardingFrame>
  );
}

function Home({
  restart,
  openQuests,
  openStats,
  openChallenges,
  openNotifications,
  openProfile,
}: {
  restart: () => void;
  openQuests: () => void;
  openStats: () => void;
  openChallenges: () => void;
  openNotifications: () => void;
  openProfile: () => void;
}) {
  const [activeTab, setActiveTab] = useState("Home");
  const navigateTab = (name: string) => {
    setActiveTab(name);
    if (name === "Quests") openQuests();
    if (name === "Stats") openStats();
    if (name === "Challenges") openChallenges();
    if (name === "Profile") openProfile();
  };
  return (
    <div className="screen home-screen">
      <div className="home-scroll">
        <div className="home-header">
          <div className="user-block">
            <div className="avatar"><span>AK</span><i /></div>
            <div><small>WELCOME BACK</small><b>Alex Knight</b></div>
          </div>
          <div className="home-header-actions">
            <button className="notification-button" onClick={openNotifications}><Icon name="bell" size={17} /><i /></button>
            <button className="streak"><Icon name="flame" size={16} /><span>12</span><small>DAYS</small></button>
          </div>
        </div>

        <div className="status-card">
          <div className="status-top">
            <div className="level-shield"><div><span>LEVEL</span><strong>08</strong></div></div>
            <div className="status-copy">
              <div className="rank-line"><span className="rank-chip">C</span><span>RISING EXPLORER</span></div>
              <div className="status-title">Keep climbing.</div>
              <div className="xp-numbers"><span>1,240 / 1,800 XP</span><b>69%</b></div>
              <div className="xp-track"><div className="xp-fill" /></div>
              <div className="xp-next">560 XP TO LEVEL 09</div>
            </div>
          </div>
          <div className="status-pattern" />
        </div>

        <div className="section-head"><span>CORE STATS</span><button onClick={() => setActiveTab("Stats")}>View details <Icon name="arrow" size={14} /></button></div>
        <div className="stats-card">
          {statItems.map((stat) => (
            <div className="stat-row" key={stat.code}>
              <span className={`stat-icon tone-${stat.tone}`}><Icon name={stat.icon} size={15} /></span>
              <span className="stat-info">
                <span className="stat-label"><b>{stat.code}</b><small>{stat.label}</small><strong>{stat.value}</strong></span>
                <span className="stat-track"><i className={`tone-${stat.tone}`} style={{ width: `${stat.value}%` }} /></span>
              </span>
            </div>
          ))}
        </div>

        <div className="section-head quest-section-head"><span>TODAY'S QUESTS</span><button>View all <Icon name="arrow" size={14} /></button></div>
        <div className="daily-card">
          <div className="daily-ring"><svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="17" /><circle className="filled" cx="21" cy="21" r="17" /></svg><b>3/5</b></div>
          <div className="daily-copy"><small>DAILY PROGRESS</small><b>3 of 5 completed</b><span>Two quests left. Finish strong.</span></div>
          <span className="daily-xp">+240 XP</span>
        </div>
        <Button icon="quest" onClick={openQuests}>Continue quest</Button>
        <button className="restart-link" onClick={restart}>Restart prototype</button>
      </div>

      <nav className="tabbar">
        {navItems.map((item) => (
          <button key={item.name} className={`tab ${activeTab === item.name ? "active" : ""}`} onClick={() => navigateTab(item.name)}>
            <span><Icon name={item.icon} size={20} /></span>
            <small>{item.name}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}

type QuestItem = {
  id: string;
  title: string;
  progress: string;
  percent: number;
  xp: number;
  difficulty: "Easy" | "Normal" | "Hard";
  icon: IconName;
  category: string;
  complete?: boolean;
};

const dailyQuests: QuestItem[] = [
  { id: "gym", title: "Upper Body Forge", progress: "3 / 5 sets", percent: 60, xp: 120, difficulty: "Hard", icon: "dumbbell", category: "GYM" },
  { id: "walk", title: "Morning Movement", progress: "20 / 20 min", percent: 100, xp: 60, difficulty: "Easy", icon: "sparkles", category: "GYM", complete: true },
  { id: "study", title: "Deep Study Session", progress: "45 / 60 min", percent: 75, xp: 100, difficulty: "Normal", icon: "book", category: "STUDY" },
  { id: "read", title: "Read 20 Pages", progress: "20 / 20 pages", percent: 100, xp: 80, difficulty: "Easy", icon: "book", category: "STUDY", complete: true },
  { id: "code", title: "Ship One Feature", progress: "1 / 2 tasks", percent: 50, xp: 140, difficulty: "Hard", icon: "code", category: "CODING" },
];

function QuestProgressRing() {
  return (
    <div className="quest-day-ring">
      <svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="29" /><circle className="filled" cx="36" cy="36" r="29" /></svg>
      <div><strong>3</strong><span>/ 5</span></div>
    </div>
  );
}

function QuestCard({ quest, onClick }: { quest: QuestItem; onClick: () => void }) {
  return (
    <button className={`daily-quest-card ${quest.complete ? "complete" : ""}`} onClick={onClick}>
      <span className="quest-category-bar" />
      <span className="daily-quest-icon">{quest.complete ? <Icon name="check" /> : <Icon name={quest.icon} />}</span>
      <span className="daily-quest-main">
        <span className="daily-quest-title">{quest.title}</span>
        <span className="daily-quest-progress"><span>{quest.progress}</span><span>{quest.percent}%</span></span>
        <span className="mini-track"><i style={{ width: `${quest.percent}%` }} /></span>
        <span className="quest-tags"><em className={quest.difficulty.toLowerCase()}>{quest.difficulty}</em><b>+{quest.xp} XP</b></span>
      </span>
      <Icon name="arrow" size={16} />
    </button>
  );
}

function DailyQuests({ back, openQuest, createQuest }: { back: () => void; openQuest: (type: "gym" | "study") => void; createQuest: () => void }) {
  const groups = ["GYM", "STUDY", "CODING"];
  return (
    <div className="screen quest-list-screen">
      <div className="page-topbar">
        <button className="back-button" onClick={back}><Icon name="arrow" /></button>
        <div className="page-title">Daily Quests</div>
        <button className="date-button create-button" onClick={createQuest}><Icon name="plus" size={18} /></button>
      </div>
      <div className="quest-list-scroll">
        <div className="day-summary">
          <div>
            <div className="kicker">MONDAY · MAY 26</div>
            <div className="day-title">Today’s campaign</div>
            <div className="day-copy">Complete two more quests to clear the day.</div>
          </div>
          <QuestProgressRing />
        </div>
        <div className="daily-xp-summary"><Icon name="sparkles" size={16} /><span><b>320 XP</b> earned today</span><strong>500 XP</strong></div>
        {groups.map((group) => {
          const quests = dailyQuests.filter((quest) => quest.category === group);
          return (
            <section className="quest-group" key={group}>
              <div className="quest-group-title"><span>{group}</span><small>{quests.filter((quest) => quest.complete).length}/{quests.length} complete</small></div>
              <div className="quest-group-list">
                {quests.map((quest) => <QuestCard key={quest.id} quest={quest} onClick={() => openQuest(quest.id === "study" || quest.id === "read" ? "study" : "gym")} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TimerRing({ progress, children }: { progress: number; children: ReactNode }) {
  return (
    <div className="timer-ring">
      <svg viewBox="0 0 210 210">
        <circle cx="105" cy="105" r="91" />
        <circle className="filled" cx="105" cy="105" r="91" style={{ strokeDashoffset: 572 - 572 * progress / 100 }} />
      </svg>
      <div className="timer-center">{children}</div>
    </div>
  );
}

function QuestDetail({
  type,
  back,
  complete,
}: {
  type: "gym" | "study";
  back: () => void;
  complete: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [sets, setSets] = useState([
    { reps: 10, weight: 45, done: true },
    { reps: 10, weight: 45, done: true },
    { reps: 8, weight: 50, done: false },
  ]);
  const [minutes, setMinutes] = useState(45);
  const isGym = type === "gym";
  return (
    <div className="screen detail-screen">
      <div className="page-topbar">
        <button className="back-button" onClick={back}><Icon name="arrow" /></button>
        <div className="detail-top-title"><small>{isGym ? "GYM QUEST" : "STUDY QUEST"}</small><b>Quest Log</b></div>
        <span className="detail-xp">+{isGym ? 120 : 100} XP</span>
      </div>
      <div className="detail-scroll">
        <div className="activity-heading">
          <div className={`activity-icon ${isGym ? "gym" : "study"}`}><Icon name={isGym ? "dumbbell" : "book"} size={24} /></div>
          <div><small>{isGym ? "STRENGTH · HARD" : "KNOWLEDGE · NORMAL"}</small><div>{isGym ? "Upper Body Forge" : "Deep Study Session"}</div></div>
        </div>
        <div className="timer-wrap">
          <TimerRing progress={isGym ? 64 : minutes / 60 * 100}>
            <small>{running ? "IN PROGRESS" : "READY"}</small>
            <strong>{isGym ? "28:42" : `${minutes}:00`}</strong>
            <span>{isGym ? "45:00 TARGET" : "60:00 TARGET"}</span>
          </TimerRing>
          <button className={`timer-control ${running ? "running" : ""}`} onClick={() => setRunning(!running)}>
            <Icon name={running ? "pause" : "play"} size={22} />
          </button>
        </div>
        {isGym ? (
          <div className="log-panel">
            <div className="log-header"><span>SET</span><span>REPS</span><span>WEIGHT</span><span /></div>
            {sets.map((set, index) => (
              <div className="set-row" key={index}>
                <span className={set.done ? "set-done" : ""}>{set.done ? <Icon name="check" size={13} /> : index + 1}</span>
                <b>{set.reps}</b>
                <b>{set.weight} <small>kg</small></b>
                <button onClick={() => setSets(sets.map((item, itemIndex) => itemIndex === index ? { ...item, done: !item.done } : item))}><Icon name={set.done ? "check" : "plus"} size={15} /></button>
              </div>
            ))}
            <button className="add-set" onClick={() => setSets([...sets, { reps: 8, weight: 50, done: false }])}><Icon name="plus" size={15} /> Add set</button>
          </div>
        ) : (
          <div className="study-counter">
            <div><small>MINUTES LOGGED</small><strong>{minutes}</strong><span>of 60 min</span></div>
            <div className="counter-actions"><button onClick={() => setMinutes(Math.max(0, minutes - 5))}>−5</button><button onClick={() => setMinutes(Math.min(60, minutes + 5))}>+5</button></div>
            <div className="focus-note"><Icon name="focus" size={17} /><span><b>Focus session active</b><small>Stay in this view to keep your timer accurate.</small></span></div>
          </div>
        )}
      </div>
      <div className="detail-action"><Button icon="check" onClick={complete}>Complete quest</Button></div>
    </div>
  );
}

function Celebration({
  variant,
  continueFlow,
  showRankVariant,
}: {
  variant: "level" | "rank";
  continueFlow: () => void;
  showRankVariant?: () => void;
}) {
  const rank = variant === "rank";
  const particles = Array.from({ length: 22 }, (_, index) => index);
  return (
    <div className={`screen celebration ${rank ? "rank-up" : "level-up"}`}>
      <div className="celebration-rays" />
      <div className="particles">{particles.map((particle) => <i key={particle} style={{ "--i": particle } as React.CSSProperties} />)}</div>
      <div className="celebration-content">
        <div className="celebration-kicker">{rank ? "NEW RANK ACHIEVED" : "QUEST COMPLETE"}</div>
        <div className="celebration-title">{rank ? "Rank Up" : "Level Up"}</div>
        <div className={`celebration-badge ${rank ? "rank-badge" : ""}`}>
          <div>{rank ? <><small>RANK</small><strong>B</strong></> : <><small>LEVEL</small><strong>09</strong></>}</div>
        </div>
        <div className="celebration-subtitle">{rank ? "ELITE EXPLORER" : "YOUR POWER IS GROWING"}</div>
        <div className="reward-card">
          <div><Icon name={rank ? "trophy" : "sparkles"} /><span><small>{rank ? "RANK BONUS" : "QUEST REWARD"}</small><strong>+120 XP</strong></span></div>
          <span className="reward-divider" />
          <div><Icon name={rank ? "shield" : "dumbbell"} /><span><small>STAT GAIN</small><strong>+2 {rank ? "VIT" : "STR"}</strong></span></div>
        </div>
        <div className="celebration-copy">{rank ? "You’ve crossed a new threshold. Greater challenges and rewards are now unlocked." : "Every completed quest shapes your stats. Keep your momentum and reach the next rank."}</div>
      </div>
      <div className="celebration-actions">
        <Button onClick={continueFlow}>Continue</Button>
        {!rank && showRankVariant && <button className="variant-link" onClick={showRankVariant}>Preview Rank Up variant</button>}
      </div>
    </div>
  );
}

const questIcons: IconName[] = ["dumbbell", "book", "code", "focus", "flame", "sparkles"];
const metricOptions = ["Checkbox", "Minutes", "Reps", "Sets × Reps × Weight"];
const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

function ChoicePill({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button className={`choice-pill ${active ? "active" : ""}`} onClick={onClick}>{children}</button>;
}

function CreateQuest({ back, saved }: { back: () => void; saved: () => void }) {
  const [color, setColor] = useState("violet");
  const [icon, setIcon] = useState<IconName>("dumbbell");
  const [stat, setStat] = useState("STR");
  const [metric, setMetric] = useState("Minutes");
  const [schedule, setSchedule] = useState("Daily");
  const [days, setDays] = useState([0, 2, 4]);
  const [difficulty, setDifficulty] = useState("Normal");
  const xp = difficulty === "Easy" ? 60 : difficulty === "Normal" ? 100 : 160;
  return (
    <div className="screen editor-screen">
      <div className="page-topbar">
        <button className="back-button" onClick={back}><Icon name="arrow" /></button>
        <div className="detail-top-title"><small>CUSTOMIZATION</small><b>Create Quest</b></div>
        <button className="editor-save" onClick={saved}>Save</button>
      </div>
      <div className="editor-scroll">
        <div className="form-section">
          <div className="form-section-head"><span>01</span><div><b>Category</b><small>Define how this quest appears</small></div></div>
          <label className="editor-field"><span>CATEGORY NAME</span><input defaultValue="Fitness" /></label>
          <div className="editor-label">COLOR</div>
          <div className="editor-swatches">
            {["violet", "blue", "green", "amber", "red"].map((item) => <button key={item} aria-label={item} className={`editor-swatch swatch-${item} ${color === item ? "selected" : ""}`} onClick={() => setColor(item)} />)}
          </div>
          <div className="editor-label">ICON</div>
          <div className="editor-icons">
            {questIcons.map((item) => <button key={item} className={icon === item ? "selected" : ""} onClick={() => setIcon(item)}><Icon name={item} size={19} /></button>)}
          </div>
          <div className="editor-label">MAPPED STAT</div>
          <div className="stat-choices">{["STR", "AGI", "VIT", "INT", "FOC"].map((item) => <ChoicePill key={item} active={stat === item} onClick={() => setStat(item)}>{item}</ChoicePill>)}</div>
        </div>

        <div className="form-section">
          <div className="form-section-head"><span>02</span><div><b>Activity</b><small>Set the objective and target</small></div></div>
          <label className="editor-field"><span>ACTIVITY NAME</span><input defaultValue="Morning training" /></label>
          <div className="editor-label">METRIC TYPE</div>
          <div className="metric-grid">{metricOptions.map((item) => <ChoicePill key={item} active={metric === item} onClick={() => setMetric(item)}>{item}</ChoicePill>)}</div>
          <label className="editor-field target-field"><span>TARGET VALUE</span><div><input defaultValue={metric === "Minutes" ? "45" : "5"} /><em>{metric === "Minutes" ? "minutes" : metric === "Checkbox" ? "completion" : "target"}</em></div></label>
        </div>

        <div className="form-section">
          <div className="form-section-head"><span>03</span><div><b>Schedule</b><small>Choose when this quest repeats</small></div></div>
          <div className="schedule-options">{["Daily", "Select weekdays", "One-time"].map((item) => <ChoicePill key={item} active={schedule === item} onClick={() => setSchedule(item)}>{item}</ChoicePill>)}</div>
          {schedule === "Select weekdays" && <div className="weekday-row">{weekDays.map((day, index) => <button key={`${day}-${index}`} className={days.includes(index) ? "active" : ""} onClick={() => setDays(days.includes(index) ? days.filter((item) => item !== index) : [...days, index])}>{day}</button>)}</div>}
        </div>

        <div className="form-section difficulty-section">
          <div className="form-section-head"><span>04</span><div><b>Difficulty</b><small>Higher risk earns greater rewards</small></div></div>
          <div className="difficulty-options">
            {["Easy", "Normal", "Hard"].map((item) => <ChoicePill key={item} active={difficulty === item} onClick={() => setDifficulty(item)}>{item}<small>+{item === "Easy" ? 60 : item === "Normal" ? 100 : 160} XP</small></ChoicePill>)}
          </div>
          <div className="xp-preview"><span><Icon name="sparkles" size={18} /> QUEST REWARD</span><strong>+{xp} XP</strong></div>
        </div>
      </div>
      <div className="detail-action"><Button icon="check" onClick={saved}>Create quest</Button></div>
    </div>
  );
}

const xpWeek = [
  { day: "M", value: 62, xp: 420 },
  { day: "T", value: 41, xp: 280 },
  { day: "W", value: 82, xp: 560 },
  { day: "T", value: 54, xp: 370 },
  { day: "F", value: 91, xp: 620 },
  { day: "S", value: 68, xp: 460 },
  { day: "S", value: 34, xp: 230 },
];

function StatsProgress({ back }: { back: () => void }) {
  const heatmap = Array.from({ length: 35 }, (_, index) => (index * 7 + index % 4) % 5);
  return (
    <div className="screen analytics-screen">
      <div className="page-topbar">
        <button className="back-button" onClick={back}><Icon name="arrow" /></button>
        <div className="page-title">Stats & Progress</div>
        <button className="date-button"><Icon name="calendar" size={18} /></button>
      </div>
      <div className="analytics-scroll">
        <div className="analytics-summary">
          <div><small>TOTAL XP</small><strong>12,840</strong><span><b>+18%</b> this week</span></div>
          <div><small>QUESTS DONE</small><strong>148</strong><span>Since awakening</span></div>
        </div>
        <div className="chart-card">
          <div className="chart-head"><div><small>WEEKLY ACTIVITY</small><b>XP earned</b></div><strong>2,940 <small>XP</small></strong></div>
          <div className="bar-chart">
            {xpWeek.map((item, index) => <div className="bar-column" key={`${item.day}-${index}`}><span>{item.xp}</span><i style={{ height: `${item.value}%` }} className={index === 4 ? "peak" : ""} /><small>{item.day}</small></div>)}
          </div>
        </div>
        <div className="chart-card radar-card">
          <div className="chart-head"><div><small>ATTRIBUTE BALANCE</small><b>Core stats</b></div><span className="rank-chip">C</span></div>
          <div className="radar-wrap">
            <svg viewBox="0 0 240 190">
              <g className="radar-grid"><polygon points="120,14 209,78 175,175 65,175 31,78" /><polygon points="120,44 180,87 157,152 83,152 60,87" /><polygon points="120,72 153,96 141,132 99,132 87,96" /><line x1="120" y1="14" x2="120" y2="112" /><line x1="209" y1="78" x2="120" y2="112" /><line x1="175" y1="175" x2="120" y2="112" /><line x1="65" y1="175" x2="120" y2="112" /><line x1="31" y1="78" x2="120" y2="112" /></g>
              <polygon className="radar-value" points="120,42 178,90 157,153 82,154 69,92" />
              <g className="radar-dots"><circle cx="120" cy="42" r="3" /><circle cx="178" cy="90" r="3" /><circle cx="157" cy="153" r="3" /><circle cx="82" cy="154" r="3" /><circle cx="69" cy="92" r="3" /></g>
              <g className="radar-labels"><text x="120" y="9">STR</text><text x="218" y="80">AGI</text><text x="180" y="186">VIT</text><text x="57" y="186">INT</text><text x="22" y="80">FOC</text></g>
            </svg>
          </div>
        </div>
        <div className="chart-card heatmap-card">
          <div className="chart-head"><div><small>CONSISTENCY</small><b>Streak calendar</b></div><strong className="heatmap-streak"><Icon name="flame" size={14} /> 12 days</strong></div>
          <div className="heatmap">{heatmap.map((value, index) => <i key={index} className={`heat-${value}`} />)}</div>
          <div className="heatmap-legend"><span>4 weeks ago</span><span>Less <i /><i className="heat-2" /><i className="heat-4" /> More</span></div>
        </div>
        <div className="titles-head"><span>TITLES UNLOCKED</span><small>4 of 18</small></div>
        <div className="titles-row">
          {[["flame", "Unbroken"], ["dumbbell", "Iron Will"], ["book", "Scholar"], ["shield", "Locked"]].map(([iconName, title], index) => <div className={`title-card ${index === 3 ? "locked" : ""}`} key={title}><span><Icon name={iconName as IconName} /></span><b>{title}</b><small>{index === 3 ? "???" : "Unlocked"}</small></div>)}
        </div>
      </div>
    </div>
  );
}

const challenges = [
  { type: "WEEKLY", title: "The Relentless Seven", copy: "Complete at least 3 quests every day this week.", progress: 5, total: 7, reward: "600 XP", time: "2d 14h", icon: "flame" as IconName, tone: "violet", locked: false },
  { type: "MONTHLY", title: "Mind Over Matter", copy: "Log 20 hours of focused study or deep work.", progress: 14, total: 20, reward: "1,200 XP", time: "8 days", icon: "focus" as IconName, tone: "blue", locked: false },
  { type: "ELITE", title: "Perfect Ascension", copy: "Complete every daily quest for fourteen days.", progress: 0, total: 14, reward: "TITLE + 2,000 XP", time: "Unlock at Rank B", icon: "trophy" as IconName, tone: "gold", locked: true },
];

function Challenges({ back }: { back: () => void }) {
  return (
    <div className="screen challenges-screen">
      <div className="page-topbar">
        <button className="back-button" onClick={back}><Icon name="arrow" /></button>
        <div className="page-title">Challenges</div>
        <span className="challenge-count">2 ACTIVE</span>
      </div>
      <div className="challenges-scroll">
        <div className="challenge-intro">
          <div className="kicker">PUSH PAST YOUR LIMITS</div>
          <div className="day-title">Claim greater rewards.</div>
          <div className="day-copy">Limited-time objectives built to test your consistency.</div>
        </div>
        <div className="challenge-tabs"><button className="active">Active</button><button>Upcoming</button><button>Completed</button></div>
        <div className="challenge-list">
          {challenges.map((challenge) => {
            const percentage = challenge.progress / challenge.total * 100;
            return (
              <div className={`challenge-card challenge-${challenge.tone} ${challenge.locked ? "locked" : ""}`} key={challenge.title}>
                <div className="challenge-art"><div className="challenge-orbit" /><span><Icon name={challenge.locked ? "shield" : challenge.icon} size={28} /></span></div>
                <div className="challenge-type"><span>{challenge.type} CHALLENGE</span><b>{challenge.locked ? "LOCKED" : challenge.time}</b></div>
                <div className="challenge-title">{challenge.title}</div>
                <div className="challenge-copy">{challenge.copy}</div>
                <div className="challenge-progress-label"><span>{challenge.locked ? "REQUIREMENT" : "PROGRESS"}</span><strong>{challenge.locked ? "RANK B" : `${challenge.progress} / ${challenge.total} DAYS`}</strong></div>
                <div className="challenge-track"><i style={{ width: `${percentage}%` }} /></div>
                <div className="challenge-footer"><span><small>REWARD</small><b>{challenge.reward}</b></span><button disabled={challenge.locked}>{challenge.locked ? "Locked" : "View challenge"}{!challenge.locked && <Icon name="arrow" size={13} />}</button></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const notificationItems: { title: string; copy: string; time: string; icon: IconName; tone: string; unread?: boolean }[] = [
  { title: "New Quest Available", copy: "The Deep Work Protocol has been added to your recommended quests.", time: "2m", icon: "sparkles", tone: "violet", unread: true },
  { title: "Streak at risk", copy: "Complete one quest before midnight to protect your 12-day streak.", time: "1h", icon: "flame", tone: "amber", unread: true },
  { title: "Level up!", copy: "You reached Level 9 and earned two new stat points.", time: "Yesterday", icon: "trophy", tone: "blue" },
  { title: "Weekly challenge", copy: "Only two days remain in The Relentless Seven.", time: "2d", icon: "shield", tone: "green" },
];

function Notifications({ back }: { back: () => void }) {
  const [read, setRead] = useState<string[]>([]);
  return (
    <div className="screen notifications-screen">
      <div className="page-topbar">
        <button className="back-button" onClick={back}><Icon name="arrow" /></button>
        <div className="page-title">Notifications</div>
        <button className="mark-read" onClick={() => setRead(notificationItems.map((item) => item.title))}>Read all</button>
      </div>
      <div className="notifications-scroll">
        <div className="notification-section-head"><span>RECENT</span><small>{Math.max(0, 2 - read.length)} unread</small></div>
        <div className="notification-list">
          {notificationItems.map((item) => {
            const unread = item.unread && !read.includes(item.title);
            return (
              <button key={item.title} className={`notification-card ${unread ? "unread" : ""}`} onClick={() => setRead([...read, item.title])}>
                <span className={`notification-type tone-${item.tone}`}><Icon name={item.icon} /></span>
                <span className="notification-body"><b>{item.title}</b><small>{item.copy}</small><em>{item.time} ago</em></span>
                {unread && <i />}
              </button>
            );
          })}
        </div>
        <div className="notification-section-head lock-head"><span>LOCK-SCREEN PREVIEW</span><small>iPhone 14</small></div>
        <div className="lock-mockup">
          <div className="lock-wallpaper"><div className="lock-time">9:41</div><div className="lock-date">Monday, May 26</div></div>
          <div className="lock-notification">
            <div className="lock-app"><span><Icon name="sparkles" size={13} /></span><b>LEVEL UP</b><small>now</small></div>
            <div className="lock-title">New Quest Available</div>
            <div className="lock-copy">The Deep Work Protocol is ready. Accept the quest and earn 180 XP.</div>
          </div>
          <div className="lock-actions"><span><Icon name="focus" size={16} /></span><span><Icon name="code" size={16} /></span></div>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return <button role="switch" aria-checked={checked} className={`setting-toggle ${checked ? "on" : ""}`} onClick={onClick}><span /></button>;
}

function ProfileSettings({ back, logout }: { back: () => void; logout: () => void }) {
  const [darkTheme, setDarkTheme] = useState(true);
  const [reminders, setReminders] = useState(true);
  return (
    <div className="screen profile-screen">
      <div className="page-topbar">
        <button className="back-button" onClick={back}><Icon name="arrow" /></button>
        <div className="page-title">Profile</div>
        <button className="date-button"><Icon name="edit" size={16} /></button>
      </div>
      <div className="profile-scroll">
        <div className="profile-hero">
          <div className="profile-avatar"><span>AK</span><i>9</i></div>
          <div className="profile-name">Alex Knight</div>
          <div className="profile-handle">@alexknight · Joined May 2025</div>
          <div className="profile-rank"><span>B</span><div><small>CURRENT RANK</small><b>Elite Explorer</b></div></div>
          <div className="profile-counts"><div><b>148</b><small>QUESTS</small></div><i /><div><b>12,840</b><small>TOTAL XP</small></div><i /><div><b>12</b><small>STREAK</small></div></div>
        </div>
        <div className="profile-section-title"><span>EQUIPPED TITLE</span><button>View all</button></div>
        <div className="equipped-title"><span><Icon name="flame" /></span><div><small>TITLE</small><b>The Unbroken</b><em>12-day streak achievement</em></div><Icon name="arrow" size={16} /></div>
        <div className="profile-section-title"><span>RANK HISTORY</span><small>3 ASCENSIONS</small></div>
        <div className="rank-history">
          {[["B", "Elite Explorer", "May 24"], ["C", "Rising Explorer", "May 08"], ["D", "Initiate", "Apr 21"]].map(([rank, label, date], index) => <div key={rank}><span className={`history-rank history-${rank.toLowerCase()}`}>{rank}</span><i /><b>{label}</b><small>{date}</small>{index === 0 && <em>CURRENT</em>}</div>)}
        </div>
        <div className="profile-section-title"><span>SETTINGS</span></div>
        <div className="settings-card">
          <div className="setting-row"><span className="setting-icon"><Icon name="moon" size={17} /></span><div><b>Dark theme</b><small>Use the Obsidian interface</small></div><SettingToggle checked={darkTheme} onClick={() => setDarkTheme(!darkTheme)} /></div>
          <div className="setting-row"><span className="setting-icon"><Icon name="clock" size={17} /></span><div><b>Daily reminders</b><small>{reminders ? "Every day at 07:30 AM" : "Reminders paused"}</small></div><SettingToggle checked={reminders} onClick={() => setReminders(!reminders)} /></div>
          <button className="setting-row setting-link"><span className="setting-icon"><Icon name="bell" size={17} /></span><div><b>Notifications</b><small>Quests, streaks, and rewards</small></div><Icon name="arrow" size={15} /></button>
          <button className="setting-row setting-link"><span className="setting-icon"><Icon name="shield" size={17} /></span><div><b>Privacy & security</b><small>Account permissions and data</small></div><Icon name="arrow" size={15} /></button>
        </div>
        <button className="logout-button" onClick={logout}><Icon name="logout" size={17} /> Log out</button>
        <div className="app-version">LEVEL UP · VERSION 1.0.0</div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState(-1);
  const [focusAreas, setFocusAreas] = useState(["gym", "coding"]);
  const [template, setTemplate] = useState("gym");
  const [hour, setHour] = useState("07");

  const previous = () => setScreen((current) => Math.max(0, current - 1));
  const next = () => setScreen((current) => Math.min(5, current + 1));

  return (
    <div className="app-shell">
      <div className="phone">
        {screen === -1 && <Splash onContinue={() => setScreen(0)} />}
        {screen === 0 && <Login onContinue={next} />}
        {screen === 1 && <Welcome back={previous} next={next} />}
        {screen === 2 && <FocusAreas back={previous} next={next} selected={focusAreas} setSelected={setFocusAreas} />}
        {screen === 3 && <Templates back={previous} next={next} selected={template} setSelected={setTemplate} />}
        {screen === 4 && <Reminder back={previous} next={next} hour={hour} setHour={setHour} />}
        {screen === 5 && <Home restart={() => setScreen(-1)} openQuests={() => setScreen(6)} openStats={() => setScreen(12)} openChallenges={() => setScreen(13)} openNotifications={() => setScreen(14)} openProfile={() => setScreen(15)} />}
        {screen === 6 && <DailyQuests back={() => setScreen(5)} createQuest={() => setScreen(11)} openQuest={(type) => setScreen(type === "gym" ? 7 : 8)} />}
        {screen === 7 && <QuestDetail type="gym" back={() => setScreen(6)} complete={() => setScreen(9)} />}
        {screen === 8 && <QuestDetail type="study" back={() => setScreen(6)} complete={() => setScreen(9)} />}
        {screen === 9 && <Celebration variant="level" continueFlow={() => setScreen(5)} showRankVariant={() => setScreen(10)} />}
        {screen === 10 && <Celebration variant="rank" continueFlow={() => setScreen(5)} />}
        {screen === 11 && <CreateQuest back={() => setScreen(6)} saved={() => setScreen(6)} />}
        {screen === 12 && <StatsProgress back={() => setScreen(5)} />}
        {screen === 13 && <Challenges back={() => setScreen(5)} />}
        {screen === 14 && <Notifications back={() => setScreen(5)} />}
        {screen === 15 && <ProfileSettings back={() => setScreen(5)} logout={() => setScreen(0)} />}
      </div>
    </div>
  );
}
