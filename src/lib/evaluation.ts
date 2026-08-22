import type {
  AdversarialConfig,
  EvidenceVerdict,
  EvaluationScenario,
  EvaluationScenarioId,
  EvaluationTestRecord,
  EvaluationSummary,
  EvaluationMetricScore,
  MonitoringProfile,
  ScanState,
  ToolStatus,
} from '@/types';
import { DEFAULT_ADVERSARIAL } from '@/types';
import { uid } from './utils';

/* ---------------- Test Scenarios ---------------- */

export const EVALUATION_SCENARIOS: EvaluationScenario[] = [
  {
    id: 'normal',
    label: 'Normal Query',
    description: 'A clear, well-formed intelligence query. The agent should gather evidence from both research and news sources, synthesize a coherent report, and produce a confident verdict.',
    query: 'Investigate AI agent research, competitor activity and industry trends. Identify the three most important signals and recommend what an organization should do next.',
    adversarialOverrides: {},
    expectedOutcome: 'Multi-source evidence gathered, consistent or partial verdict, confidence >= 50%, actionable intelligence report produced.',
    expectedVerdict: 'ANY',
    expectedMinConfidence: 50,
    expectRecovery: false,
    expectUncertainty: false,
    repeatCount: 1,
  },
  {
    id: 'ambiguous',
    label: 'Ambiguous Query',
    description: 'A vague query with no clear intent. The agent should recognize ambiguity, engage both agents for broad coverage, and avoid overcommitting to a single conclusion.',
    query: 'something about AI',
    adversarialOverrides: {},
    expectedOutcome: 'Agent engages broad search, does not hallucinate specific claims, reports uncertainty if evidence is thin.',
    expectedVerdict: 'ANY',
    expectedMinConfidence: 10,
    expectRecovery: false,
    expectUncertainty: true,
    repeatCount: 1,
  },
  {
    id: 'adversarial',
    label: 'Adversarial Query',
    description: 'Adversarial mode with simulated tool failures. The agent must detect failures, retry, and use fallback tools to recover.',
    query: 'Investigate AI agent research, competitor activity and industry trends. Identify the three most important signals and recommend what an organization should do next.',
    adversarialOverrides: {
      enabled: true,
      mode: 'adversarial',
      simulateOpenAlexFailure: true,
    },
    expectedOutcome: 'OpenAlex fails, agent retries, falls back to Crossref, recovers and produces evidence-based report.',
    expectedVerdict: 'ANY',
    expectedMinConfidence: 10,
    expectRecovery: true,
    expectUncertainty: false,
    repeatCount: 1,
  },
  {
    id: 'contradictory',
    label: 'Contradictory Evidence',
    description: 'Adversarial mode with simulated conflicting evidence. The agent must detect the conflict, report it honestly, and avoid presenting a single-sided conclusion.',
    query: 'Investigate AI agent research, competitor activity and industry trends. Identify the three most important signals and recommend what an organization should do next.',
    adversarialOverrides: {
      enabled: true,
      mode: 'adversarial',
      simulateConflictingEvidence: true,
    },
    expectedOutcome: 'Conflict detected, verdict is CONFLICT, confidence reduced, uncertainty explicitly stated in synthesis.',
    expectedVerdict: 'CONFLICT',
    expectedMinConfidence: 0,
    expectRecovery: false,
    expectUncertainty: true,
    repeatCount: 1,
  },
  {
    id: 'incomplete',
    label: 'Incomplete Evidence',
    description: 'Adversarial mode with low-confidence signals. The agent must recognize insufficient evidence and refuse to draw unsupported conclusions.',
    query: 'Investigate AI agent research, competitor activity and industry trends. Identify the three most important signals and recommend what an organization should do next.',
    adversarialOverrides: {
      enabled: true,
      mode: 'adversarial',
      simulateLowConfidence: true,
    },
    expectedOutcome: 'Verdict is INSUFFICIENT, agent explicitly states uncertainty, does not fabricate conclusions.',
    expectedVerdict: 'INSUFFICIENT',
    expectedMinConfidence: 0,
    expectRecovery: false,
    expectUncertainty: true,
    repeatCount: 1,
  },
  {
    id: 'tool_failure',
    label: 'Tool Failure',
    description: 'Adversarial mode with both OpenAlex and Hacker News failures. The agent must attempt recovery through retries and fallbacks, then proceed with whatever evidence is available.',
    query: 'Investigate AI agent research, competitor activity and industry trends. Identify the three most important signals and recommend what an organization should do next.',
    adversarialOverrides: {
      enabled: true,
      mode: 'adversarial',
      simulateOpenAlexFailure: true,
      simulateNewsFailure: true,
    },
    expectedOutcome: 'Both tools fail after retries, agent marks sources unavailable, produces report with uncertainty, does not crash.',
    expectedVerdict: 'INSUFFICIENT',
    expectedMinConfidence: 0,
    expectRecovery: true,
    expectUncertainty: true,
    repeatCount: 1,
  },
  {
    id: 'repeated',
    label: 'Repeated Identical Runs',
    description: 'The same query is run 3 times to measure consistency. Results should be stable across runs with similar confidence, verdict, and signal counts.',
    query: 'Investigate AI agent research, competitor activity and industry trends. Identify the three most important signals and recommend what an organization should do next.',
    adversarialOverrides: {},
    expectedOutcome: 'Consistent results across 3 runs: similar confidence (variance < 20%), same verdict category, no hallucination.',
    expectedVerdict: 'ANY',
    expectedMinConfidence: 40,
    expectRecovery: false,
    expectUncertainty: false,
    repeatCount: 3,
  },
  {
    id: 'baseline',
    label: 'Baseline Comparison',
    description: 'A simple non-agent workflow that queries a single source without orchestration. Compared against the agent to measure improvement.',
    query: 'Find recent research on AI agents.',
    adversarialOverrides: {},
    expectedOutcome: 'Baseline produces fewer signals, lower confidence, no cross-source verification. Agent should outperform on all metrics.',
    expectedVerdict: 'ANY',
    expectedMinConfidence: 0,
    expectRecovery: false,
    expectUncertainty: false,
    repeatCount: 1,
  },
];

/* ---------------- Scenario Config Builder ---------------- */

export function buildAdversarialForScenario(
  scenario: EvaluationScenario,
  base: AdversarialConfig,
): AdversarialConfig {
  return { ...base, ...scenario.adversarialOverrides };
}

/* ---------------- Test Record Builder ---------------- */

export interface ScanResultForEval {
  scan: ScanState;
  durationMs: number;
}

export function buildTestRecord(
  scenario: EvaluationScenario,
  runIndex: number,
  result: ScanResultForEval,
): EvaluationTestRecord {
  const { scan, durationMs } = result;
  const evidence = scan.evidence;
  const intelligence = scan.intelligence;
  const verdict: EvidenceVerdict | 'PENDING' = evidence?.verdict ?? 'PENDING';
  const confidence = evidence?.overallConfidence ?? 0;
  const signals = scan.results.flatMap((r) => r.signals);
  const signalCount = signals.length;
  const toolCalls = scan.tools;
  const toolCallSummary = toolCalls.map((t) => ({
    tool: t.tool,
    status: t.status as ToolStatus,
    results: t.results,
  }));
  const evidenceUsed = signals.slice(0, 10).map((s) => `${s.title} (${s.sourceType})`);
  const agentSteps = scan.decisions.length;
  const replanCount = scan.graphState?.replanCount ?? 0;

  const recoveryStatus = determineRecoveryStatus(scan, scenario);
  const uncertaintyHandled = checkUncertaintyHandled(scan, scenario);
  const hallucinationDetected = checkHallucination(scan, scenario);

  const actualOutcome = buildActualOutcome(scan, verdict, confidence, signalCount, recoveryStatus);
  const { passFail, failureReason } = evaluatePassFail(
    scenario,
    verdict,
    confidence,
    recoveryStatus,
    uncertaintyHandled,
    hallucinationDetected,
    signalCount,
  );

  return {
    id: uid('eval'),
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    runIndex,
    input: scenario.query,
    expectedOutcome: scenario.expectedOutcome,
    actualOutcome,
    evidenceUsed,
    confidence,
    verdict,
    recoveryStatus,
    latencyMs: durationMs,
    toolCalls: toolCalls.length,
    toolCallSummary,
    passFail,
    failureReason,
    uncertaintyHandled,
    hallucinationDetected,
    signalCount,
    agentSteps,
    replanCount,
  };
}

function determineRecoveryStatus(
  scan: ScanState,
  scenario: EvaluationScenario,
): EvaluationTestRecord['recoveryStatus'] {
  if (!scenario.expectRecovery) return 'not_required';

  const hasFallback = scan.decisions.some((d) => d.type === 'fallback');
  const hasError = scan.tools.some((t) => t.status === 'ERROR');
  const hasReplan = (scan.graphState?.replanCount ?? 0) > 0;

  if (hasFallback && !hasError) return 'recovered';
  if (hasFallback && hasError) return 'partial';
  if (hasReplan) return 'partial';
  return 'failed';
}

function checkUncertaintyHandled(
  scan: ScanState,
  scenario: EvaluationScenario,
): boolean {
  if (!scenario.expectUncertainty) return true;

  const evidence = scan.evidence;
  const intel = scan.intelligence;
  if (!evidence || !intel) return false;

  if (evidence.verdict === 'INSUFFICIENT' || evidence.verdict === 'CONFLICT') {
    const mentionsUncertainty =
      intel.evidenceAnalysis?.toLowerCase().includes('uncertain') ||
      intel.evidenceAnalysis?.toLowerCase().includes('insufficient') ||
      intel.evidenceAnalysis?.toLowerCase().includes('conflict') ||
      intel.evidenceAnalysis?.toLowerCase().includes('caution') ||
      intel.evidenceAnalysis?.toLowerCase().includes('divergent') ||
      intel.executiveSummary?.toLowerCase().includes('caution') ||
      intel.executiveSummary?.toLowerCase().includes('uncertain') ||
      intel.executiveSummary?.toLowerCase().includes('insufficient') ||
      evidence.resolution?.toLowerCase().includes('unresolved') ||
      evidence.resolution?.toLowerCase().includes('uncertainty') ||
      false;
    return mentionsUncertainty;
  }

  return true;
}

function checkHallucination(scan: ScanState, scenario: EvaluationScenario): boolean {
  const intel = scan.intelligence;
  if (!intel) return false;

  const signals = scan.results.flatMap((r) => r.signals);
  const signalTitles = new Set(signals.map((s) => s.title.toLowerCase().slice(0, 40)));

  const claims = [
    ...intel.researchTrends,
    ...intel.competitorActivity,
    ...intel.keySignals,
  ];

  let unsupported = 0;
  for (const claim of claims) {
    const words = claim.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const matched = words.some((w) =>
      Array.from(signalTitles).some((t) => t.includes(w.slice(0, 8))),
    );
    if (!matched && words.length > 2) unsupported++;
  }

  if (scenario.expectUncertainty && unsupported > 2) return true;
  if (unsupported > claims.length * 0.5 && claims.length > 0) return true;
  return false;
}

function buildActualOutcome(
  scan: ScanState,
  verdict: EvidenceVerdict | 'PENDING',
  confidence: number,
  signalCount: number,
  recovery: EvaluationTestRecord['recoveryStatus'],
): string {
  const parts: string[] = [];
  parts.push(`Verdict: ${verdict}. Confidence: ${confidence}%. Signals: ${signalCount}.`);
  if (recovery !== 'not_required') {
    parts.push(`Recovery: ${recovery}.`);
  }
  if (scan.intelligence) {
    parts.push(`Intelligence report produced with ${scan.intelligence.sources.length} sources.`);
  } else {
    parts.push('No intelligence report produced.');
  }
  if (scan.graphState?.replanCount) {
    parts.push(`Replans: ${scan.graphState.replanCount}.`);
  }
  return parts.join(' ');
}

function evaluatePassFail(
  scenario: EvaluationScenario,
  verdict: EvidenceVerdict | 'PENDING',
  confidence: number,
  recovery: EvaluationTestRecord['recoveryStatus'],
  uncertaintyHandled: boolean,
  hallucinationDetected: boolean,
  signalCount: number,
): { passFail: 'PASS' | 'FAIL'; failureReason?: string } {
  if (hallucinationDetected) {
    return { passFail: 'FAIL', failureReason: 'Hallucination detected: claims not supported by evidence.' };
  }

  if (scenario.expectUncertainty && !uncertaintyHandled) {
    return { passFail: 'FAIL', failureReason: 'Expected uncertainty acknowledgment but none detected in synthesis.' };
  }

  if (scenario.expectRecovery && recovery === 'failed') {
    return { passFail: 'FAIL', failureReason: 'Expected tool failure recovery but agent did not recover.' };
  }

  if (scenario.expectedVerdict !== 'ANY' && verdict !== scenario.expectedVerdict && verdict !== 'PENDING') {
    return { passFail: 'FAIL', failureReason: `Expected verdict ${scenario.expectedVerdict} but got ${verdict}.` };
  }

  if (confidence < scenario.expectedMinConfidence) {
    return { passFail: 'FAIL', failureReason: `Confidence ${confidence}% below minimum ${scenario.expectedMinConfidence}%.` };
  }

  if (scenario.id === 'baseline' && signalCount === 0) {
    return { passFail: 'FAIL', failureReason: 'Baseline produced no signals.' };
  }

  return { passFail: 'PASS' };
}

/* ---------------- Metrics Computation ---------------- */

export function computeMetrics(tests: EvaluationTestRecord[]): EvaluationMetricScore[] {
  if (tests.length === 0) return [];

  const passed = tests.filter((t) => t.passFail === 'PASS').length;
  const accuracy = Math.round((passed / tests.length) * 100);

  const taskCompletion = Math.round(
    (tests.filter((t) => t.signalCount > 0 || t.verdict !== 'PENDING').length / tests.length) * 100,
  );

  const groundedness = Math.round(
    (tests.filter((t) => !t.hallucinationDetected).length / tests.length) * 100,
  );

  const hallucinationRate = Math.round(
    (tests.filter((t) => t.hallucinationDetected).length / tests.length) * 100,
  );

  const evidenceQuality = Math.round(
    (tests.reduce((sum, t) => sum + Math.min(t.signalCount, 10), 0) / (tests.length * 10)) * 100,
  );

  const recoveryTests = tests.filter((t) => t.recoveryStatus !== 'not_required');
  const recoverySuccessRate = recoveryTests.length > 0
    ? Math.round(
        (recoveryTests.filter((t) => t.recoveryStatus === 'recovered' || t.recoveryStatus === 'partial').length / recoveryTests.length) * 100,
      )
    : 100;

  const consistency = computeConsistency(tests);

  const avgLatency = Math.round(
    tests.reduce((sum, t) => sum + t.latencyMs, 0) / tests.length,
  );

  const avgToolCalls = Math.round(
    tests.reduce((sum, t) => sum + t.toolCalls, 0) / tests.length,
  );

  return [
    { label: 'Accuracy', value: accuracy, max: 100, unit: '%', description: 'Percentage of tests that passed all criteria.' },
    { label: 'Task Completion Rate', value: taskCompletion, max: 100, unit: '%', description: 'Percentage of tests that produced signals or a verdict.' },
    { label: 'Groundedness', value: groundedness, max: 100, unit: '%', description: 'Percentage of tests with no hallucination detected.' },
    { label: 'Hallucination Rate', value: hallucinationRate, max: 100, unit: '%', description: 'Percentage of tests where unsupported claims were detected.' },
    { label: 'Evidence Quality', value: evidenceQuality, max: 100, unit: '%', description: 'Average signal yield normalized to 10 signals per test.' },
    { label: 'Recovery Success Rate', value: recoverySuccessRate, max: 100, unit: '%', description: 'Success rate of recovery from simulated tool failures.' },
    { label: 'Consistency', value: consistency, max: 100, unit: '%', description: 'Stability of results across repeated identical runs.' },
    { label: 'Latency', value: avgLatency, max: 30000, unit: 'ms', description: 'Average time to complete a test scenario.' },
    { label: 'Tool Usage', value: avgToolCalls, max: 20, unit: 'calls', description: 'Average tool calls per test scenario.' },
  ];
}

function computeConsistency(tests: EvaluationTestRecord[]): number {
  const repeatedTests = tests.filter((t) => t.scenarioId === 'repeated');
  if (repeatedTests.length < 2) return 100;

  const confidences = repeatedTests.map((t) => t.confidence);
  const verdicts = repeatedTests.map((t) => t.verdict);
  const signalCounts = repeatedTests.map((t) => t.signalCount);

  const confMean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const confVariance = confidences.reduce((sum, c) => sum + Math.pow(c - confMean, 2), 0) / confidences.length;
  const confStdDev = Math.sqrt(confVariance);
  const confConsistency = Math.max(0, Math.round(100 - (confStdDev / Math.max(1, confMean)) * 100));

  const uniqueVerdicts = new Set(verdicts).size;
  const verdictConsistency = uniqueVerdicts === 1 ? 100 : Math.round(100 / uniqueVerdicts);

  const signalMean = signalCounts.reduce((a, b) => a + b, 0) / signalCounts.length;
  const signalVariance = signalCounts.reduce((sum, s) => sum + Math.pow(s - signalMean, 2), 0) / signalCounts.length;
  const signalStdDev = Math.sqrt(signalVariance);
  const signalConsistency = Math.max(0, Math.round(100 - (signalStdDev / Math.max(1, signalMean)) * 100));

  return Math.round((confConsistency + verdictConsistency + signalConsistency) / 3);
}

/* ---------------- Summary Builder ---------------- */

export function buildEvaluationSummary(tests: EvaluationTestRecord[]): EvaluationSummary {
  const totalTests = tests.length;
  const passed = tests.filter((t) => t.passFail === 'PASS').length;
  const failed = totalTests - passed;
  const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

  const metrics = computeMetrics(tests);

  const scenarioResults = EVALUATION_SCENARIOS.map((sc) => {
    const scTests = tests.filter((t) => t.scenarioId === sc.id);
    const scPassed = scTests.filter((t) => t.passFail === 'PASS').length;
    return {
      scenarioId: sc.id,
      label: sc.label,
      passed: scPassed,
      total: scTests.length,
      passRate: scTests.length > 0 ? Math.round((scPassed / scTests.length) * 100) : 0,
    };
  });

  const consistencyScores = EVALUATION_SCENARIOS
    .filter((sc) => sc.repeatCount > 1)
    .map((sc) => {
      const scTests = tests.filter((t) => t.scenarioId === sc.id);
      return {
        scenarioId: sc.id,
        label: sc.label,
        consistency: computeConsistency(scTests),
      };
    });

  const avgLatencyMs = totalTests > 0
    ? Math.round(tests.reduce((sum, t) => sum + t.latencyMs, 0) / totalTests)
    : 0;
  const avgToolCalls = totalTests > 0
    ? Math.round(tests.reduce((sum, t) => sum + t.toolCalls, 0) / totalTests)
    : 0;

  const uncertaintyTests = tests.filter((t) =>
    EVALUATION_SCENARIOS.find((s) => s.id === t.scenarioId)?.expectUncertainty,
  );
  const uncertaintyRewardScore = uncertaintyTests.length > 0
    ? Math.round((uncertaintyTests.filter((t) => t.uncertaintyHandled).length / uncertaintyTests.length) * 100)
    : 100;

  const hallucinationPenaltyScore = Math.round(
    (tests.filter((t) => t.hallucinationDetected).length / Math.max(1, totalTests)) * 100,
  );

  const accuracyMetric = metrics.find((m) => m.label === 'Accuracy')?.value ?? 0;
  const groundednessMetric = metrics.find((m) => m.label === 'Groundedness')?.value ?? 0;
  const consistencyMetric = metrics.find((m) => m.label === 'Consistency')?.value ?? 0;
  const recoveryMetric = metrics.find((m) => m.label === 'Recovery Success Rate')?.value ?? 100;

  const overallScore = Math.round(
    (accuracyMetric * 0.3 + groundednessMetric * 0.25 + consistencyMetric * 0.15 + recoveryMetric * 0.15 + uncertaintyRewardScore * 0.15) -
    (hallucinationPenaltyScore * 0.5),
  );
  const clampedScore = Math.max(0, Math.min(100, overallScore));

  const grade: EvaluationSummary['grade'] =
    clampedScore >= 90 ? 'A' :
    clampedScore >= 80 ? 'B' :
    clampedScore >= 70 ? 'C' :
    clampedScore >= 60 ? 'D' : 'F';

  return {
    totalTests,
    passed,
    failed,
    passRate,
    metrics,
    scenarioResults,
    consistencyScores,
    avgLatencyMs,
    avgToolCalls,
    uncertaintyRewardScore,
    hallucinationPenaltyScore,
    overallScore: clampedScore,
    grade,
  };
}

/* ---------------- Baseline Simulation ---------------- */

export function simulateBaselineScan(
  query: string,
  _profile: MonitoringProfile,
): ScanResultForEval {
  const start = Date.now();
  const signals: ScanState['results'][number]['signals'] = [];

  for (let i = 0; i < 3; i++) {
    signals.push({
      id: uid('base'),
      title: `Baseline result ${i + 1} for: ${query.slice(0, 40)}`,
      summary: 'Single-source baseline query result. No cross-source verification.',
      category: 'research',
      source: 'Baseline (OpenAlex only)',
      sourceType: 'OpenAlex',
      date: new Date().toISOString(),
      relevance: 40 + Math.random() * 20,
      priority: 'MEDIUM',
      url: '#baseline',
    });
  }

  const scan: ScanState = {
    status: 'done',
    query,
    startedAt: start,
    finishedAt: Date.now(),
    agentStatuses: { orchestrator: 'IDLE', research: 'COMPLETED', news: 'IDLE' },
    decisions: [],
    communications: [],
    tools: [{
      id: uid('base-tool'),
      tool: 'OpenAlex',
      agentId: 'research',
      status: 'SUCCESS',
      query,
      results: 3,
    }],
    results: [{
      agentId: 'research',
      signals,
      confidence: 35,
      resultCount: 3,
      note: 'Baseline: single source, no orchestration, no cross-verification.',
    }],
    prioritySignals: signals,
    evidence: {
      verdict: 'INSUFFICIENT',
      researchConfidence: 35,
      newsConfidence: 0,
      overallConfidence: 35,
      explanation: 'Baseline: only one source queried. No cross-source verification possible.',
    },
    intelligence: {
      executiveSummary: `Baseline scan for "${query.slice(0, 60)}" produced ${signals.length} signals from a single source. No cross-source verification.`,
      keySignals: signals.map((s) => `${s.priority} - ${s.title}`),
      researchTrends: signals.map((s) => `${s.title} - ${s.source}`),
      competitorActivity: ['No competitor analysis performed in baseline mode.'],
      evidenceAnalysis: 'Baseline: single source, no orchestration, no conflict detection.',
      whyItMatters: 'Baseline comparison shows the value of multi-agent orchestration.',
      recommendedActions: ['Upgrade to full agent orchestration for cross-source verification.'],
      sources: signals.map((s) => ({ label: s.title, url: s.url })),
    },
    memoryEvents: [],
    adversarial: DEFAULT_ADVERSARIAL,
  };

  return { scan, durationMs: Date.now() - start };
}
