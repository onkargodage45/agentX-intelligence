# AgentX Intelligence

## Autonomous Research & Competitor Tracking

### Team Members
- Atharva Deshpande
- Mangesh Gofane
- Shital Kale
- Lavanya Varade

## Problem Statement

Organizations, startups, and research institutions operate in rapidly evolving environments where staying updated on research trends, patents, competitor strategies, industry news, and emerging technologies is critical. Manual monitoring is time-consuming, difficult to scale, and prone to missing important updates.

AgentX Intelligence provides an autonomous AI-based research and competitor tracking system that gathers relevant information, analyzes evidence, coordinates specialized agents, manages context and memory, and produces concise, actionable intelligence.

## Project Description

AgentX Intelligence is a multi-agent AI platform for autonomous research and competitor tracking.

Core workflow:

```text
Understand → Plan / Reason → Collaborate → Use Tools
→ Manage Context → Evaluate Evidence → Replan if Required
→ Synthesize Intelligence → Recommend Actions
```

## Technologies Used

| Technology | Purpose |
|---|---|
| React | Frontend |
| TypeScript | Application development |
| Vite | Build tooling |
| Tailwind CSS | UI styling |
| Supabase | Backend and database services |
| OpenAlex API | Academic research |
| Crossref API | Scholarly publication metadata |
| Hacker News Firebase API | Technology and industry signals |
| LocalStorage | Persistent client-side memory |
| Vercel | Deployment |

## Architecture

AgentX uses a state/graph-based agent orchestration architecture.

### Orchestrator Agent
- Understands objectives
- Creates dynamic plans
- Decomposes tasks
- Selects agents and tools
- Performs conditional routing
- Coordinates parallel execution
- Evaluates evidence
- Replans
- Synthesizes final intelligence

### Research Agent
Handles academic research, publications, research trends, and emerging technology.

**Tools:** OpenAlex, Crossref

### News / Competitor Agent
Handles industry developments, competitor activity, technology signals, and recent news.

**Tool:** Hacker News Firebase API

```text
                         USER
                           ↓
                      ORCHESTRATOR
                           ↓
                    PLAN / REASON
                           ↓
                ┌──────────┴──────────┐
                ↓                     ↓
         RESEARCH AGENT          NEWS AGENT
                ↓                     ↓
        OpenAlex / Crossref      Hacker News
                └──────────┬──────────┘
                           ↓
                     SHARED STATE
                           ↓
                  EVIDENCE ANALYSIS
                           ↓
                 SELF-EVALUATION
                      /                          VERIFY      REPLAN
                      \        /
                       ↓      ↓
                       SYNTHESIS
                           ↓
                         RESULT
```

## Features

### Agentic Reasoning
ReAct-style investigation where the system selects high-level next actions, uses tools, observes results, evaluates evidence, and continues until the objective is sufficiently addressed.

### Dynamic Planning
Investigation plans are created according to the query instead of blindly executing every workflow step.

### Multi-Agent Collaboration
Specialized Research and News/Competitor Agents collaborate through the Orchestrator.

### External Tool Calling
Uses OpenAlex, Crossref, and Hacker News dynamically.

### Parallel Execution
Independent research and industry investigations can execute concurrently.

### Shared State
Agents share investigation context including findings, evidence, confidence, tool activity, and task progress.

### Context & Memory
The application maintains short-term investigation context and persistent monitoring memory.

### Autonomous Replanning
If evidence is insufficient or conditions change, the Orchestrator can revise the investigation plan.

### Failure Recovery & Tool Fallback
Example:

```text
OpenAlex → Failure → Retry → Crossref Fallback → Continue
```

### Conflicting Evidence
Evidence from multiple sources is compared and conflicts can trigger verification. Unsupported conclusions are avoided.

### Uncertainty-Aware Decisions
Confidence levels help determine whether evidence is sufficient, whether verification is needed, or whether the task should be replanned.

### Resource Awareness
Tracks tool calls, retries, investigation steps, and replanning activity.

### Self-Evaluation
Evaluates goal coverage, evidence quality, conflicts, and confidence before final synthesis.

### Hypothesis Verification
Collected evidence can determine whether a hypothesis is supported, partially supported, or uncertain.

### Loop / Deadlock Detection
Repeated tool calls, retries, or investigation states can be detected to prevent endless loops.

### Adaptive Task Decomposition
Complex queries can be divided into smaller investigation tasks based on the objective.

### Adversarial Testing
Controlled scenarios cover tool failures, conflicting evidence, low confidence, resource constraints, and recovery behavior.

## Evaluation

AgentX can be evaluated across:

1. Normal queries
2. Ambiguous queries
3. Adversarial queries
4. Contradictory evidence
5. Incomplete evidence
6. Tool failures
7. Repeated runs
8. Baseline comparison

Metrics include:

- Accuracy
- Task completion
- Groundedness
- Hallucination rate
- Evidence quality
- Recovery success
- Consistency
- Latency
- Tool/resource usage
- Confidence calibration

The system is designed to identify uncertainty and avoid unsupported conclusions.

## Context & Memory

### Short-Term Context
Stores the current query, organization, topics, keywords, agents, tool results, evidence, confidence, and current step.

### Long-Term Memory
Can persist organization, competitors, topics, keywords, previous queries, and previous monitoring context.

LocalStorage is used where appropriate for client-side persistent memory.

## Database / Backend

Supabase is used for configured backend and database functionality. Client-side state and LocalStorage are also used where appropriate for memory and UI persistence.

## Example Query

```text
Compare recent AI agent research with current industry developments.
```

Expected workflow:

```text
User Query
 ↓
Understand Objective
 ↓
Create Investigation Plan
 ↓
Research Agent
 ↓
News Agent
 ↓
Collect Evidence
 ↓
Compare Evidence
 ↓
Evaluate Confidence
 ↓
Replan if Needed
 ↓
Generate Actionable Intelligence
```

## Installation / Setup

### 1. Clone

```bash
git clone https://github.com/onkargodage45/agentX-intelligence.git
cd agentX-intelligence
```

### 2. Install

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file using the variables required by the project.

Never commit private credentials, API keys, database passwords, or tokens.

### 4. Run

```bash
npm run dev
```

### 5. Production Build

```bash
npm run build
```

## How to Run

After `npm run dev`, open the local Vite URL shown in the terminal.

Enter an intelligence query and click **Run Intelligence Scan**.

The dashboard displays agent status, decision timeline, agent communication, tool activity, signals, evidence, intelligence, memory, and evaluation information.

## Live Demo

https://agent-x-intelligence.vercel.app/

## GitHub Repository

https://github.com/onkargodage45/agentX-intelligence

## Project Structure

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

## Screenshots / Demo

The live application demonstrates:

- Agent Council
- Agent Decision Timeline
- Agent Communication
- Tool Activity
- Investigation Memory
- Long-Term Memory
- Research Signals
- Industry Signals
- Evidence Analysis
- Final Intelligence

Live demo: https://agent-x-intelligence.vercel.app/

## Hackathon Capability Mapping

| Capability | Implementation |
|---|---|
| Understand | Orchestrator analyzes the objective |
| Plan / Reason | ReAct-style dynamic planning |
| Collaborate | Orchestrator + specialized agents |
| Tool Calling | OpenAlex + Crossref + Hacker News |
| Dynamic Planning | Runtime investigation planning |
| Conditional Routing | State-dependent transitions |
| Parallel Execution | Independent agent execution |
| Shared State | Investigation state |
| Checkpointing | Investigation checkpoints |
| Replanning | Revised plans after evaluation |
| Failure Recovery | Retry and fallback |
| Conflict Resolution | Evidence comparison and verification |
| Uncertainty | Confidence-aware decisions |
| Resource Awareness | Tool/retry/step tracking |
| Self-Evaluation | Evidence and goal evaluation |
| Hypothesis Verification | Evidence-backed verification |
| Memory | Current context + persistent memory |
| Loop Detection | Repeated-state/retry detection |
| Adaptive Decomposition | Query-dependent task creation |
| Adversarial Testing | Controlled failure scenarios |

## Team

| Name | Role |
|---|---|
| Atharva Deshpande | Team Member |
| Mangesh Gofane | Team Member |
| Shital Kale | Team Member |
| Lavanya Varade | Team Member |

## Conclusion

AgentX Intelligence transforms scattered research and competitor signals into structured, evidence-based, actionable intelligence.

**Understand → Plan/Reason → Collaborate → Use Tools → Manage Context → Evaluate → Replan → Act**
