import type {
  AgentId,
  EvidenceVerdict,
  MonitoringProfile,
  Priority,
  Signal,
} from '@/types';

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const AGENT_LABELS: Record<AgentId, string> = {
  orchestrator: 'Orchestrator',
  research: 'Research Agent',
  news: 'News Agent',
};

export const DEFAULT_PROFILE: MonitoringProfile = {
  organization: 'Microsoft',
  competitors: ['Google', 'Amazon', 'OpenAI', 'Anthropic'],
  researchTopics: [
    'Artificial Intelligence',
    'AI Agents',
    'Cloud Computing',
    'Cybersecurity',
    'Generative AI',
  ],
  keywords: ['Microsoft AI', 'Copilot', 'Azure AI', 'AI agents', 'generative AI'],
};

const PROFILE_KEY = 'agentx.profile.v1';

export function loadProfile(): MonitoringProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as MonitoringProfile;
    return {
      organization: parsed.organization?.trim() || DEFAULT_PROFILE.organization,
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : DEFAULT_PROFILE.competitors,
      researchTopics: Array.isArray(parsed.researchTopics) ? parsed.researchTopics : DEFAULT_PROFILE.researchTopics,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : DEFAULT_PROFILE.keywords,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: MonitoringProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota errors */
  }
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function priorityRank(p: Priority): number {
  return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[p];
}

export function formatDate(iso?: string): string {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'with', 'is', 'are', 'be', 'by',
  'recent', 'latest', 'current', 'find', 'what', 'how', 'why', 'compare', 'investigate', 'about',
  'into', 'versus', 'vs', 'their', 'this', 'that', 'these', 'those', 'from', 'as', 'at', 'it',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function relevanceScore(title: string, query: string, profile: MonitoringProfile): number {
  const tokens = tokenize(query);
  const topics = profile.researchTopics.flatMap((t) => tokenize(t));
  const keywords = profile.keywords.flatMap((t) => tokenize(t));
  const competitors = profile.competitors.flatMap((t) => tokenize(t));
  const text = (title || '').toLowerCase();

  let score = 0;
  for (const t of tokens) if (text.includes(t)) score += 2;
  for (const t of topics) if (text.includes(t)) score += 1.5;
  for (const t of keywords) if (text.includes(t)) score += 2;
  for (const t of competitors) if (text.includes(t)) score += 1.5;
  if (text.includes(profile.organization.toLowerCase())) score += 1;
  return clamp(Math.round((score / Math.max(1, tokens.length + 1)) * 22), 12, 98);
}

export function priorityFromRelevance(score: number): Priority {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

export function topSignals(signals: Signal[], n: number): Signal[] {
  return [...signals]
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || b.relevance - a.relevance)
    .slice(0, n);
}

export function evidenceVerdict(
  researchCount: number,
  newsCount: number,
  overlap: number,
): EvidenceVerdict {
  if (researchCount === 0 || newsCount === 0) return 'INSUFFICIENT';
  const overlapRatio = overlap / Math.min(researchCount, newsCount);
  if (overlapRatio >= 0.5) return 'CONSISTENT';
  if (overlapRatio >= 0.2) return 'PARTIAL';
  return 'CONFLICT';
}

export function confidence(results: number, sourcesOk: number, totalSources: number, agreementBoost: number): number {
  if (totalSources === 0) return 0;
  const base = clamp((results / Math.max(1, results + 2)) * 100, 0, 70);
  const sourceFactor = (sourcesOk / totalSources) * 25;
  return clamp(Math.round(base + sourceFactor + agreementBoost), 5, 96);
}

export function tokensOverlap(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return Array.from(new Set(a.filter((t) => setB.has(t))));
}
