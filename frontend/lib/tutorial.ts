export type TutorialStep = {
  route: string;
  targetId: string;
  title: string;
  description: string;
  nextLabel?: string;
  preferredPlacement?: "auto" | "above" | "below";
};

export const TUTORIAL_OVERLAY_SPACE = 220;

export const TUTORIAL_REVEAL_TARGETS = new Set([
  "chat-message-input",
  "chat-send",
  "profile-save"
]);

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    route: "/home",
    targetId: "home-open-lessons",
    title: "Lessons",
    description: "Start here to open the lesson list and review the program content.",
    preferredPlacement: "below"
  },
  {
    route: "/lessons",
    targetId: "lessons-view-first",
    title: "View Lesson",
    description: "Each lesson card includes a button like this so you can open the full lesson details.",
    preferredPlacement: "below"
  },
  {
    route: "/lessons/lesson-01",
    targetId: "lesson-detail-back",
    title: "Lesson Detail",
    description: "This screen shows the lesson summary, objectives, and activities. Use Back when you are ready to return.",
    preferredPlacement: "below"
  },
  {
    route: "/home",
    targetId: "home-open-chat",
    title: "Session Button",
    description: "Use this button to continue an active session or start a new one.",
    preferredPlacement: "above"
  },
  {
    route: "/chat",
    targetId: "chat-message-input",
    title: "Message Box",
    description: "Type your thoughts, questions, or updates here before you send them.",
    preferredPlacement: "above"
  },
  {
    route: "/chat",
    targetId: "chat-send",
    title: "Send",
    description: "Tap Send to add your message to the conversation and receive the next reply.",
    preferredPlacement: "above"
  },
  {
    route: "/home",
    targetId: "home-open-history",
    title: "Session History",
    description: "Open Session History to review the sessions that have already been saved to your account.",
    preferredPlacement: "above"
  },
  {
    route: "/history",
    targetId: "history-session-list",
    title: "Saved Sessions",
    description: "Your previous conversations appear here so you can revisit them later.",
    preferredPlacement: "below"
  },
  {
    route: "/home",
    targetId: "home-open-profile",
    title: "Edit Health Profile",
    description: "Use this to review or update the health information you entered during registration.",
    preferredPlacement: "above"
  },
  {
    route: "/profile",
    targetId: "profile-save",
    title: "Save Profile",
    description: "After changing any health details, tap Save Profile to keep your information up to date.",
    preferredPlacement: "above"
  },
  {
    route: "/home",
    targetId: "home-log-out",
    title: "Log Out",
    description: "When you are finished, Log Out signs you out and returns you to the welcome screen.",
    nextLabel: "Finish",
    preferredPlacement: "below"
  }
];
