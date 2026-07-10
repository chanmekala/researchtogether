# ResearchTogether — Product Concept

*Solidified 2026-07-10, based on the prototype at github.com/chanmekala/researchtogether. Revised same day: co-browsing demoted to scheduled sessions; context-first collection (Dia-style) and deliverable-driven templates added.*

## One-line positioning

**The collaborative workspace where research teams turn every kind of source into a finished deliverable — with every claim traceable back to the source and the person who found it.**

Lineage: a modern productization of SearchTogether (Morris & Horvitz, UIST 2007), rebuilt around an ask-driven synthesis pipeline.

## The organizing idea: the ask configures the workspace

A project starts by declaring its **deliverable type** — the "final ask." That single choice shapes everything downstream: what the capture layer asks you to tag, how the AI reads your sources, what the output template looks like, and which quality checks run before export.

| Deliverable type | Output template | Capture prompts | Pre-export checks |
|---|---|---|---|
| **Research paper** | Abstract, lit review, methods, findings, references | Citation metadata (DOI, authors, date) auto-captured on every highlight | Citation completeness, plagiarism check, quote-vs-paraphrase audit |
| **UX research deck** | Themes, insights, evidence, design opportunities, next steps | Tag each highlight: insight / pain point / opportunity / quote | Every insight backed by ≥N evidence items; participant coverage |
| **Journalism draft** | Nut graf, narrative sections, quotes, sources list | Quote attribution, on/off record, verification status | Fact-check log complete; every quote sourced |
| **Analysis / brief** | Executive summary, findings, data, recommendations | Claim vs. data vs. interpretation tagging | Recommendation-to-evidence traceability |

Templates are data, not code — so new deliverable types (grant proposal, market scan, systematic review) can be added, and organizations can define their own (an Enterprise/institution lever).

## The core loop

**Gather (with context) → Discuss → Synthesize (against the ask) → Deliver (checked)**

### 1. Gather — the multimodal source library (Dia-browser model)

The project has one shared space where the team collects and works with *everything*, not just web pages:

- **Browse & search with context** — the built-in search and AI assistant operate over what the project has already collected, not just the open web. Upload or link sources directly: URLs, PDFs, images, videos, datasets, prior notes.
- **One surface for all source types** — open a PDF and annotate it in the same space you browse the web; videos get transcripts so passages are highlightable and citable with timestamps; images can be annotated and referenced.
- **Everything lands in the source library** — every source carries its metadata (who added it, when, from where, citation info), and every annotation stays anchored to its exact location in the source.
- **Browser extension** as the primary web-capture path (works on logged-in and paywalled pages); in-app browsing/reader-view as the secondary path.

The library is what the AI grounds itself in: cross-source Q&A, summaries, and drafts all cite items from the library — never from thin air.

### 2. Discuss

Inline comments anchored to highlights (in pages, PDFs, video transcripts), threaded replies, resolve/unresolve, project chat.

**Research Sessions** (formerly default co-browsing, now a scheduled feature): the team books a live session inside a project — shared browsing, live cursors, presence, chat. When the session ends, everything captured (sources, highlights, decisions from chat) is logged back into the persistent project. Live multiplayer becomes an *event within* the project, not the product's default mode — which also removes the fragile proxy from the everyday path.

### 3. Synthesize — against the ask

Highlights, comments, and annotations are promoted into **finding cards**. The deliverable template pulls cards into its structure: a UX deck template slots tagged insights into the Insights section and surfaces untagged evidence as "unplaced"; a paper template assembles the reference list from captured citation metadata as you go. AI assists by drafting narrative around the cards, deduplicating findings, and flagging template sections with thin evidence.

### 4. Deliver — checked

Before export, the deliverable type's checks run: plagiarism and citation completeness for papers, fact-check status for journalism, evidence coverage for decks. Exports: DOCX/PDF/Markdown, PPTX/Google Slides, BibTeX/APA (Zotero-compatible).

## Target users

**Primary: professional research teams** — UX researchers, analysts, consultants, journalists. Deliverables: decks, briefs, drafts.

**Co-primary: academic researchers** — lab groups, co-authors, lit-review teams. Deliverables: papers, lit reviews, bibliographies. PDF-and-citation support is table stakes for them.

The deliverable-type system is what lets one product serve both without becoming generic: each audience sees a workspace shaped like *their* output.

Accessibility layer (font modes, contrast, spacing, keyboard nav) stays — a differentiator, and a procurement advantage in education.

## Monetization (three layers, sequenced)

1. **Freemium per-seat SaaS** (launch model)
   - Free: 1–2 projects, up to ~3 collaborators, basic templates, watermarked exports.
   - Pro (~$12–20/seat/mo): unlimited projects, all templates, full history, clean exports, integrations (Zotero, Notion, Slides), Research Sessions.
2. **AI premium tier** (fast follow) — context-aware search, cross-source Q&A, video transcription, draft generation, dedup — gated by tier or usage credits. Multimodal ingestion has real compute cost, which naturally justifies this tier. Plagiarism checking (third-party API cost) also lives here or in the edu tier.
3. **Education/institution licensing** (scale channel) — site licenses for universities and libraries; WCAG accessibility, citation-integrity, and plagiarism tooling fit procurement criteria; SSO + admin console; **custom institutional templates** as an upsell.

## Roadmap phases

1. **Foundation** — auth, persistence (projects with a declared deliverable type from day one), source library data model, existing real-time collab kept, basic doc export.
2. **Capture** — browser extension, PDF viewing + annotation, image upload; citation metadata auto-capture.
3. **Templates & synthesis** — deliverable templates as data, finding cards, template-driven doc + deck builder, pre-export checks (citations first; plagiarism via API later).
4. **Context engine (AI)** — search-with-context over the library, cross-source Q&A, summarization, draft generation, video transcription.
5. **Sessions & institutions** — scheduled Research Sessions (proxy revived as an event feature), SSO, admin, WCAG audit, licensing, custom templates.

*Note: templates (phase 3) deliberately precede heavy AI (phase 4) — the template system is the differentiator and works without AI; AI then amplifies it.*

## Competition

- **NotebookLM / Dia / Arc**: context-aware research browsing, but single-player and no deliverable pipeline — no team, no templates, no checks.
- **Notion / Google Docs**: the destination today, but no source-anchored capture; evidence dies in paste.
- **Zotero / Mendeley**: citations and PDFs, weak real-time team synthesis, academic-only.
- **Glasp / Hypothesis**: annotation, but no team-to-deliverable pipeline.
- **Elicit / Consensus**: AI literature search, not a team workspace and not multimodal.

Differentiator: **team + traceability + the ask-shaped deliverable in one loop.**

## Known risks & open questions

- **Scope is now large** (multimodal ingestion, extension, templates, AI, sessions). The phasing above is the mitigation; each phase must ship something usable on its own.
- **Video ingestion cost/complexity** — transcription and storage are expensive; start with linked videos (YouTube/Vimeo + transcript fetch) before uploaded video.
- **Plagiarism checking** — build vs. license (Turnitin-class APIs are costly and gated); likely a licensed API in the edu tier.
- **Template quality bar** — the four launch templates must feel expert-made (co-design with a real UX team, a lab group, a journalist).
- Pricing validation: does the academic side come through individual Pro seats or only institutional deals?
