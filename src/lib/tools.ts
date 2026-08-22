import type { MonitoringProfile, Signal } from '@/types';
import {
  formatDate,
  priorityFromRelevance,
  relevanceScore,
  tokenize,
  uid,
} from './utils';

export interface ToolSuccess {
  ok: true;
  signals: Signal[];
  count: number;
}

export interface ToolFailure {
  ok: false;
  error: string;
}

export type ToolOutcome = ToolSuccess | ToolFailure;

export interface ToolContext {
  query: string;
  profile: MonitoringProfile;
  signalCategory: 'research' | 'competitor' | 'industry';
  sourceType: 'OpenAlex' | 'Crossref' | 'Hacker News';
  maxResults: number;
}

async function fetchWithTimeout(url: string, ms = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

function buildResearchQuery(query: string, profile: MonitoringProfile): string {
  const tokens = tokenize(query);
  const topicTokens = profile.researchTopics.flatMap(tokenize).slice(0, 6);
  const all = Array.from(new Set([...tokens, ...topicTokens])).slice(0, 8);
  return all.join(' ');
}

/* ---------------- OpenAlex ---------------- */

interface OpenAlexWork {
  id?: string;
  title?: string;
  display_name?: string;
  publication_date?: string;
  doi?: string;
  cited_by_count?: number;
  authorships?: { author?: { display_name?: string } }[];
  primary_location?: { source?: { display_name?: string }; landing_page_url?: string };
  abstract_inverted_index?: Record<string, number[]>;
}

function decodeAbstract(inverted?: Record<string, number[]>): string {
  if (!inverted) return '';
  const positions: { word: string; pos: number }[] = [];
  for (const [word, idxs] of Object.entries(inverted)) {
    for (const pos of idxs) positions.push({ word, pos });
  }
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map((p) => p.word).join(' ').slice(0, 240);
}

export async function callOpenAlex(ctx: ToolContext): Promise<ToolOutcome> {
  const q = buildResearchQuery(ctx.query, ctx.profile);
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(q)}` +
    `&per-page=${ctx.maxResults}&sort=cited_by_count:desc&filter=from_publication_date:2020-01-01`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { ok: false, error: `OpenAlex HTTP ${res.status}` };
    const data = (await res.json()) as { results?: OpenAlexWork[] };
    const works = Array.isArray(data.results) ? data.results : [];
    if (works.length === 0) return { ok: true, signals: [], count: 0 };

    const signals: Signal[] = works.map((w) => {
      const title = w.title || w.display_name || 'Untitled work';
      const date = w.publication_date || '';
      const author = w.authorships?.[0]?.author?.display_name;
      const sourceName = w.primary_location?.source?.display_name || 'OpenAlex';
      const landing = w.primary_location?.landing_page_url;
      const url = landing || (w.doi ? `https://doi.org/${w.doi}` : w.id || 'https://openalex.org');
      const abstract = decodeAbstract(w.abstract_inverted_index);
      const rel = relevanceScore(`${title} ${abstract}`, ctx.query, ctx.profile);
      return {
        id: uid('oa'),
        title,
        summary: abstract || `${sourceName} · ${w.cited_by_count ?? 0} citations.`,
        category: ctx.signalCategory,
        source: sourceName,
        sourceType: 'OpenAlex',
        date,
        relevance: rel,
        priority: priorityFromRelevance(rel),
        url,
        by: author,
      };
    });
    return { ok: true, signals, count: signals.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'OpenAlex fetch failed' };
  }
}

/* ---------------- Crossref ---------------- */

interface CrossrefItem {
  title?: string[];
  'container-title'?: string[];
  'published-print'?: { 'date-parts'?: number[][] };
  'published-online'?: { 'date-parts'?: number[][] };
  created?: { 'date-parts'?: number[][] };
  DOI?: string;
  URL?: string;
  author?: { given?: string; family?: string }[];
  abstract?: string;
}

function crossrefDate(item: CrossrefItem): string {
  const parts =
    item['published-print']?.['date-parts']?.[0] ||
    item['published-online']?.['date-parts']?.[0] ||
    item.created?.['date-parts']?.[0];
  if (!parts || parts.length === 0) return '';
  const [y, m, d] = parts;
  return `${y}-${String(m || 1).padStart(2, '0')}-${String(d || 1).padStart(2, '0')}`;
}

export async function callCrossref(ctx: ToolContext): Promise<ToolOutcome> {
  const q = buildResearchQuery(ctx.query, ctx.profile);
  const url =
    `https://api.crossref.org/works?query=${encodeURIComponent(q)}` +
    `&rows=${ctx.maxResults}&select=title,container-title,DOI,URL,author,published-print,published-online,created,abstract`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { ok: false, error: `Crossref HTTP ${res.status}` };
    const data = (await res.json()) as { message?: { items?: CrossrefItem[] } };
    const items = data.message?.items ?? [];
    if (items.length === 0) return { ok: true, signals: [], count: 0 };

    const signals: Signal[] = items.map((item) => {
      const title = item.title?.[0] || 'Untitled article';
      const date = crossrefDate(item);
      const venue = item['container-title']?.[0] || 'Crossref';
      const author = item.author?.[0]
        ? `${item.author[0].given ?? ''} ${item.author[0].family ?? ''}`.trim()
        : undefined;
      const href = item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : 'https://crossref.org');
      const abstract = (item.abstract || '').replace(/<[^>]+>/g, '').slice(0, 240);
      const rel = relevanceScore(`${title} ${abstract} ${venue}`, ctx.query, ctx.profile);
      return {
        id: uid('cr'),
        title,
        summary: abstract || `${venue} · DOI ${item.DOI ?? 'n/a'}.`,
        category: ctx.signalCategory,
        source: venue,
        sourceType: 'Crossref',
        date,
        relevance: rel,
        priority: priorityFromRelevance(rel),
        url: href,
        by: author,
      };
    });
    return { ok: true, signals, count: signals.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Crossref fetch failed' };
  }
}

/* ---------------- Hacker News ---------------- */

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  by?: string;
  score?: number;
  time?: number;
  text?: string;
  descendants?: number;
}

export async function callHackerNews(ctx: ToolContext): Promise<ToolOutcome> {
  try {
    const listRes = await fetchWithTimeout('https://hacker-news.firebaseio.com/v0/newstories.json');
    if (!listRes.ok) return { ok: false, error: `Hacker News HTTP ${listRes.status}` };
    const ids = (await listRes.json()) as number[];
    if (!Array.isArray(ids) || ids.length === 0) return { ok: true, signals: [], count: 0 };

    // Inspect a recent window; HN newstories rotates fast. Limit concurrency.
    const candidateIds = ids.slice(0, 40);
    const items = await Promise.all(
      candidateIds.map(async (id) => {
        try {
          const r = await fetchWithTimeout(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, 10000);
          if (!r.ok) return null;
          return (await r.json()) as HNItem;
        } catch {
          return null;
        }
      }),
    );

    const queryTokens = tokenize(ctx.query);
    const topicTokens = ctx.profile.researchTopics.flatMap(tokenize);
    const keywordTokens = ctx.profile.keywords.flatMap(tokenize);
    const competitorTokens = ctx.profile.competitors.flatMap((c) => tokenize(c));
    const matchTokens = Array.from(
      new Set([...queryTokens, ...topicTokens, ...keywordTokens, ...competitorTokens]),
    );

    const scored = items
      .filter((it): it is HNItem => !!it && !!it.title)
      .map((it) => {
        const text = `${it.title} ${it.text || ''}`.toLowerCase();
        const hits = matchTokens.filter((t) => text.includes(t)).length;
        const scoreBoost = Math.min((it.score ?? 0) / 200, 5);
        return { it, rank: hits * 3 + scoreBoost };
      })
      .filter((r) => r.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, ctx.maxResults);

    if (scored.length === 0) return { ok: true, signals: [], count: 0 };

    const signals: Signal[] = scored.map(({ it }) => {
      const title = it.title || 'HN story';
      const date = it.time ? new Date(it.time * 1000).toISOString() : '';
      const href = it.url || `https://news.ycombinator.com/item?id=${it.id}`;
      const rel = clampRel(Math.round(30 + (scored[0]?.rank || 1) * 4));
      return {
        id: uid('hn'),
        title,
        summary: `${it.score ?? 0} points · ${it.descendants ?? 0} comments · by ${it.by ?? 'unknown'}`,
        category: ctx.signalCategory,
        source: 'Hacker News',
        sourceType: 'Hacker News',
        date,
        relevance: rel,
        priority: priorityFromRelevance(rel),
        url: href,
        by: it.by,
      };
    });
    return { ok: true, signals, count: signals.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Hacker News fetch failed' };
  }
}

function clampRel(n: number): number {
  return Math.max(15, Math.min(96, n));
}

void formatDate;
