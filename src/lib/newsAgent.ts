import type { AgentResult, Signal } from '@/types';
import { callHackerNews, type ToolContext } from './tools';
import type { AgentRuntime } from './runtime';
import { confidence, tokenize, wait } from './utils';
import { shouldSimulateToolFailure } from './adversarial';
import { MAX_RETRIES_PER_TOOL } from './graph';

/**
 * News Agent — with retry, failure recovery, and resource awareness.
 *
 * Primary: Hacker News
 * Fallback: None configured — if HN fails, clearly marks source unavailable and continues.
 *
 * Memory-aware: uses research findings and topics from the shared InvestigationContext.
 */
export async function runNewsAgent(rt: AgentRuntime): Promise<AgentResult> {
  const { emit, profile, query, context, adversarial } = rt;

  emit.agentStatus('news', 'WORKING');
  emit.decision({
    agentId: 'news',
    type: 'reason',
    text: 'News Agent analyzing request — selecting industry intelligence source.',
  });

  const researchTopics = context.researchFindings.length > 0
    ? context.topics.slice(0, 5)
    : [];

  if (researchTopics.length > 0) {
    emit.decision({
      agentId: 'news',
      type: 'reason',
      text: `Using research context — previous topics: ${researchTopics.slice(0, 3).join(', ')}.`,
    });
  }

  await wait(450);

  const augmentedQuery = researchTopics.length > 0
    ? `${query} ${researchTopics.join(' ')}`
    : query;

  const ctx: ToolContext = {
    query: augmentedQuery,
    profile: {
      ...profile,
      researchTopics: Array.from(new Set([...profile.researchTopics, ...researchTopics])),
    },
    signalCategory: 'industry',
    sourceType: 'Hacker News',
    maxResults: 12,
  };

  // --- Hacker News with retry ---
  let signals: Signal[] = [];
  let hnSucceeded = false;
  let hnAttempts = 0;
  const maxRetries = MAX_RETRIES_PER_TOOL;

  while (hnAttempts <= maxRetries && !hnSucceeded) {
    const toolBudgetRemaining = rt.maxToolCalls - rt.toolCallsUsed();

    if (toolBudgetRemaining <= 0) {
      emit.decision({
        agentId: 'news',
        type: 'resource',
        text: 'Tool budget exhausted — skipping Hacker News call.',
      });
      break;
    }

    const hnId = emit.tool({
      tool: 'Hacker News',
      agentId: 'news',
      status: 'CALLING',
      query: hnAttempts > 0 ? `${augmentedQuery} (retry ${hnAttempts})` : augmentedQuery,
      results: 0,
    });

    if (hnAttempts === 0) {
      emit.decision({
        agentId: 'news',
        type: 'tool',
        text: 'Hacker News selected — scanning recent stories for relevance.',
      });
    } else {
      emit.decision({
        agentId: 'news',
        type: 'tool',
        text: `Hacker News retry ${hnAttempts}/${maxRetries} — previous attempt failed.`,
      });
    }

    rt.incrementToolCall();
    await wait(500);

    const simulateFailure = shouldSimulateToolFailure('Hacker News', adversarial);
    let hn;

    if (simulateFailure && hnAttempts < maxRetries) {
      hn = { ok: false as const, error: 'Simulated Hacker News failure (Adversarial Test Mode)' };
    } else if (simulateFailure && hnAttempts === maxRetries) {
      hn = { ok: false as const, error: 'Simulated Hacker News failure (Adversarial Test Mode)' };
    } else {
      hn = await callHackerNews(ctx);
    }

    if (hn.ok) {
      emit.toolUpdate(hnId, { status: hn.count > 0 ? 'SUCCESS' : 'NO RESULTS', results: hn.count });
      signals = hn.signals;
      emit.decision({
        agentId: 'news',
        type: 'observe',
        text: hn.count > 0
          ? `Hacker News returned ${hn.count} relevant industry stories.`
          : 'Hacker News returned no matching stories in the recent window.',
      });
      hnSucceeded = true;
    } else {
      emit.toolUpdate(hnId, { status: 'ERROR', results: 0, detail: hn.error });
      emit.decision({
        agentId: 'news',
        type: 'observe',
        text: `Hacker News error: ${hn.error}.`,
      });

      if (hnAttempts < maxRetries) {
        emit.decision({
          agentId: 'news',
          type: 'fallback',
          text: `Retry ${hnAttempts + 1}/${maxRetries} — attempting Hacker News again.`,
        });
        await wait(400);
      } else {
        emit.decision({
          agentId: 'news',
          type: 'fallback',
          text: 'Hacker News failed after max retries. No fallback news source configured — marking unavailable and continuing.',
        });
        emit.decision({
          agentId: 'news',
          type: 'fallback',
          text: 'News source marked UNAVAILABLE. Investigation continues with other available evidence.',
        });
      }
    }
    hnAttempts++;
  }

  // Tag competitor mentions
  const competitorTokens = profile.competitors.flatMap((c) => c.toLowerCase().split(/\s+/));
  for (const s of signals) {
    const text = `${s.title} ${s.summary}`.toLowerCase();
    if (competitorTokens.some((c) => c.length > 2 && text.includes(c))) {
      s.category = 'competitor';
    }
  }

  const conf = confidence(signals.length, hnSucceeded ? 1 : 0, 1, 0);

  const result: AgentResult = {
    agentId: 'news',
    signals,
    confidence: conf,
    resultCount: signals.length,
    note: signals.length === 0
      ? 'No industry signals returned — Hacker News unavailable or no matching stories.'
      : undefined,
  };

  emit.agentStatus('news', signals.length > 0 ? 'COMPLETED' : 'ERROR');
  emit.decision({
    agentId: 'news',
    type: 'evaluate',
    text: `Industry evidence evaluated — ${signals.length} signals, confidence ${conf}%.`,
  });
  return result;
}
