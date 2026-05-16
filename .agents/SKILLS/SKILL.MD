---
name: app-quality-builder
description: Build, improve, debug, polish, and prepare production-quality app features in this repository. Use when Codex is asked to create a working web app feature, fix broken frontend/backend behavior, connect UI to APIs, improve UX, harden auth or data flow, verify the app, or prepare branch and PR-ready changes for the AI Vaidya FastAPI plus Next.js application.
---

# App Quality Builder

Use this skill to turn app-building requests into working, tested, production-minded changes. The goal is not just to make code compile, but to leave the app usable, coherent, secure, and easy for the next engineer to continue.

## Project Shape

- Treat `backend/` as the FastAPI service for auth, sessions, uploads, RAG retrieval, LLM orchestration, Chroma, Postgres, and Redis integration.
- Treat `fronteend-1/` as the active Next.js frontend. Use its existing App Router, TypeScript, Tailwind, Radix UI components, hooks, and `lucide-react` patterns.
- Treat `data/` and `vector_store/` as source and index data. Do not rewrite, delete, or regenerate them unless the task explicitly requires it.
- Treat uploaded files, logs, SQLite databases, cache files, `.env` files, and generated build output as local runtime artifacts. Avoid committing or depending on them.

## Operating Rules

1. Inspect before editing. Read the relevant route, component, service, test, and config files before choosing an approach.
2. Preserve existing architecture. Extend current services, routers, components, hooks, and helper APIs instead of creating parallel systems.
3. Keep changes focused. Do not mix unrelated visual redesigns, backend refactors, dependency churn, or generated files into a feature.
4. Prefer real functionality over placeholders. Wire buttons, forms, loading states, errors, empty states, and API calls end to end.
5. Never hardcode secrets, keys, user ids, absolute machine paths, production URLs, model answers, fake retrieval results, or auth bypasses. Use config, environment variables, typed constants, or existing source data.
6. Protect user data. Enforce session ownership, authenticated access, upload boundaries, and safe file handling in every backend and frontend path that touches private data.
7. Keep AI behavior source-grounded. For Ayurveda Q&A, answer from retrieved or uploaded context. Do not let internet content become the answer source unless a feature explicitly marks it as external verification and shows that distinction.
8. Reduce bias and unsafe medical behavior. Avoid diagnosis, certainty beyond the source, demographic stereotyping, or one-size-fits-all prescriptions. Include safety language through existing product patterns when health advice could be mistaken for medical care.
9. Prefer deterministic code paths for validation, parsing, retrieval orchestration, and data shaping. Use LLM calls for language tasks, not for core authorization, ownership, or persistence logic.
10. Leave the workspace cleaner than you found it. Remove dead imports, unused state, broken TODO scaffolding, and debug output introduced during the task.

## Build Workflow

1. Clarify the feature from local context. If the request is vague, infer the smallest useful behavior and document the assumption in the final response.
2. Check repo status before work. Notice user changes and avoid reverting unrelated edits.
3. For feature or fix work, use a focused branch name such as `codex/chat-upload-state` when branch creation is in scope. Keep each feature PR-sized.
4. Map the change across the stack:
   - API contract and backend validation.
   - Frontend state, UI, loading, error, and empty states.
   - Auth/session ownership.
   - Tests or smoke checks.
5. Implement from the data boundary inward. Define or reuse typed request/response shapes, then connect services, routes, hooks, and components.
6. Verify with automated checks first, then manual browser checks for UI-facing changes.
7. Summarize what changed, what was verified, and any remaining risk or blocked check.
8. For broad "production-ready" requests or final release passes, also apply `.agents/SKILLS/production-readiness-review/SKILL.md` when it exists.

## Backend Standards

- Use FastAPI dependency injection, Pydantic models, SQLAlchemy models/repositories, and existing service boundaries.
- Validate inputs at the route or schema boundary. Return useful HTTP errors without leaking internals.
- Keep auth and ownership checks server-side. Frontend hiding is not security.
- Keep upload handling defensive: validate file type, size, session ownership, storage path, and parsing failures.
- Keep RAG answers auditable. Preserve snippets, source identifiers, confidence or verification fields when the existing flow supports them.
- Make async boundaries explicit. Do not block request handlers with avoidable long-running work when a job/service pattern already exists.
- Log operational context without logging secrets, tokens, full private documents, or unnecessary health details.

## Frontend Standards

- Build the actual app screen first, not a landing page, unless the request is specifically for marketing content.
- Match existing design language in `fronteend-1/components` and `fronteend-1/app`. Use existing UI primitives before adding new ones.
- Use `lucide-react` icons for icon buttons when available. Add accessible labels and tooltips for icon-only controls.
- Make workflows complete: disabled states, pending states, retry paths, upload progress, validation messages, and successful completion feedback.
- Keep layouts responsive. Check narrow mobile and desktop widths for clipped text, overlapping controls, unstable grids, and fixed-size panels.
- Keep text practical and domain-aware. Avoid visible instructional copy that merely explains how the UI works when the control itself can make the action clear.
- Avoid nested cards, decorative clutter, one-color palettes, and oversized hero treatment inside operational screens.
- Keep API calls centralized through existing helpers such as `lib/*-api.ts` when applicable.

## AI Vaidya Product Rules

- Preserve the hackathon requirement: answers should be based on provided Ayurveda texts, uploaded files, or indexed datasets.
- Show useful context snippets or source references when the answer flow supports them.
- Make uncertainty visible when retrieved context is weak, conflicting, or missing.
- Keep plant image detection, prescription/document analysis, and chat answers separated in the UI and backend enough that users can understand what evidence was used.
- Do not present Ayurveda guidance as emergency, diagnostic, or personalized medical authority.

## Verification

Run the narrowest reliable checks for the touched area, then broaden when shared code changed.

Backend checks:

```powershell
cd backend
.\.venv\Scripts\python -m pytest
```

Frontend checks:

```powershell
cd fronteend-1
npm run lint
npm run build
```

Manual app smoke checks:

- Start the backend on `127.0.0.1:5500` when backend behavior changed.
- Start the frontend with `npm run dev` when UI changed.
- Use the browser to verify the changed user flow, including loading, failure, empty, and success states.
- For chat changes, verify a new message appears immediately, the assistant response arrives, uploads remain associated with the correct session, and another user's session cannot be accessed.

If a check cannot run because of missing services, credentials, or dependencies, state the exact blocker and still run any checks that do not depend on it.

## PR Readiness

- Keep every feature or fix branch focused on one coherent change.
- Exclude runtime artifacts: logs, local databases, caches, uploaded private files, `node_modules`, build directories, vector stores, and `.env` files.
- Include tests or a clear verification note for each behavior change.
- Before finalizing, review `git diff` for accidental formatting churn, secrets, generated files, and unrelated edits.
- When a PR is requested and credentials/tools are available, create the PR with a concise title, summary, test notes, and any known limitations.

## Continuous Skill Updates

- After substantial work, decide whether the task revealed a durable project rule, setup command, API contract, architecture boundary, common failure mode, or verification step.
- If yes, update this skill, `.agents/SKILLS/production-readiness-review/SKILL.md`, or `.agents/SKILLS/references/project-memory.md` so future agents inherit the lesson.
- Keep the update reusable. Do not add a task-by-task changelog, temporary debugging notes, secrets, private user data, or one-off implementation details.
- Run the skill validator after changing a skill:

```powershell
python C:/Users/parth/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/SKILLS
python C:/Users/parth/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/SKILLS/production-readiness-review
```
