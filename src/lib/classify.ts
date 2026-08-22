export type QueryIntent = 'research' | 'news' | 'mixed';

export interface Classification {
  intent: QueryIntent;
  needsResearch: boolean;
  needsNews: boolean;
  rationale: string;
}

const RESEARCH_CUES = [
  'research', 'study', 'studies', 'paper', 'papers', 'publication', 'publications',
  'academic', 'scientific', 'literature', 'arxiv', 'scholar', 'author', 'findings',
  'survey', 'benchmark', 'theory', 'experiment', 'survey',
];

const NEWS_CUES = [
  'news', 'industry', 'competitor', 'development', 'developments', 'product', 'launch',
  'company', 'companies', 'startup', 'startups', 'market', 'trend', 'trends', 'stock',
  'funding', 'acquisition', 'release', 'shipping', 'deploy', 'announced', 'update',
  'updates', 'hacker news', 'current',
];

const MIXED_CUES = ['compare', 'comparison', 'versus', 'vs', 'both', 'alongside', 'correlate', 'cross'];

function containsAny(text: string, cues: string[]): string[] {
  return cues.filter((c) => text.includes(c));
}

export function classifyQuery(query: string): Classification {
  const text = ` ${query.toLowerCase()} `;
  const rHits = containsAny(text, RESEARCH_CUES);
  const nHits = containsAny(text, NEWS_CUES);
  const mHits = containsAny(text, MIXED_CUES);

  const needsResearch = rHits.length > 0 || mHits.length > 0;
  const needsNews = nHits.length > 0 || mHits.length > 0;

  let intent: QueryIntent = 'mixed';
  let rationale = 'Query references both research and industry signals; engaging multiple agents.';

  if (needsResearch && !needsNews) {
    intent = 'research';
    rationale = 'Query is research-oriented; Research Agent is sufficient.';
  } else if (needsNews && !needsResearch) {
    intent = 'news';
    rationale = 'Query is industry/competitor-oriented; News Agent is sufficient.';
  } else if (!needsResearch && !needsNews) {
    // Ambiguous default: run both agents to gather broad evidence.
    intent = 'mixed';
    rationale = 'Query intent is broad; engaging both agents to gather complementary evidence.';
  }

  void rHits;
  void nHits;
  return { intent, needsResearch, needsNews, rationale };
}
