export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  userName: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
};

export type LessonSummary = {
  id: string;
  week: number;
  slug: string;
  title: string;
  phase: string;
  summary: string;
  status: string;
};

export type LessonSection = {
  type: string;
  title: string;
  content?: string;
  items: string[];
};

export type LessonActivityField = {
  id: string;
  label: string;
  kind: string;
  placeholder?: string;
};

export type LessonActivity = {
  type: string;
  title: string;
  prompt: string;
  fields: LessonActivityField[];
};

export type LessonDetail = LessonSummary & {
  objectives: string[];
  sections: LessonSection[];
  activity?: LessonActivity | null;
};

type BackendLoginResponse = {
  access_token: string;
  token_type: string;
  user_name: string;
};

type BackendConversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type BackendMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type BackendLessonSummary = {
  id: string;
  week: number;
  slug: string;
  title: string;
  phase: string;
  summary: string;
  status: string;
};

type BackendLessonDetail = BackendLessonSummary & {
  objectives: string[];
  sections: LessonSection[];
  activity?: LessonActivity | null;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

let accessToken: string | null = null;
let activeConversationId: string | null = null;
let currentUserName = "";

export function logout() {
  accessToken = null;
  activeConversationId = null;
  currentUserName = "";
}

export function resetClientStateForTests() {
  logout();
}

function mapMessage(message: BackendMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.content,
    createdAt: message.created_at
  };
}

function mapConversation(conversation: BackendConversation): ChatSession {
  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updated_at
  };
}

function mapLessonSummary(lesson: BackendLessonSummary): LessonSummary {
  return {
    id: lesson.id,
    week: lesson.week,
    slug: lesson.slug,
    title: lesson.title,
    phase: lesson.phase,
    summary: lesson.summary,
    status: lesson.status
  };
}

function mapLessonDetail(lesson: BackendLessonDetail): LessonDetail {
  return {
    ...mapLessonSummary(lesson),
    objectives: lesson.objectives,
    sections: lesson.sections,
    activity: lesson.activity ?? null
  };
}

function ensureAuthenticated() {
  if (!accessToken) {
    throw new Error("Please log in to continue");
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { detail?: string | { msg?: string }[] };

    if (typeof body.detail === "string") {
      return body.detail;
    }

    if (Array.isArray(body.detail) && body.detail.length > 0) {
      return body.detail[0]?.msg ?? `Request failed with status ${response.status}`;
    }
  } catch {
    return `Request failed with status ${response.status}`;
  }

  return `Request failed with status ${response.status}`;
}

async function listConversations(): Promise<BackendConversation[]> {
  ensureAuthenticated();
  return request<BackendConversation[]>("/conversations");
}

async function getActiveConversationId(createIfMissing: boolean): Promise<string | null> {
  if (activeConversationId) {
    return activeConversationId;
  }

  const conversations = await listConversations();
  const latestConversation = conversations[conversations.length - 1];

  if (latestConversation) {
    activeConversationId = latestConversation.id;
    return activeConversationId;
  }

  if (!createIfMissing) {
    return null;
  }

  const title = currentUserName ? `${currentUserName}'s Session` : "Therapy Session";
  const created = await request<BackendConversation>("/conversations", {
    method: "POST",
    body: JSON.stringify({ title })
  });

  activeConversationId = created.id;
  return activeConversationId;
}

export async function login({ email, password }: LoginRequest): Promise<LoginResponse> {
  activeConversationId = null;

  const response = await request<BackendLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  accessToken = response.access_token;
  currentUserName = response.user_name;

  return {
    accessToken: response.access_token,
    userName: response.user_name
  };
}

export async function register({ email, password }: LoginRequest): Promise<LoginResponse> {
  activeConversationId = null;

  const response = await request<BackendLoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  accessToken = response.access_token;
  currentUserName = response.user_name;

  return {
    accessToken: response.access_token,
    userName: response.user_name
  };
}

export async function fetchMessages(): Promise<ChatMessage[]> {
  const conversationId = await getActiveConversationId(false);

  if (!conversationId) {
    return [];
  }

  const messages = await request<BackendMessage[]>(
    `/conversations/${conversationId}/messages`
  );

  return messages.map(mapMessage);
}

export async function sendMessage(text: string): Promise<ChatMessage[]> {
  const conversationId = await getActiveConversationId(true);

  if (!conversationId) {
    throw new Error("Conversation could not be created");
  }

  await request<BackendMessage>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ role: "user", content: text })
  });

  await request<BackendMessage>(`/conversations/${conversationId}/assistant-reply`, {
    method: "POST"
  });

  const messages = await request<BackendMessage[]>(
    `/conversations/${conversationId}/history`
  );

  return messages.map(mapMessage);
}

export async function fetchChatHistory(): Promise<ChatSession[]> {
  const conversations = await listConversations();
  return conversations.map(mapConversation);
}

export async function fetchLessons(): Promise<LessonSummary[]> {
  ensureAuthenticated();
  const lessons = await request<BackendLessonSummary[]>("/lessons");
  return lessons.map(mapLessonSummary);
}

export async function fetchLesson(lessonId: string): Promise<LessonDetail> {
  ensureAuthenticated();
  const lesson = await request<BackendLessonDetail>(`/lessons/${lessonId}`);
  return mapLessonDetail(lesson);
}
