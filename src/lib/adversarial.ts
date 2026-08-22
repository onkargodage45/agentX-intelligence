import type { AdversarialConfig, Signal } from '@/types';
import { uid } from './utils';

export const DEFAULT_ADVERSARIAL: AdversarialConfig = {
  enabled: false,
  mode: 'live',
  simulateOpenAlexFailure: false,
  simulateNewsFailure: false,
  simulateConflictingEvidence: false,
  simulateLowConfidence: false,
  simulateResourceConstraint: false,
  maxToolCallsOverride: null,
};

export function shouldSimulateToolFailure(
  tool: 'OpenAlex' | 'Crossref' | 'Hacker News',
  adversarial: AdversarialConfig | undefined,
): boolean {
  if (!adversarial || !adversarial.enabled) return false;
  if (tool === 'OpenAlex' && adversarial.simulateOpenAlexFailure) return true;
  if (tool === 'Hacker News' && adversarial.simulateNewsFailure) return true;
  return false;
}

export function shouldSimulateConflict(
  adversarial: AdversarialConfig | undefined,
): boolean {
  return Boolean(adversarial?.enabled && adversarial.simulateConflictingEvidence);
}

export function shouldSimulateLowConfidence(
  adversarial: AdversarialConfig | undefined,
): boolean {
  return Boolean(adversarial?.enabled && adversarial.simulateLowConfidence);
}

export function getEffectiveMaxToolCalls(
  adversarial: AdversarialConfig | undefined,
  defaultMax: number,
): number {
  if (adversarial?.enabled && adversarial.simulateResourceConstraint && adversarial.maxToolCallsOverride) {
    return adversarial.maxToolCallsOverride;
  }
  return defaultMax;
}

/**
 * Generates simulated conflicting signals for adversarial test mode.
 * These are clearly labeled as simulated and do NOT fabricate real API results.
 */
export function generateConflictingNewsSignals(query: string): Signal[] {
  void query;
  return [
    {
      id: uid('adv-news'),
      title: '[SIMULATED] Industry adoption of AI agents appears limited',
      summary: 'SIMULATED ADVERSARIAL SIGNAL — Industry surveys suggest cautious adoption pace.',
      category: 'industry',
      source: 'Simulated (Adversarial Test)',
      sourceType: 'Hacker News',
      date: new Date().toISOString(),
      relevance: 55,
      priority: 'MEDIUM',
      url: '#adversarial-simulated',
    },
    {
      id: uid('adv-comp'),
      title: '[SIMULATED] Competitor activity in AI agents remains exploratory',
      summary: 'SIMULATED ADVERSARIAL SIGNAL — Limited competitor product launches detected.',
      category: 'competitor',
      source: 'Simulated (Adversarial Test)',
      sourceType: 'Hacker News',
      date: new Date().toISOString(),
      relevance: 50,
      priority: 'MEDIUM',
      url: '#adversarial-simulated',
    },
  ];
}

/**
 * Generates simulated low-confidence research signals for adversarial test mode.
 */
export function generateLowConfidenceResearchSignals(query: string): Signal[] {
  void query;
  return [
    {
      id: uid('adv-low'),
      title: '[SIMULATED] Preliminary research on AI agents — limited evidence',
      summary: 'SIMULATED ADVERSARIAL SIGNAL — Only weak preliminary results available.',
      category: 'research',
      source: 'Simulated (Adversarial Test)',
      sourceType: 'OpenAlex',
      date: new Date().toISOString(),
      relevance: 25,
      priority: 'LOW',
      url: '#adversarial-simulated',
    },
  ];
}
