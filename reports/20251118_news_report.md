# News Summary for November 18, 2025

## Summary

Today's tech news is dominated by major AI developments from Google, Microsoft, and Anthropic. Google announced Gemini 3 Pro specifications and integration of Colab into VS Code, while Microsoft faced a massive 15 Tbps DDoS attack on Azure and released updates for Visual Studio 2026's AI features. Anthropic enhanced Claude with code sandboxing capabilities. Additional highlights include systems architecture discussions on reverse proxies at scale, self-supervised learning advances with LeJEPA, and insights into AI development patterns including evaluation strategies and the evolution beyond simple AI wrappers. Cloud computing and software development best practices remain key themes across multiple articles.

## Top 3 Articles

### **1. [Anthropic Adds Sandboxing and Web Access to Claude Code for Safer AI-Powered Coding](https://www.infoq.com/news/2025/11/anthropic-claude-code-sandbox/)**

**Source**: Alvin Ashcraft  

**Date**: November 18, 2025

**Detailed Summary**: 

Anthropic has released comprehensive sandboxing capabilities for Claude Code, addressing critical security risks that arise when AI systems have broad access to developer codebases. The company built a dual-boundary security architecture using OS-level features: **filesystem isolation** ensures Claude can only access specific directories, preventing compromised instances from modifying sensitive system files, while **network isolation** restricts connections to approved servers only, preventing data exfiltration and malware downloads. According to Anthropic, both boundaries must work together—without network isolation, a compromised agent could leak SSH keys; without filesystem isolation, an agent could escape the sandbox and gain network access.

**Key Technical Implementations:**
- **Web-based Claude Code** runs in Anthropic-managed virtual machines with custom proxy services for git interactions, using scoped credentials that verify contents before attaching authentication tokens
- **Security Model Shift**: Moves away from permission-based systems that cause "approval fatigue" where users repeatedly click approve without careful review, instead defining clear boundaries that reduce permission prompts while maintaining safety
- **Workflow**: When starting a task, the system clones repositories to isolated VMs, Claude analyzes code within secure cloud environments with configurable internet access, and creates pull requests for review upon completion

**Relevance to AI Development Best Practices:**
This represents a critical evolution in AI-powered development tools, prioritizing security without sacrificing developer productivity. The architecture demonstrates how AI tools can maintain strict security boundaries while enabling autonomous code generation, testing, and debugging—a blueprint for safe AI agent deployment in enterprise environments. Essential reading for teams implementing AI coding assistants, particularly those concerned with prompt injection attacks and maintaining codebase security. Anthropic's approach of reducing interruptions while increasing safety protections sets a new standard for AI development tools and frameworks.

### **2. [Azure hit by 15 Tbps DDoS attack using 500k IP addresses](https://www.bleepingcomputer.com/news/microsoft/microsoft-aisuru-botnet-used-500-000-ips-in-15-tbps-azure-ddos-attack/)**

**Source**: Hacker News  

**Date**: November 18, 2025

**Detailed Summary**: 

Microsoft Azure's network was hit with a massive 15.72 terabits per second (Tbps) DDoS attack originating from the Aisuru botnet, which orchestrated over 500,000 IP addresses to generate nearly 3.64 billion packets per second (bpps) targeting a specific public IP address in Australia. This attack ranks among the largest on record, with the same Aisuru botnet previously responsible for Cloudflare's record-breaking 22.2 Tbps attack in September 2025.

**Attack Characteristics & Botnet Origins:**
- **Attack Vector**: Extremely high-rate UDP floods with minimal source spoofing and random source ports, which simplified traceback and provider enforcement
- **Aisuru Botnet**: A Turbo Mirai-class IoT botnet that exploits compromised home routers, IP cameras, DVRs/NVRs, Realtek chips, and routers from T-Mobile, Zyxel, D-Link, and Linksys
- **Growth Pattern**: Ballooned to ~300,000 bots by October 2025, then surged to ~500,000 after operators breached a TotoLink router firmware update server in April 2025, infecting approximately 100,000 devices in one event
- **Infrastructure Impact**: The September attack was equivalent to streaming one million 4K videos simultaneously, lasting only 40 seconds

**Industry Context & Cloudflare's Response:**
Cloudflare removed multiple Aisuru-linked domains from its "Top Domains" rankings after the botnet deliberately flooded Cloudflare's DNS service (1.1.1.1) with malicious queries to artificially boost domain popularity, overtaking legitimate sites like Amazon, Microsoft, and Google. This behavior severely distorted ranking systems, prompting Cloudflare to implement policies to redact or hide suspected malicious domains.

**Broader Security Implications:**
The attack demonstrates the escalating sophistication of distributed attacks targeting major cloud providers. Cloudflare reported a 198% quarter-over-quarter and 358% year-over-year increase in DDoS attacks, blocking 21.3 million attacks in 2024. For Azure customers and cloud architects, this incident underscores critical needs: comprehensive DDoS mitigation strategies, multi-layered security architectures, and robust monitoring systems capable of detecting and responding to multi-terabit attacks. Essential reading for security teams, cloud architects, and anyone responsible for maintaining high-availability services on Azure or other cloud platforms.

### **3. [Developers Test Visual Studio 2026's AI-Native Claims](https://thenewstack.io/developers-test-visual-studio-2026s-ai-native-claims/)**

**Source**: Alvin Ashcraft  

**Date**: November 18, 2025

**Detailed Summary**: 

Microsoft has released Visual Studio 2026 as generally available, positioning it as "the world's first Intelligent Developer Environment (IDE)" with AI capabilities woven throughout the platform rather than bolted on as separate features. The release marks the most community-driven version in Visual Studio's history, having drawn more testers during preview than any previous release and addressing over 5,000 reported bugs plus 300 feature requests.

**AI Integration Philosophy & Implementation:**
Microsoft's approach emphasizes AI as a productivity enhancer that removes friction without disrupting developer flow. As Principal Product Manager Mads Kristensen stated, "It means giving you intelligence when it matters most. If you're debugging a tricky issue, profiling performance, or modernizing an application, AI steps in to remove friction and surface insights." Unlike traditional AI assistant models (like Cursor's chat window), VS 2026 embeds AI directly into core IDE functions including the debugger, profiler, and even basic copy-paste operations.

**Key AI-Powered Features:**
- **Intelligent Copy-Paste**: Automatically converts pasted code according to project, corporate, and personal preferences, even transcoding between languages—addressing the shift from Stack Overflow to ChatGPT as code sources
- **C# and C++ Agents**: Precision tools designed for professional developers (C++ still in private preview)
- **GitHub Copilot Integration**: Now central to Visual Studio workflow, with significantly improved Agent mode bringing VS 2026 capabilities close to VS Code's Agent functionality
- **AI-Powered Profiling**: The Profiler Agent immediately highlights bottlenecks and provides guided optimization—described by Redis architect Roberto Perez as "having a built-in performance coach"
- **App Modernization**: Copilot accelerates upgrades to .NET 10 and latest C++ build tools with guided expertise

**Real-World Developer Feedback:**
- **Performance**: Rockford Lhotka (Microsoft MVP, Xebia) reports VS 2026 is faster and more responsive than VS 2022, now using it more than VS Code especially for Blazor apps due to combined AI capabilities and superior feature set
- **Architecture Improvements**: Richard Campbell (CloudArmy chairman, Microsoft MVP) notes extensive internal threading work makes the IDE "snappier" with background processing that doesn't impact user experience
- **Analyst Perspective**: Brad Shimmin (The Futurum Group) highlights Microsoft's success in "flipping the script with AI" where AI becomes core functionality rather than a separate tool

**Strategic Implications for Microsoft & Developer Tools:**
This release demonstrates Microsoft's vision for AI-native development environments and sets expectations for how AI should integrate into professional development workflows. The focus on embedding AI into existing workflows rather than creating separate AI interactions represents a maturation of AI tooling. For organizations evaluating AI development tools, VS 2026 provides a blueprint for enterprise-grade AI integration that maintains developer productivity without overwhelming users with AI interactions. Critical for understanding Microsoft's developer tool strategy and the practical evolution of AI-augmented software development beyond simple code completion.

## Other Articles

1. **[Google Colab is Coming to VS Code](https://developers.googleblog.com/en/google-colab-is-coming-to-vs-code/)**
   - *Source*: Alvin Ashcraft
   - *Date*: November 18, 2025
   - *Summary*: Google announces native integration of Colab notebooks into VS Code, enabling cloud-based Python development directly within the editor. This bridges local development environments with Google's cloud computing infrastructure, streamlining workflows for data science and machine learning development. Major update affecting software development tools and cloud computing practices.

2. **[How to Build an AI-Powered Writing Assistant in Angular Using Google Gemini API (Part 1)](https://www.syncfusion.com/blogs/post/ai-writing-assistant-angular-gemini)**
   - *Source*: Alvin Ashcraft
   - *Date*: November 18, 2025
   - *Summary*: Comprehensive tutorial demonstrating practical implementation of Google's Gemini API in Angular applications. Covers AI development patterns, integration best practices, and real-world application architecture for building AI-powered features in web applications using Google's AI tools.

3. **[Gemini 3 Pro Model Card](https://pixeldrain.com/u/hwgaNKeH)**
   - *Source*: Hacker News
   - *Date*: November 18, 2025
   - *Summary*: Technical specifications and capabilities documentation for Google's latest Gemini 3 Pro AI model. Provides detailed information about model architecture, performance benchmarks, limitations, and use cases. Essential for developers planning to integrate Gemini into their applications.

4. **[When Reverse Proxies Surprise You: Hard Lessons from Operating at Scale](https://www.infoq.com/articles/scaling-reverse-proxies/)**
   - *Source*: Hacker News
   - *Date*: November 18, 2025
   - *Summary*: Detailed technical analysis of challenges encountered when operating reverse proxies at massive scale. Covers systems design principles, architecture patterns, performance optimization, and hard-won lessons from production deployments. Valuable insights for cloud infrastructure and systems architecture.

5. **[From Code to Cloud: Python-Driven Microsoft Fabric Deployments](https://techcommunity.microsoft.com/t5/azure-infrastructure-blog/from-code-to-cloud-python-driven-microsoft-fabric-deployments/ba-p/4470447)**
   - *Source*: Alvin Ashcraft
   - *Date*: November 18, 2025
   - *Summary*: Microsoft's comprehensive guide on automating Microsoft Fabric deployments using Python. Demonstrates infrastructure as code patterns, cloud computing best practices on Azure, and modern approaches to managing Microsoft's unified data platform.

6. **[LeJEPA: Provable and Scalable Self-Supervised Learning Without the Heuristics](https://arxiv.org/abs/2511.08544)**
   - *Source*: Hacker News
   - *Date*: November 18, 2025
   - *Summary*: Research paper presenting LeJEPA, a novel approach to self-supervised learning with theoretical guarantees and improved scalability. Advances AI development patterns by removing reliance on heuristics, offering rigorous mathematical foundations for self-supervised methods. Relevant to AI frameworks and machine learning best practices.

7. **[A/B Tests over Evals](https://www.raindrop.ai/blog/thoughts-on-evals/)**
   - *Source*: Hacker News
   - *Date*: November 18, 2025
   - *Summary*: Critical analysis of evaluation strategies for AI systems, comparing traditional evaluation methods with A/B testing approaches. Discusses best practices for measuring AI system performance, testing methodologies, and practical considerations for production AI deployments.

8. **[The death of AI wrappers is actually happening. Here's what's replacing them.](https://www.reddit.com/r/ArtificialInteligence/comments/1p09tol/the_death_of_ai_wrappers_is_actually_happening/)**
   - *Source*: Reddit r/ArtificialInteligence
   - *Date*: November 18, 2025
   - *Summary*: Analysis of the evolution from simple AI wrapper products to more sophisticated AI applications. Discusses how OpenAI, Anthropic, Google, and Microsoft are building features that commoditize basic wrapper functionality, forcing startups to deliver genuine innovation and deeper integrations.

9. **[I caught Google Gemini using my data and then covering it up](https://unbuffered.stream/gemini-personal-context/)**
   - *Source*: Hacker News
   - *Date*: November 18, 2025
   - *Summary*: Investigation into Google Gemini AI's data usage practices and privacy concerns. Raises important questions about data handling transparency in AI tools and user privacy in Google's AI products. Relevant for understanding AI development ethics and practices.

10. **[One-Minute Daily AI News 11/17/2025](https://www.reddit.com/r/ArtificialInteligence/comments/1p036wx/oneminute_daily_ai_news_11172025/)**
    - *Source*: Reddit r/ArtificialInteligence
    - *Date*: November 18, 2025
    - *Summary*: Quick roundup of AI industry news including OpenAI being named an Emerging Leader in Generative AI, Jeff Bezos creating a new AI startup as co-CEO, and Google rolling out AI flight deals tool globally. Covers updates from major AI companies and industry developments.

11. **[He's Been Right About AI for 40 Years. Now He Thinks Everyone Is Wrong.](https://www.reddit.com/r/ArtificialInteligence/comments/1ozuri3/hes_been_right_about_ai_for_40_years_now_he/)**
    - *Source*: Reddit r/ArtificialInteligence
    - *Date*: November 18, 2025
    - *Summary*: Profile of Yann LeCun, one of the godfathers of AI and Meta's chief AI scientist, discussing his contrarian views on current AI trends. Provides perspective from a pioneering researcher on the direction of AI development and industry trends at Meta.

12. **[Chaining Veo 3.1 and NanoBanana with Gemini](https://dev.to/googleai/chaining-veo-31-and-nanobanana-with-gemini-3ffi)**
    - *Source*: dev.to
    - *Date*: November 18, 2025
    - *Summary*: Technical tutorial demonstrating how to chain Google's Veo 3.1 video generation model with NanoBanana using the Gemini API. Illustrates advanced AI development patterns, multi-model orchestration, and integration techniques for Google's AI tools.

13. **[I Cloned Myself in 2 Minutes to Answer Gemini API Questions](https://dev.to/googleai/i-cloned-myself-in-2-minutes-to-answer-gemini-api-questions-2dmf)**
    - *Source*: dev.to
    - *Date*: November 18, 2025
    - *Summary*: Quick implementation guide showing rapid AI cloning using Google's Gemini API. Demonstrates the speed and ease of building personalized AI applications with Google's platform, highlighting practical AI tools usage and development patterns.

14. **[[P] DeepClause - A Neurosymbolic AI System](https://www.reddit.com/r/MachineLearning/comments/1p095xc/p_deepclause_a_neurosymbolic_ai_system/)**
    - *Source*: Reddit r/MachineLearning
    - *Date*: November 18, 2025
    - *Summary*: Project showcase of DeepClause, combining neural networks with symbolic AI and logic programming. Represents emerging AI development patterns at the intersection of LLMs, logic programming, and neurosymbolic methods. Relevant to AI frameworks and advanced development approaches.

15. **[Building Conflux - My Own Real-time Collaboration Engine in Rust](https://dev.to/kayleecodez/building-conflux-my-own-real-time-collaboration-engine-in-rust-41lm)**
    - *Source*: dev.to
    - *Date*: November 18, 2025
    - *Summary*: Detailed case study on building a real-time collaboration engine from scratch using Rust. Covers systems design principles, distributed systems architecture, conflict resolution algorithms, and modern software development practices for building scalable infrastructure.

16. **[TabTune by Lexsi Labs — Bringing Foundation-Model Concepts to Tabular Data](https://www.reddit.com/r/ArtificialInteligence/comments/1p071xj/tabtune_by_lexsi_labs_bringing_foundationmodel/)**
    - *Source*: Reddit r/ArtificialInteligence
    - *Date*: November 18, 2025
    - *Summary*: Framework applying foundation model workflows (pre-training, fine-tuning, meta-learning) to tabular data. Addresses an often-overlooked area in AI development by bringing modern AI techniques to structured data, expanding AI tool capabilities beyond NLP and vision.

17. **[Beyond Page One: Building a Highly Robust SEO Lead Generation Agent with Python and SerpApi](https://dev.to/rafajrg21/beyond-page-one-building-a-highly-robust-seo-lead-generation-agent-with-python-and-serpapi-331h)**
    - *Source*: dev.to
    - *Date*: November 18, 2025
    - *Summary*: Practical guide to building an AI-powered SEO agent using Python. Demonstrates AI development patterns for building autonomous agents, integration of AI tools with APIs, and real-world application architecture for business automation.

18. **[[D] Advice for getting into post-training / fine-tuning of LLMs?](https://www.reddit.com/r/MachineLearning/comments/1p0d6q0/d_advice_for_getting_into_posttraining_finetuning/)**
    - *Source*: Reddit r/MachineLearning
    - *Date*: November 18, 2025
    - *Summary*: Community discussion on learning post-training and fine-tuning techniques for large language models. References Nous Research's Hermes models and provides insights into AI development best practices for model customization and optimization.

19. **[How to escape the Linux networking stack](https://blog.cloudflare.com/so-long-and-thanks-for-all-the-fish-how-to-escape-the-linux-networking-stack/)**
    - *Source*: Hacker News
    - *Date*: November 18, 2025
    - *Summary*: Technical deep-dive from Cloudflare on optimizing network performance by bypassing the traditional Linux networking stack. Covers advanced systems design, performance optimization techniques, and architectural approaches for cloud infrastructure at massive scale.

20. **[Microservices: Microliths as a reasonable alternative](https://www.ufried.com/blog/microservices_fallacy_10_microliths/)**
    - *Source*: Reddit r/programming
    - *Date*: November 18, 2025
    - *Summary*: Analysis of microservices architecture patterns and the concept of microliths as a pragmatic alternative. Discusses systems design trade-offs, architectural best practices, and considerations for choosing the right architecture for different use cases.

21. **[dockerlings: Learn Docker in your terminal](https://github.com/furkan/dockerlings)**
    - *Source*: Reddit r/programming
    - *Date*: November 18, 2025
    - *Summary*: Interactive terminal-based tutorial for learning Docker containerization. Relevant to cloud computing practices, software development skills, and modern deployment patterns using containers. Educational resource for mastering essential cloud computing technologies.

22. **[[D] Has anyone used ONNX Runtime (ORT) + CUDA for multilingual embedding models (e.g., LaBSE) on GPUs?](https://www.reddit.com/r/MachineLearning/comments/1ozzu5z/d_has_anyone_used_onnx_runtime_ort_cuda_for/)**
    - *Source*: Reddit r/MachineLearning
    - *Date*: November 18, 2025
    - *Summary*: Technical discussion on using ONNX Runtime with CUDA for optimizing multilingual embedding models on AWS EMR with PySpark. Covers AI development patterns, framework optimization, and cloud computing (AWS) implementations for machine learning pipelines.

23. **[LLMs and creation outside of time](https://balajmarius.com/writings/llms-and-creation-outside-of-time/)**
    - *Source*: Reddit r/programming
    - *Date*: November 18, 2025
    - *Summary*: Philosophical exploration of how large language models are transforming the creative and development workflow. Examines AI's impact on software development practices and the changing nature of creative processes with AI tools.

24. **[[D] Do industry researchers log test set results when training production-level models?](https://www.reddit.com/r/MachineLearning/comments/1oz3he6/d_do_industry_researchers_log_test_set_results/)**
    - *Source*: Reddit r/MachineLearning
    - *Date*: November 18, 2025
    - *Summary*: Discussion on best practices for training production AI models at large tech companies. Explores evaluation methodologies, test set optimization strategies, and AI development practices used by industry leaders. Relevant to AI development best practices.

25. **[An overly aggressive mock can work fine, but break much later](https://nedbatchelder.com/blog/202511/why_your_mock_breaks_later.html)**
    - *Source*: Hacker News
    - *Date*: November 18, 2025
    - *Summary*: Software development best practices article examining testing patterns and the pitfalls of aggressive mocking. Discusses how poorly designed mocks can create technical debt and break unexpectedly, offering guidance on better testing strategies and development practices.
