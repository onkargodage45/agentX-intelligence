import type { AgentResult, Signal } from '@/types';
import { callCrossref, callOpenAlex, type ToolContext, type ToolOutcome } from './tools';
import type { AgentRuntime } from './runtime';
import { confidence, wait } from './utils';
import { shouldSimulateToolFailure } from './adversarial';
import { MAX_RETRIES_PER_TOOL } from './graph';

/**
 * Research Agent — with retry, tool fallback, and resource awareness.
 *
 * Primary: OpenAlex
 * Fallback: Crossref
 *
 * On failure: detect → record → retry (up to MAX_RETRIES_PER_TOOL) → fallback → continue.
 */
export async function runResearchAgent(
  rt: AgentRuntime,
  opts: { requestCrossref: boolean },
): Promise<AgentResult> {
  const { emit, profile, query, adversarial } = rt;

  emit.agentStatus('research', 'WORKING');
  emit.decision({
    agentId: 'research',
    type: 'reason',
    text: 'Research Agent analyzing request — selecting research sources.',
  });
  await wait(450);

  const baseCtx: ToolContext = {
    query,
    profile,
    signalCategory: 'research',
    sourceType: 'OpenAlex',
    maxResults: 12,
  };

  const signals: Signal[] = [];
  const toolRecords: { name: 'OpenAlex' | 'Crossref'; ok: boolean; count: number }[] = [];

  // --- Tool 1: OpenAlex (primary) with retry ---
  let openAlexSucceeded = false;
  let openAlexAttempts = 0;
  const maxRetries = MAX_RETRIES_PER_TOOL;

  while (openAlexAttempts <= maxRetries && !openAlexSucceeded) {
    const isRetry = openAlexAttempts > 0;
    const toolBudgetRemaining = rt.maxToolCalls - rt.toolCallsUsed();

    if (toolBudgetRemaining <= 0) {
      emit.decision({
        agentId: 'research',
        type: 'resource',
        text: 'Tool budget exhausted — skipping OpenAlex call.',
      });
      break;
    }

    const oaId = emit.tool({
      tool: 'OpenAlex',
      agentId: 'research',
      status: 'CALLING',
      query: isRetry ? `${query} (retry ${openAlexAttempts})` : query,
      results: 0,
    });

    if (!isRetry) {
      emit.decision({
        agentId: 'research',
        type: 'tool',
        text: 'OpenAlex selected — querying recent academic works.',
      });
    } else {
      emit.decision({
        agentId: 'research',
        type: 'tool',
        text: `OpenAlex retry ${openAlexAttempts}/${maxRetries} — previous attempt failed.`,
      });
    }

    rt.incrementToolCall();
    await wait(500);

    // Check adversarial simulation
    const simulateFailure = shouldSimulateToolFailure('OpenAlex', adversarial);
    let oa: ToolOutcome;

    if (simulateFailure && openAlexAttempts < maxRetries) {
      // Simulate failure on first attempts
      oa = { ok: false, error: 'Simulated OpenAlex failure (Adversarial Test Mode)' };
    } else if (simulateFailure && openAlexAttempts === maxRetries) {
      // On final retry, still fail → trigger fallback
      oa = { ok: false, error: 'Simulated OpenAlex failure (Adversarial Test Mode)' };
    } else {
      oa = await callOpenAlex({ ...baseCtx, sourceType: 'OpenAlex' });
    }

    if (oa.ok) {
      emit.toolUpdate(oaId, { status: oa.count > 0 ? 'SUCCESS' : 'NO RESULTS', results: oa.count });
      toolRecords.push({ name: 'OpenAlex', ok: true, count: oa.count });
      if (oa.signals.length) {
        signals.push(...oa.signals);
        emit.decision({
          agentId: 'research',
          type: 'observe',
          text: `OpenAlex returned ${oa.count} research works.`,
        });
      } else {
        emit.decision({
          agentId: 'research',
          type: 'observe',
          text: 'OpenAlex returned no matching works.',
        });
      }
      openAlexSucceeded = true;
    } else {
      emit.toolUpdate(oaId, { status: 'ERROR', results: 0, detail: oa.error });
      toolRecords.push({ name: 'OpenAlex', ok: false, count: 0 });
      emit.decision({
        agentId: 'research',
        type: 'observe',
        text: `OpenAlex error: ${oa.error}.`,
      });

      if (openAlexAttempts < maxRetries) {
        emit.decision({
          agentId: 'research',
          type: 'fallback',
          text: `Retry ${openAlexAttempts + 1}/${maxRetries} — attempting OpenAlex again.`,
        });
        await wait(400);
      } else {
        emit.decision({
          agentId: 'research',
          type: 'fallback',
          text: 'OpenAlex failed after max retries. Fallback to Crossref activated.',
        });
      }
    }
    openAlexAttempts++;
  }

  // --- Tool 2: Crossref (fallback or supplementary) ---
  const fewResults = signals.length < 4;
  const openAlexFailed = !openAlexSucceeded;
  const shouldCallCrossref = opts.requestCrossref || fewResults || openAlexFailed;

  if (shouldCallCrossref) {
    const toolBudgetRemaining = rt.maxToolCalls - rt.toolCallsUsed();

    if (toolBudgetRemaining <= 0) {
      emit.decision({
        agentId: 'research',
        type: 'resource',
        text: 'Tool budget exhausted — skipping Crossref call.',
      });
    } else {
      if (openAlexFailed) {
        emit.decision({
          agentId: 'research',
          type: 'fallback',
          text: 'FALLBACK: Crossref selected as primary research source after OpenAlex failure.',
        });
      } else {
        emit.decision({
          agentId: 'research',
          type: 'reason',
          text: fewResults
            ? 'OpenAlex evidence is thin — requesting supplementary publication coverage from Crossref.'
            : 'Crossref selected to broaden publication coverage.',
        });
      }
      await wait(400);

      let crossrefAttempts = 0;
      let crossrefSucceeded = false;

      while (crossrefAttempts <= maxRetries && !crossrefSucceeded) {
        const budgetRemaining = rt.maxToolCalls - rt.toolCallsUsed();
        if (budgetRemaining <= 0) {
          emit.decision({
            agentId: 'research',
            type: 'resource',
            text: 'Tool budget exhausted — skipping Crossref.',
          });
          break;
        }

        const crId = emit.tool({
          tool: 'Crossref',
          agentId: 'research',
          status: 'CALLING',
          query: crossrefAttempts > 0 ? `${query} (retry ${crossrefAttempts})` : query,
          results: 0,
        });

        if (crossrefAttempts > 0) {
          emit.decision({
            agentId: 'research',
            type: 'tool',
            text: `Crossref retry ${crossrefAttempts}/${maxRetries}.`,
          });
        }

        rt.incrementToolCall();
        await wait(450);

        const cr = await callCrossref({ ...baseCtx, sourceType: 'Crossref', maxResults: 10 });

        if (cr.ok) {
          emit.toolUpdate(crId, { status: cr.count > 0 ? 'SUCCESS' : 'NO RESULTS', results: cr.count });
          toolRecords.push({ name: 'Crossref', ok: true, count: cr.count });
          if (cr.signals.length) {
            signals.push(...cr.signals);
            emit.decision({
              agentId: 'research',
              type: 'observe',
              text: `Crossref returned ${cr.count} additional publications.`,
            });
          }
          crossrefSucceeded = true;
        } else {
          emit.toolUpdate(crId, { status: 'ERROR', results: 0, detail: cr.error });
          toolRecords.push({ name: 'Crossref', ok: false, count: 0 });
          emit.decision({
            agentId: 'research',
            type: 'observe',
            text: `Crossref error: ${cr.error}.`,
          });

          if (crossrefAttempts < maxRetries) {
            emit.decision({
              agentId: 'research',
              type: 'fallback',
              text: `Retry ${crossrefAttempts + 1}/${maxRetries} — attempting Crossref again.`,
            });
            await wait(400);
          } else {
            emit.decision({
              agentId: 'research',
              type: 'fallback',
              text: 'Crossref also failed. Proceeding with available evidence.',
            });
          }
        }
        crossrefAttempts++;
      }
    }
  } else {
    emit.decision({
      agentId: 'research',
      type: 'reason',
      text: 'OpenAlex evidence is sufficient — Crossref not required for this query.',
    });
  }

  const successSources = toolRecords.filter((t) => t.ok).length;
  const totalSources = toolRecords.length;
  const conf = confidence(
    signals.length,
    successSources,
    Math.max(1, totalSources),
    successSources > 1 ? 6 : 0,
  );

  const deduped = dedupeSignals(signals);
  const result: AgentResult = {
    agentId: 'research',
    signals: deduped,
    confidence: conf,
    resultCount: deduped.length,
    note:
      deduped.length === 0
        ? 'No research signals returned from available sources.'
        : undefined,
  };

  emit.agentStatus('research', deduped.length > 0 ? 'COMPLETED' : 'ERROR');
  emit.decision({
    agentId: 'research',
    type: 'evaluate',
    text: `Research evidence evaluated — ${deduped.length} signals, confidence ${conf}%.`,
  });
  return result;
}

function dedupeSignals(signals: Signal[]): Signal[] {
  const seen = new Set<string>();
  return signals.filter((s) => {
    const key = s.title.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
