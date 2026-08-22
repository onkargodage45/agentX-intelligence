# AgentX Intelligence

## Autonomous Research & Competitor Tracking

**Live Demo:** https://agent-x-intelligence.vercel.app/  
**GitHub:** https://github.com/onkargodage45/agentX-intelligence

## Team Members

- Atharv Deshpande — Team Leader
- Mangesh Gofane
- Shital Kale
- Lavanya Varade

---

## Problem Statement

Organizations, startups, and research institutions operate in highly competitive and rapidly evolving environments where staying updated on research trends, patent developments, competitor strategies, industry news, and emerging technologies is critical.

Manually monitoring scientific publications, patent databases, news platforms, and other information sources is time-consuming, inefficient, and prone to missing important updates.

AgentX Intelligence automates this process using coordinated AI agents that gather, analyze, compare, and summarize relevant information into concise and actionable intelligence.

---

## Project Description

AgentX Intelligence is a multi-agent AI platform for autonomous research and competitor intelligence tracking.

The system consists of:

- **Orchestrator Agent**
- **Research Agent**
- **News / Competitor Agent**

The Orchestrator understands the user's objective, dynamically delegates tasks, invokes external tools, collects evidence, evaluates results, manages context and memory, and synthesizes final intelligence.

### Core Workflow

```text
Understand
    ↓
Plan / Reason
    ↓
Collaborate
    ↓
Use Tools
    ↓
Manage Context
    ↓
Evaluate Evidence
    ↓
Replan if Required
    ↓
Synthesize Intelligence
    ↓
Actionable Result
```

---

# Architecture

```text
                         USER
                           ↓
                    ORCHESTRATOR
                           ↓
                    PLAN / REASON
                           ↓
              ┌────────────┴────────────┐
              ↓                         ↓
       RESEARCH AGENT             NEWS AGENT
              ↓                         ↓
       OpenAlex / Crossref          Hacker News
              └────────────┬────────────┘
                           ↓
                    SHARED STATE
                           ↓
                  EVIDENCE ANALYSIS
                           ↓
                  SELF-EVALUATION
                       /                           VERIFY    REPLAN
                       \       /
                        ↓     ↓
                       SYNTHESIS
                           ↓
                         RESULT
```

---

# Technologies Used

| Technology | Purpose |
|---|---|
| React | Frontend |
| TypeScript | Application logic |
| Vite | Development and build |
| Tailwind CSS | UI styling |
| Supabase | Backend / database |
| OpenAlex API | Academic research |
| Crossref API | Scholarly publication metadata |
| Hacker News Firebase API | Industry/news signals |
| LocalStorage | Persistent client-side memory |
| Vercel | Deployment |

---

# Agents

## 1. Orchestrator Agent

Responsible for:

- Understanding the user objective
- Dynamic planning
- Task decomposition
- Agent selection
- Conditional routing
- Coordinating agents
- Evidence evaluation
- Replanning
- Final synthesis

## 2. Research Agent

Responsible for:

- Academic research
- Scientific publications
- Research trends
- Emerging technologies

### Tools

- OpenAlex
- Crossref

## 3. News / Competitor Agent

Responsible for:

- Industry developments
- Competitor activity
- Technology signals
- Recent news

### Tool

- Hacker News Firebase API

---

# Key Features

## Agentic Reasoning

AgentX follows a ReAct-style investigation loop:

```text
REASON
   ↓
DECIDE NEXT ACTION
   ↓
SELECT AGENT / TOOL
   ↓
EXECUTE
   ↓
OBSERVE
   ↓
EVALUATE
   ↓
CONTINUE / REPLAN / SYNTHESIZE
```

The UI displays high-level reasoning and decision events without exposing private chain-of-thought.

## Dynamic Planning

Investigation plans are created according to the user's query instead of blindly executing every workflow step.

## Multi-Agent Collaboration

Research and News agents work as specialized agents coordinated by the Orchestrator.

## External Tool Calling

AgentX integrates:

- OpenAlex
- Crossref
- Hacker News

## Parallel Execution

Independent research and industry tasks can execute concurrently before evidence is combined.

## Shared State

Investigation state can contain query, topics, findings, evidence, confidence, tool activity, retries, resource usage, memory context, and checkpoints.

## Context & Memory

The application maintains short-term investigation context and persistent monitoring memory.

## Autonomous Replanning

If evidence is insufficient or conditions change, the Orchestrator can revise the investigation plan.

## Failure Recovery & Tool Fallback

Example:

```text
OpenAlex
   ↓
FAILURE
   ↓
Retry
   ↓
FAILURE
   ↓
Crossref Fallback
   ↓
SUCCESS
   ↓
Continue Investigation
```

The system should never fabricate external results when a tool fails.

## Conflicting Evidence Resolution

When agents return different findings, evidence can be compared and verified. If evidence cannot be reconciled, uncertainty is preserved instead of forcing an unsupported conclusion.

## Uncertainty-Aware Decisions

```text
HIGH confidence   → Synthesize
MEDIUM confidence → Seek additional evidence
LOW confidence    → Verify or replan
```

## Resource-Aware Execution

The system tracks tool calls, agent executions, retries, investigation steps, and replanning activity.

## Self-Evaluation

Before final synthesis, AgentX evaluates goal coverage, evidence quality, missing evidence, conflicts, confidence, and the need for further investigation.

## Hypothesis Verification

Collected evidence can determine whether a hypothesis is supported, partially supported, or uncertain.

## Loop / Deadlock Detection

Repeated tool calls, retries, or investigation states can be detected to prevent endless loops.

## Adaptive Task Decomposition

Complex objectives are divided into smaller investigation tasks based on the actual objective.

---

# Evaluation

AgentX can be evaluated using:

1. Normal queries
2. Ambiguous queries
3. Adversarial queries
4. Contradictory evidence
5. Incomplete evidence
6. Tool failures
7. Repeated runs
8. Baseline comparison

### Metrics

- Accuracy
- Task completion rate
- Groundedness
- Hallucination rate
- Evidence quality
- Recovery success rate
- Consistency
- Latency
- Tool/resource usage
- Confidence calibration

The system should identify uncertainty and avoid unsupported conclusions.

---

# Advanced Tracing & Observability

AgentX provides an observability model for tracking an investigation end-to-end.

```text
User Query
   ↓
Agent
   ↓
Decision
   ↓
Tool Call
   ↓
Tool Result
   ↓
Evaluation
   ↓
Final Result
```

Trace information can include:

- Agent execution
- High-level task/prompt input
- Decisions
- Routing
- Tool calls
- Tool success/failure
- Errors
- Latency
- Retries
- Fallbacks
- Resource usage
- Final task status

### Controlled Failure Test

```text
Tool Failure
     ↓
Trace Captured
     ↓
Root Cause Identified
     ↓
Recovery / Fallback
     ↓
Retry
     ↓
Successful Completion
```

Before-vs-after evaluation can compare:

- Task success rate
- Execution time
- Tool calls
- Error count
- Recovery rate

> Only measured results should be reported as real metrics. Simulated failures or metrics must be clearly labeled.

---

# Adversarial Testing

AgentX can be tested under controlled failure conditions.

### Tool Failure

```text
Tool Failure
→ Detect
→ Diagnose
→ Retry
→ Fallback
→ Recover
```

### Conflicting Evidence

```text
Research Evidence
        +
Industry Evidence
        ↓
Conflict Detection
        ↓
Verification
        ↓
Confidence Update
```

### Resource Constraint

```text
Limited Tool Budget
        ↓
Prioritize High-Value Evidence
        ↓
Continue Investigation
```

---

# Context & Memory

### Short-Term Context

Stores:

```text
Current Query
Organization
Topics
Keywords
Active Agents
Tool Results
Evidence
Confidence
Current Step
```

### Long-Term Memory

Can store:

```text
Organization
Competitors
Topics
Keywords
Previous Queries
Monitoring Context
```

Supabase provides configured backend/database persistence, while LocalStorage can be used for client-side memory.

---

# Dashboard

The dashboard provides:

- Overview
- Agents
- Signals
- Evidence
- Intelligence
- Agent Council
- Agent Decision Timeline
- Agent Communication
- Tool Activity
- Investigation Memory
- Long-Term Memory
- Evaluation
- Observability / Traces

---

# Example Query

```text
Compare recent AI agent research with current industry developments.
```

Expected flow:

```text
User Query
    ↓
Orchestrator
    ↓
Research Agent + News Agent
    ↓
OpenAlex / Crossref / Hacker News
    ↓
Evidence Collection
    ↓
Evidence Analysis
    ↓
Self-Evaluation
    ↓
Final Intelligence
```

---

# Installation / Setup

## 1. Clone Repository

```bash
git clone https://github.com/onkargodage45/agentX-intelligence.git
cd agentX-intelligence
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment

Create a `.env` file with the required project configuration.

Example:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never commit private credentials, API keys, passwords, or tokens.

## 4. Run Development Server

```bash
npm run dev
```

## 5. Build for Production

```bash
npm run build
```

## 6. Preview Production Build

```bash
npm run preview
```

---

# How to Run

After:

```bash
npm run dev
```

open the local Vite URL shown in the terminal.

Enter an intelligence query and click **Run Intelligence Scan**.

The dashboard displays agent investigation, tool usage, evidence, memory, evaluation, and final intelligence.

---

# Project Structure

```text
src/
├── components/
├── lib/
│   ├── graph.ts
│   ├── orchestrator.ts
│   ├── runtime.ts
│   ├── memory.ts
│   ├── adversarial.ts
│   └── ...
├── pages/
├── App.tsx
├── main.tsx
└── index.css

supabase/
└── migrations/

public/

.env.example
package.json
package-lock.json
vite.config.ts
README.md
```

---

# Live Demo

**AgentX Intelligence:**  
https://agent-x-intelligence.vercel.app/

# GitHub Repository

https://github.com/onkargodage45/agentX-intelligence

---

# Hackathon Capability Mapping

| Capability | Implementation |
|---|---|
| Understand | Orchestrator analyzes objective |
| Plan / Reason | ReAct-style planning |
| Collaborate | Orchestrator + Research + News agents |
| Tool Calling | OpenAlex + Crossref + Hacker News |
| Dynamic Planning | Runtime investigation planning |
| Conditional Routing | State-dependent transitions |
| Parallel Execution | Independent agent execution |
| Shared State | Investigation state |
| Checkpointing | Investigation checkpoints |
| Autonomous Replanning | Revised plans after evaluation |
| Failure Recovery | Retry and fallback |
| Conflict Resolution | Evidence comparison |
| Uncertainty | Confidence-aware decisions |
| Resource Awareness | Tool/retry/step tracking |
| Self-Evaluation | Goal/evidence evaluation |
| Hypothesis Verification | Evidence-backed verification |
| Memory | Current context + persistent memory |
| Loop Detection | Repeated-state detection |
| Adaptive Decomposition | Query-dependent task creation |
| Evaluation | Automated and human evaluation |
| Observability | Agent/tool/error/latency tracing |
| Root-Cause Diagnosis | Controlled failure analysis |

---

# Security

Never commit:

- API secrets
- Supabase service-role keys
- Database passwords
- GitHub tokens
- Authentication credentials

---

# Team

| Name | Role |
|---|---|
| Atharv Deshpande | Team Leader |
| Mangesh Gofane | Team Member |
| Shital Kale | Team Member |
| Lavanya Varade | Team Member |

---

# Conclusion

AgentX Intelligence combines:

**Understand → Plan/Reason → Collaborate → Use Tools → Manage Context → Evaluate → Recover → Deliver Intelligence**

to transform research, competitor, and industry signals into structured, evidence-based, actionable intelligence.
