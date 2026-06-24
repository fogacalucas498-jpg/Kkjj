import axios from "axios";

const BASE = import.meta.env.BASE_URL;
const API_BASE = BASE.endsWith("/") ? `${BASE}api` : `${BASE}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const loginPath = BASE.endsWith("/") ? `${BASE}login` : `${BASE}/login`;
      window.location.href = loginPath;
    }
    return Promise.reject(err);
  }
);

export interface User { id: number; name: string; email: string; avatar?: string | null; dashboardName?: string | null; }
export interface Agent {
  id: number; userId: number; name: string; description: string;
  instructions: string; responseDelaySecs: number; createdAt: string; updatedAt: string;
  whatsapp?: { status: string; phoneNumber?: string; qrCode?: string } | null;
  knowledge?: Knowledge[];
}
export interface Knowledge { id: number; agentId: number; title: string; content: string; createdAt: string; }
export interface Conversation {
  id: number; sessionId: number; contactPhone: string; contactName?: string;
  lastMessage?: string; lastMessageAt?: string; createdAt: string;
}
export interface Message { id: number; conversationId: number; content: string; role: string; createdAt: string; }

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ token: string; user: User }>("/auth/register", data).then(r => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>("/auth/login", data).then(r => r.data),
  me: () => api.get<User>("/auth/me").then(r => r.data),
  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; openaiApiKey?: string; avatar?: string | null; dashboardName?: string | null }) =>
    api.put<User>("/auth/profile", data).then(r => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<{ ok: boolean; message: string }>("/auth/password", data).then(r => r.data),
  getSettings: () =>
    api.get<{ hasOpenaiKey: boolean; memberSince: string }>("/auth/settings").then(r => r.data),
};

export interface AgentExport {
  version: string;
  exportedAt: string;
  name: string;
  description: string;
  instructions: string;
  knowledge: { title: string; content: string }[];
}

export const agentsApi = {
  list: () => api.get<Agent[]>("/agents").then(r => r.data),
  get: (id: number) => api.get<Agent>(`/agents/${id}`).then(r => r.data),
  create: (data: { name: string; description?: string; instructions?: string }) =>
    api.post<Agent>("/agents", data).then(r => r.data),
  update: (id: number, data: Partial<{ name: string; description: string; instructions: string; responseDelaySecs: number }>) =>
    api.put<Agent>(`/agents/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/agents/${id}`).then(r => r.data),
  export: (id: number) => api.get<AgentExport>(`/agents/${id}/export`).then(r => r.data),
  duplicate: (id: number) => api.post<Agent>(`/agents/${id}/duplicate`).then(r => r.data),
  importAgent: (data: Omit<AgentExport, "version" | "exportedAt">) =>
    api.post<Agent>("/agents/import", data).then(r => r.data),
  addKnowledge: (id: number, data: { title: string; content: string }) =>
    api.post<Knowledge>(`/agents/${id}/knowledge`, data).then(r => r.data),
  deleteKnowledge: (agentId: number, kid: number) =>
    api.delete(`/agents/${agentId}/knowledge/${kid}`).then(r => r.data),
};

export const whatsappApi = {
  connect: (agentId: number) => api.post(`/agents/${agentId}/whatsapp/connect`).then(r => r.data),
  status: (agentId: number) => api.get<{ status: string; qr: string | null; phoneNumber: string | null }>(
    `/agents/${agentId}/whatsapp/status`).then(r => r.data),
  disconnect: (agentId: number) => api.post(`/agents/${agentId}/whatsapp/disconnect`).then(r => r.data),
};

export const conversationsApi = {
  list: () => api.get<Conversation[]>("/conversations").then(r => r.data),
  get: (id: number) => api.get<Conversation & { messages: Message[] }>(`/conversations/${id}`).then(r => r.data),
  sendMessage: (id: number, content: string) =>
    api.post<Message>(`/conversations/${id}/messages`, { content }).then(r => r.data),
};

export interface Stats {
  totalAgents: number;
  connectedAgents: number;
  totalConversations: number;
  totalMessages: number;
  todayMessages: number;
  messagesPerDay: { day: string; count: number }[];
  avgResponseSecs: number | null;
}

export const statsApi = {
  get: () => api.get<Stats>("/stats").then(r => r.data),
};
