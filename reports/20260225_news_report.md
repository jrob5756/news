# News Summary for February 25, 2026

## Summary

Today's standout story is a major AI security finding: a FAR.AI paper demonstrates that prefill attacks achieve near-100% success rates against all 50 open-weight LLMs tested — a systematic vulnerability that bypasses alignment-trained safety measures entirely and has no robust mitigation yet. It is required reading for any team deploying open-weight models in production. On the AI development practices front, a sharp Tessl post challenges the viral "delete your AGENTS.md" take from recent research, arguing the study actually revealed something more useful: context files work when they're validated with evals, and most teams have no evals at all. Rounding out the top 3, the Context Mode project demonstrates 99% token reduction on MCP tool outputs for Claude Code using deterministic algorithmic compression — a practical solution to context window exhaustion in long agentic sessions. Elsewhere: Mercury 2 from Inception Labs brings diffusion-based reasoning LLMs to production, Cloudflare's engineering team rebuilt Next.js with AI in one week, a new Google Cloud hardware vulnerability (Spectre/L1TF) enables cross-tenant private key theft, and MatX raises $500M to challenge Nvidia's inference accelerator dominance.

---

## Top 3 Articles

### **1. [Systematic Vulnerability in Open-Weight LLMs: Prefill Attacks Achieve Near-Perfect Success Rates](https://www.arxiv.org/abs/2602.14689)**

**Source**: Reddit /r/MachineLearning / FAR.AI / arXiv  
**Date**: February 25, 2026

**Detailed Summary**:

Prefill attacks exploit a native feature of open-weight large language model APIs called "assistant prefilling" — the ability for an API caller to pre-populate the first tokens of the model's response before generation begins. Unlike jailbreaking attempts embedded in user prompts, a prefill attack bypasses the input layer entirely by injecting content directly into the beginning of the model's output stream. When an attacker seeds an affirmative or compliant prefix — such as "Sure, here's how to do that:" — the model's autoregressive generation continues the completion in that cooperative tone, treating the prefill as a committed starting context and generating the harmful content that would otherwise be refused. The safety mechanism that LLMs rely on — alignment-trained refusal at the first output token — is rendered irrelevant because that decision point is simply skipped.

The paper, authored by Lukas Struppek, Adam Gleave, and Kellin Pelrine at FAR AI (Foundation for AI Research and Alignment) and submitted to arXiv on February 16, 2026, is the largest empirical study of prefill attacks to date. The researchers tested 50 state-of-the-art open-weight models across multiple model families against 23 distinct attack strategies. The central finding: prefill attacks achieve attack success rates approaching 100% across all major contemporary open-weight model families — including Llama, Mistral, DeepSeek, and Qwen lineages. The only partial exception is large reasoning models, which show some resilience to generic prefill strings. However, even these fall when targeted by tailored, model-specific attack strategies.

The mechanism is structurally distinct from prior attack research. Input-based jailbreaking requires social-engineering the model; fine-tuning attacks require modifying weights. Prefilling requires neither — it exploits the API itself. Any deployment stack that gives a caller control over the assistant turn in the conversation format is exposed. This is essentially the default behavior when running open-weight models locally via llama.cpp, Ollama, or vllm. Organizations building on open-weight models typically rely on system prompts and application-layer guardrails as their primary safety layers — layers that prefill attacks render irrelevant. Closed-source APIs like OpenAI's deliberately block assistant prefilling; this vulnerability is structurally unique to open-weight deployments.

Mitigations discussed are limited and imperfect: in-context learning defenses can lower attack success rates but introduce significant over-defensiveness; regex-based output filtering is brittle; adding LLM-based output review adds latency and is itself adversarially manipulable; fine-pruning approaches reduce vulnerability but degrade model utility by 2–7%. The authors conclude there is currently no robust, low-cost defense, and that model developers must treat prefill attack resistance as a first-class requirement in safety training. The key practical takeaway: if you have not explicitly disabled or constrained the assistant prefill feature at your inference serving layer, treat your open-weight deployment as providing no meaningful safety guarantee against a motivated attacker with API access.

---

### **2. [Agents.md file isn't the problem. Your lack of Evals is](https://tessl.io/blog/your-agentsmd-file-isnt-the-problem-your-lack-of-evals-is/)**

**Source**: Hacker News / Tessl  
**Date**: February 25, 2026

**Detailed Summary**:

This article by Simon Maple (Founding Developer Advocate at Tessl) is a direct counterargument to a viral conclusion that spread after an academic study on AGENTS.md effectiveness. AGENTS.md (alongside CLAUDE.md, GEMINI.md, and similar files) is a repository-level context file that gives AI coding agents persistent instructions about how to behave in a specific codebase — what tools to prefer, what patterns to follow, what common mistakes to avoid. Agent developers at Anthropic, OpenAI, and Google have strongly encouraged writing these files.

The triggering paper (arXiv:2602.11988, published February 12, 2026) studied 138 repositories and 5,694 pull requests and produced uncomfortable numbers: developer-written context files improved task completion by only 4% on average, while LLM-generated context files actually reduced performance by 2–3%, with both increasing inference costs by over 20%. Theo (t3.gg) made a viral video summarizing this and concluded bluntly: "You should delete your CLAUDE.md/AGENTS.md file." 

Maple argues that conclusion is categorically wrong. The study's findings expose unvalidated context as useless — not context itself. Nobody responds to a bug slipping through tests by deleting the test suite. The study's LLM-generated files underperformed precisely because they are auto-generated without expertise about what the agent actually gets wrong, and because no one validated any of it. One concrete example: a model kept reaching for tRPC in inappropriate places because the context file referenced it — a mistake that would have been caught immediately with a single eval.

The real problem is that most developers write a context file, intuitively "feel like" the agent is behaving better, ship it, and move on. There is no measurement, no baseline, no feedback loop. The solution is evals: structured, repeatable evaluations that run the agent against defined tasks and measure pass/fail outcomes. The operational workflow is: write an instruction, run evals, observe whether pass rate went up/flat/down. If up, the instruction earns its place. If flat, you are paying for noise. If down, you caught a bug before it hit production.

Tessl's platform validates this with concrete evidence: a Cisco skill deployment showed 1.79x measured improvement in task performance versus sessions without the skill; progressive eval passes on a PubNub skill suite showed iterative performance gains per revision cycle. The community discussion on Hacker News also surfaced a useful empirical finding from related Vercel work: first-person system prompt framing ("I will follow the instructions in AGENTS.md") succeeded 3/3 times, while second-person imperative framing ("Follow the instructions in AGENTS.md") succeeded 0/3 times — likely because first-person phrasing pattern-matches to model internal monologue in training data. The practical mandate: treat context files like tests. Measure them or do not write them. A validated 10-line file that reliably changes three behaviors beats a 200-line file the model partially ignores.

---

### **3. [Show HN: Context Mode – 315 KB of MCP output becomes 5.4 KB in Claude Code](https://github.com/mksglu/claude-context-mode)**

**Source**: Hacker News  
**Date**: February 25, 2026

**Detailed Summary**:

Context Mode, built by developer Mert Köseoğlu, is an open-source MCP server designed to solve the context window exhaustion problem in Claude Code caused by large tool outputs. While Cloudflare's Code Mode tackled context bloat from tool *definitions* (compressing schema down to ~1,000 tokens), Context Mode targets tool *outputs* — the raw data dumps that flood Claude's 200K token window every time a tool is invoked. With 81+ active tools, Claude Code can consume 143K tokens (72% of available context) before the user types their first message; with Context Mode active, that same session uses 1.3% of the context window.

The technical core is an interception layer between Claude Code and any MCP tool response. Raw outputs are routed through one of two sandboxed pipelines. The `execute`/`execute_file` pipeline spawns an isolated subprocess across ten language runtimes (JavaScript, TypeScript, Python, Shell, Ruby, Go, Rust, PHP, Perl, R), captures stdout, and when output exceeds 5KB with an `intent` parameter provided, automatically indexes full content into an in-session SQLite FTS5 database before returning only a focused summary to context. The `index`/`search`/`fetch_and_index` pipeline is a full knowledge retrieval system: content is chunked by markdown headings, indexed using BM25 ranking with Porter stemming, and served in smart snippet windows centered on matching query terms. Neither pipeline makes LLM calls — all processing is deterministic and algorithmic, adding no latency or token overhead from inference.

The headline figure comes from a benchmark suite: a Playwright DOM snapshot compresses 56.2 KB → 299 B (99% reduction); 20 GitHub issues compress 58.9 KB → 1.1 KB (98%); a 500-request nginx access log compresses 45.1 KB → 155 B (100%); a 500-row analytics CSV compresses 85.5 KB → 222 B (100%); a 153-commit git log compresses 11.6 KB → 107 B (99%). A full debugging session simulation (Context7 docs, Playwright snapshot, GitHub issues, test output, build output, skill prompt) drops from 177.1 KB to 10.2 KB — with reported session endurance extending from ~30 minutes to ~3 hours.

HN community reception (66 points, 19 comments) included a notable substantive exchange about "unsurfaced signal" risk — the author clarified that full output is retained in SQLite and accessible via iterative `search(queries: [...])` calls with vocabulary hints returned alongside results. Key limitations: the SQLite store is ephemeral (cleared when MCP server exits), token savings are measured via byte-ratio estimation (not Claude's actual tokenizer), and some users reported that Claude doesn't always invoke Context Mode tools without the included PreToolUse hook plugin. Sensitive data masking is not yet implemented. Installation is via a single `claude mcp add context-mode -- npx -y context-mode` command, and the server is spec-compliant with Codex CLI and opencode.

---

## Other Articles

4. **[Mercury 2: Fast reasoning LLM powered by diffusion](https://www.inceptionlabs.ai/blog/introducing-mercury-2)**
   - *Source*: Hacker News
   - *Date*: February 24, 2026
   - *Summary*: Inception Labs announces Mercury 2, a reasoning-focused LLM using diffusion-based generation rather than autoregressive next-token prediction. The approach enables parallel token generation and meaningfully faster inference than comparably-sized autoregressive models, while maintaining competitive reasoning benchmark performance — a significant architectural alternative for developers chasing low-latency LLM inference.

5. **[Show HN: Emdash – Open-source agentic development environment](https://github.com/generalaction/emdash)**
   - *Source*: Hacker News
   - *Date*: February 24, 2026
   - *Summary*: Emdash is an open-source development environment designed specifically for building and iterating on AI agent systems. It provides integrated tooling for designing agent workflows, inspecting tool call chains, managing state across sessions, and running agents in sandboxed environments — addressing the gap between prototype notebooks and production-grade agentic software engineering.

6. **[Show HN: A real-time strategy game that AI agents can play (LLM Skirmish)](https://llmskirmish.com/)**
   - *Source*: Hacker News
   - *Date*: February 25, 2026
   - *Summary*: LLM Skirmish is an RTS game specifically designed for LLM-powered AI agents to compete, providing a practical benchmark environment for testing multi-step planning, tool use, and decision-making capabilities under adversarial time pressure. Functions as both an entertaining demo and a structured environment for evaluating agentic AI behavior beyond static benchmarks.

7. **[Sovereignty in a System Prompt](https://pop.rdi.sh/sovereignty-in-a-system-prompt/)**
   - *Source*: Hacker News
   - *Date*: February 25, 2026
   - *Summary*: An exploration of control, governance, and power dynamics in AI system prompts — examining who controls the instructions that govern AI behavior, the layered hierarchy of system-prompt authority (platform → service provider → user), and the implications for users and developers operating AI systems they do not fully control. Raises important architectural and ethical questions for anyone designing multi-tenant AI agent systems.

8. **[How we rebuilt Next.js with AI in one week (ViNext)](https://blog.cloudflare.com/vinext/)**
   - *Source*: Hacker News
   - *Date*: February 24, 2026
   - *Summary*: Cloudflare's engineering team documents how they used AI coding tools to rebuild Next.js as a Cloudflare Workers-native framework (ViNext) in one week — a project they estimated would take months using traditional approaches. The post is a detailed case study in AI-accelerated framework development, covering agent-guided code migration, testing strategies, and where AI assistance still failed and required manual intervention.

9. **[Stealing private keys in Google Cloud with Spectre L1TF exploit](https://vusec.net)**
   - *Source*: Hacker News
   - *Date*: February 24, 2026
   - *Summary*: Security researchers demonstrate a critical hardware vulnerability allowing extraction of private cryptographic keys from Google Cloud Platform instances by exploiting Spectre and L1TF (L1 Terminal Fault) hardware side-channels. The attack works across tenant boundaries in shared virtualized environments, enabling cross-VM key theft without any software vulnerability on the victim side. Significant implications for any workload storing secrets (TLS keys, SSH keys, signing keys) in shared cloud infrastructure.

10. **[How to Integrate an AI Chatbot Into Your Application: A Practical Engineering Guide](https://dzone.com/articles/how-to-integrate-ai-chatbot-into-applications)**
    - *Source*: DZone
    - *Date*: February 24, 2026
    - *Summary*: A practical engineering guide covering the full lifecycle of integrating AI chatbots into applications — from selecting foundation models and designing conversation state management, to streaming architecture, latency optimization, content moderation layers, and production monitoring. Aimed at backend and full-stack engineers moving from AI demo to production-grade chatbot integration with realistic architectural guidance.

11. **[Integration Reliability for AI Systems: A Framework for Detecting and Preventing Interface Mismatch at Scale](https://dzone.com/articles/integration-reliability-for-ai-systems-a-framework)**
    - *Source*: DZone
    - *Date*: February 24, 2026
    - *Summary*: A comprehensive framework for maintaining integration reliability as AI systems scale, specifically addressing the class of failures where AI component outputs drift out of sync with downstream consumer expectations — interface mismatch failures that are harder to detect than traditional schema validation errors. Covers contract testing for AI outputs, canary deployments for model updates, and observability patterns for catching semantic drift before it causes cascading failures.

12. **[MatX Raises $500M for Nvidia Challenger AI Chips](https://techcrunch.com/2026/02/24/nvidia-challenger-ai-chip-startup-matx-raised-500m/)**
    - *Source*: TechURLs / TechCrunch
    - *Date*: February 24, 2026
    - *Summary*: AI chip startup MatX raised $500 million to compete with Nvidia's dominance in AI inference accelerators. The company focuses on high-performance inference hardware optimized for the specific compute patterns of transformer inference workloads — a different target than Nvidia's training-heritage H100/H200 lineup. The raise signals continued investor conviction that a viable Nvidia challenger can emerge in inference-specific silicon, distinct from AMD's more general-purpose GPU approach.

13. **[Claude Code Remote Control Feature Launch](https://code.claude.com/docs/en/remote-control)**
    - *Source*: TechURLs / Anthropic
    - *Date*: February 24, 2026
    - *Summary*: Anthropic launches Remote Control for Claude Code, enabling users to initiate long-running coding tasks in their terminal and then monitor and control the session from a mobile device or web browser while the code continues executing on their development machine. Addresses a practical pain point for extended agentic sessions — engineers no longer need to stay at their desk for multi-hour coding agent runs, and can review intermediate outputs and provide guidance from anywhere.

14. **[Building Event-Driven Data Pipelines in GCP](https://dzone.com/articles/building-event-driven-data-pipelines-gcp)**
    - *Source*: DZone
    - *Date*: February 24, 2026
    - *Summary*: A technical guide to building event-driven data pipelines on Google Cloud Platform, covering Pub/Sub as the event backbone, Dataflow for streaming processing, BigQuery for analytics storage, and Cloud Composer for orchestration. Includes architecture patterns for fan-out consumers, dead letter queues, exactly-once processing guarantees, and backpressure handling — foundational infrastructure for AI systems requiring real-time data ingestion and transformation.

15. **[Google's New 1.9GW Clean Energy Deal Includes Massive 100-Hour Battery](https://techcrunch.com/2026/02/24/googles-new-1-9gw-clean-energy-deal-includes-massive-100-hour-battery/)**
    - *Source*: TechURLs / TechCrunch
    - *Date*: February 24, 2026
    - *Summary*: Google announced a major clean energy agreement adding 1.9GW of generation capacity paired with innovative 100-hour duration battery storage systems — significantly longer than current grid-scale battery deployments. The deal directly addresses the intermittency problem that has limited renewable energy's ability to power AI data centers 24/7, and represents a meaningful advance in sustainable AI infrastructure strategy.

16. **[Uber Engineers Built an AI Version of Their Boss](https://techcrunch.com/2026/02/24/uber-engineers-built-ai-version-of-boss-dara-khosrowshahi/)**
    - *Source*: TechURLs / TechCrunch
    - *Date*: February 24, 2026
    - *Summary*: Uber engineering teams built an AI persona trained on CEO Dara Khosrowshahi's writing, talks, and decision-making patterns to help prepare high-stakes internal presentations. The system allows engineering leaders to "pitch" Dara's AI counterpart before the real presentation, getting predictive feedback on likely objections and preferred framing. A concrete example of practical enterprise AI deployment that has moved beyond chatbots into AI-augmented organizational processes.

17. **[Danish government agency to ditch Microsoft software](https://therecord.media/denmark-digital-agency-microsoft-digital-independence)**
    - *Source*: Hacker News / The Record
    - *Date*: February 25, 2026
    - *Summary*: Denmark's Agency for Digital Government (Digitaliseringsstyrelsen) announced plans to migrate away from Microsoft software across its operations in favor of digital sovereignty and open-source alternatives. The move reflects growing European institutional concern about dependency on US cloud providers for critical government infrastructure, with timing coinciding with escalating EU–US trade tensions and data governance debates.

18. **[What it means that Ubuntu is using Rust](https://smallcultfollowing.com)**
    - *Source*: Hacker News
    - *Date*: February 24, 2026
    - *Summary*: Canonical's decision to adopt Rust in core Ubuntu system components is analyzed through the lens of what it signals for the broader Linux ecosystem, systems programming, and memory safety in infrastructure software. Covers practical implications for package maintainers, compatibility considerations, and the pace at which Rust is displacing C in foundation-layer software — directly relevant to developers building systems-level tooling and cloud infrastructure components.

19. **[Show HN: Moonshine Open-Weights STT models – higher accuracy than WhisperLargev3](https://github.com/moonshine-ai/moonshine)**
    - *Source*: Hacker News
    - *Date*: February 24, 2026
    - *Summary*: Moonshine AI releases open-weight speech-to-text models claiming accuracy improvements over OpenAI's Whisper Large v3 while being faster and lighter weight. The models are designed for local and edge deployment, providing developers with a new best-in-class open alternative for speech transcription in applications, voice interfaces, and real-time AI systems.

20. **[PgDog – Scale Postgres without changing the app](https://github.com/pgdogdev)**
    - *Source*: Hacker News
    - *Date*: February 24, 2026
    - *Summary*: PgDog is a new open-source PostgreSQL proxy providing transparent horizontal scaling through automatic connection pooling and query routing, without requiring any application code changes. Enables read replica load balancing, sharding, and connection multiplexing as a drop-in infrastructure layer — relevant for teams scaling data-intensive AI applications that rely on Postgres without wanting to rewrite query layers.

21. **[The DevSecOps Paradox: Why Security Automation Is Both Solving and Creating Pipeline Vulnerabilities](https://dzone.com/articles/the-devsecops-paradox-why-security-automation-is-b)**
    - *Source*: DZone
    - *Date*: February 24, 2026
    - *Summary*: An analysis of the counterintuitive risk introduced by DevSecOps security automation: as pipelines become more complex, the automation systems themselves — SAST tools, container scanners, secret detection hooks — become attack surfaces and can introduce false confidence, supply chain exposure, and configuration drift. Provides an architectural framework for balancing automated security coverage with the risks of over-automation in CI/CD pipelines.

22. **[OpenAI, the US government and Persona built an identity surveillance machine](https://vmfunc.re/blog/persona/)**
    - *Source*: Hacker News
    - *Date*: February 24, 2026
    - *Summary*: An investigative piece examining the collaboration between OpenAI, the US government, and identity verification company Persona to build what the author characterizes as a powerful AI-enabled identity surveillance and verification infrastructure. Details the technical architecture, the data flows involved, and raises significant privacy and civil liberties questions about the expansion of AI-powered identity systems with government backing.

23. **[Fake Job Interviews Are Installing Backdoors on Developer Machines](https://threatroad.substack.com/p/fake-job-interviews-are-installing)**
    - *Source*: Reddit /r/programming
    - *Date*: February 25, 2026
    - *Summary*: Security researchers document a sophisticated, ongoing social engineering campaign targeting software developers with fake technical job interviews that deploy malware during the coding assessment phase. Victims are sent a repository to clone and run locally, with hidden payloads that establish persistent backdoors. Particularly insidious given that developers are trained to run code locally during interviews. Practical defense guidance is included.

24. **[Reducing the size of Go binaries by up to 77%](https://www.datadoghq.com/blog/engineering/agent-go-binaries/)**
    - *Source*: Reddit /r/programming / Datadog Engineering
    - *Date*: February 24, 2026
    - *Summary*: Datadog's engineering team documents their techniques for dramatically reducing Go binary sizes — relevant to cloud-native and edge deployments where binary size impacts container image size, startup time, and distribution cost. Covers dead code elimination with `go build -trimpath`, linker flags, UPX compression with tradeoffs, and architecture-specific builds. Achieved 77% reduction in practice for the Datadog Agent binary.

25. **[RFC 406i: The Rejection of Artificially Generated Slop (RAGS)](https://406.fail)**
    - *Source*: Reddit /r/programming
    - *Date*: February 24, 2026
    - *Summary*: A satirical-yet-technical proposed internet standard for identifying and rejecting AI-generated low-quality content at the protocol level, complete with HTTP status code, response headers, and MIME type specifications for signaling "AI slop" rejection. The RFC format is parody but the underlying technical specifications (content authenticity headers, provenance metadata) touch on real active discussions in the W3C and IETF about AI content disclosure standards.
