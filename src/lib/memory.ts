import type {
  AgentId,
  InvestigationContext,
  LongTermMemory,
  MonitoringProfile,
  ScanSummary,
  Signal,
} from '@/types';
import { tokenize } from './utils';

const MEMORY_KEY = 'agentx_memory';
const RECENT_QUERIES_KEY = 'agentx_recent_queries';
const LAST_SCAN_KEY = 'agentx_last_scan';

const MAX_RECENT_QUERIES = 8;
const MAX_FREQUENT_TOPICS = 10;

export function createInitialContext(query: string, profile: MonitoringProfile): InvestigationContext {
  return {
    userQuery: query,
    organization: profile.organization,
    competitors: profile.competitors,
    topics: [...profile.researchTopics],
    keywords: [...profile.keywords],
    completedAgents: [],
    toolsUsed: [],
    researchFindings: [],
    newsFindings: [],
    importantSignals: [],
    evidenceCount: 0,
    currentStep: 'Orchestrator analyzing query',
  };
}

export function extractTopicsFromSignals(signals: Signal[], max = 6): string[] {
  const freq = new Map<string, number>();
  for (const s of signals) {
    const tokens = tokenize(s.title);
    for (const t of tokens) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

export function extractKeywordsFromSignals(signals: Signal[], max = 8): string[] {
  const freq = new Map<string, number>();
  for (const s of signals) {
    const tokens = tokenize(`${s.title} ${s.summary}`);
    for (const t of tokens) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

export function buildResearchContextMessage(ctx: InvestigationContext): string {
  if (ctx.researchFindings.length === 0) return '';
  const topics = ctx.topics.slice(0, 5);
  const findings = ctx.researchFindings.slice(0, 4);
  return (
    `Previous research investigation identified: ${topics.join(', ')} as important topics. ` +
    `Key findings: ${findings.join('; ')}. ` +
    `Use these signals when searching industry developments.`
  );
}

/* ---------------- Long-term memory persistence ---------------- */

export function loadLongTermMemory(): LongTermMemory | null {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LongTermMemory>;
    return {
      organization: parsed.organization ?? '',
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
      researchTopics: Array.isArray(parsed.researchTopics) ? parsed.researchTopics : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      recentQueries: Array.isArray(parsed.recentQueries) ? parsed.recentQueries : [],
      lastScan: parsed.lastScan,
      frequentTopics: Array.isArray(parsed.frequentTopics) ? parsed.frequentTopics : [],
    };
  } catch {
    return null;
  }
}

export function saveLongTermMemory(mem: LongTermMemory): void {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
  } catch {
    /* ignore quota */
  }
}

export function clearLongTermMemory(): void {
  try {
    localStorage.removeItem(MEMORY_KEY);
    localStorage.removeItem(RECENT_QUERIES_KEY);
    localStorage.removeItem(LAST_SCAN_KEY);
  } catch {
    /* ignore */
  }
}

export function addRecentQuery(query: string, existing: string[]): string[] {
  const deduped = [query, ...existing.filter((q) => q !== query)];
  return deduped.slice(0, MAX_RECENT_QUERIES);
}

export function updateFrequentTopics(
  newTopics: string[],
  existing: string[],
): string[] {
  const freq = new Map<string, number>();
  for (const t of existing) freq.set(t, (freq.get(t) ?? 0) + 1);
  for (const t of newTopics) freq.set(t, (freq.get(t) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_FREQUENT_TOPICS)
    .map(([w]) => w);
}

export function buildScanSummary(
  query: string,
  signals: Signal[],
  verdict: string,
  topics: string[],
): ScanSummary {
  return {
    query,
    timestamp: Date.now(),
    signalCount: signals.length,
    verdict: verdict as ScanSummary['verdict'],
    topTopics: topics.slice(0, 5),
  };
}

/* ---------------- Memory Boost detection ---------------- */

export interface MemoryBoostResult {
  matched: boolean;
  message: string;
  previousTopics: string[];
  previousKeywords: string[];
  previousQuery?: string;
}

export function detectMemoryBoost(
  query: string,
  memory: LongTermMemory | null,
): MemoryBoostResult {
  if (!memory) {
    return { matched: false, message: 'No previous monitoring context found.', previousTopics: [], previousKeywords: [] };
  }

  const queryTokens = new Set(tokenize(query));
  const prevTopics = memory.researchTopics.flatMap(tokenize);
  const prevKeywords = memory.keywords.flatMap(tokenize);
  const allPrev = [...new Set([...prevTopics, ...prevKeywords])];

  const overlaps = allPrev.filter((t) => queryTokens.has(t));

  if (overlaps.length === 0) {
    return {
      matched: false,
      message: 'No previous monitoring context found.',
      previousTopics: [],
      previousKeywords: [],
    };
  }

  return {
    matched: true,
    message: `Previous monitoring context found — ${overlaps.length} overlapping topic${overlaps.length > 1 ? 's' : ''}: ${overlaps.slice(0, 4).join(', ')}.`,
    previousTopics: memory.researchTopics,
    previousKeywords: memory.keywords,
    previousQuery: memory.recentQueries[0],
  };
}
