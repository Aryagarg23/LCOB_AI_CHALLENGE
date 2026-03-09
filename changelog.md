# Changelog: Autonomous Coffee Shop Pricing & Strategy Engine

## [Unreleased]
### Added
- Created foundational Next.js architecture
- Initialized Supabase configurations for database interactions
- Defined 9-agent architecture (Vision, Demographics, Sales, Sentiment, Macro, Commodities, Mobility, Competitor, Orchestrator)
- **Centralized AI Provider**: Created `src/lib/ai-provider.js` to allow users to easily swap between OpenAI, Anthropic, or Gemini across all 9 agents simultaneously.
- **Built Agent Logic**: Agents 1-8 implemented as true generation agents utilizing the Vercel AI SDK and strict Zod parsing to return JSON structures.
- **Iterative AI SDK Tool Calling**: Replaced hardcoded web scraping with autonomous AI SDK tools (`src/lib/tools.js`). ALL Sub-Agents (1-8) are now equipped with a `web_search` DuckDuckGo tool and the `maxSteps` parameter, allowing them to autonomously iterate and research qualitative data before generating their JSON heuristics.
- **Ultra-Low Cost Inference**: Switched all 9 Agents to `gpt-4.1-nano` based on the latest tier-pricing ($0.05/1M caching).
- **Data Ingestion**: Agent 3 (Sales Historian) now processes historical CSV sales data (`src/data/sample_sales.csv`) to calculate real POS Price Elasticity, simulating database ingestion.
- **Hierarchical Mixture-of-Agents (MoA)**: Agent 9 upgraded to orchestrate the sub-agents and execute a hidden Chain of Thought (CoT) verification step to fact-check inputs before creating the artifact.
- **Built Premium UI**: Implemented dark-mode Vanilla CSS with a glassmorphism and gradient aesthetic.
- **Built Public Artifacts**: `api/artifacts` route connects to Supabase storage buckets to save and fetch markdown files globally.
- **Consultation Feature**: Integrated an interactive useChat interface that sits beside the generated artifact, allowing novice users to talk with the Orchestrator to query the strategy report in real-time.

### Changed
- Strategy pivot to JavaScript APIs on Next.js Serverless Routes instead of Python

### Planned
- **Verification**: Waiting on environment keys to do a live test run before Vercel deployment.
