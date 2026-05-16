---
name: production-readiness-review
description: Audit, harden, and verify app changes before release, demo, hackathon submission, or PR. Use when Codex is asked to make the app production-ready, run a final quality pass, review security/auth/data/AI safety/UI/deployment readiness, or verify FastAPI plus Next.js behavior before shipping.
---

# Production Readiness Review

## Overview

Use this skill as the final quality gate for AI Vaidya app work. It turns "make it production-ready" into a concrete review of behavior, security, reliability, UX, deployment, and verification evidence.

## Review Workflow

1. Start from the user's requested scope. If the request is broad, review the whole changed surface instead of rewriting unrelated areas.
2. Check `git status --short` and inspect the changed files. Separate user changes from agent changes.
3. Read the active code paths before judging them:
   - Frontend pages, components, hooks, and API helpers under `fronteend-1/`.
   - Backend routers, services, models, schemas, and tests under `backend/`.
   - Config and setup docs such as `README.md`, `.env.example`, `package.json`, and `requirements.txt`.
4. Run targeted checks first, then broader checks if shared code changed.
5. Fix concrete blockers when the user asked for production readiness, not just a review.
6. Re-run the checks that cover the fixed area.
7. Report shipped status with pass/fail notes, exact blockers, and remaining risk.

## Readiness Gates

Review each relevant gate. Do not claim production readiness if a critical gate is untested or failing.

### 1. Functional Behavior

- Verify the happy path works end to end.
- Verify error, empty, loading, retry, and cancellation states where applicable.
- Verify frontend and backend contracts match exactly: route, method, body, response shape, auth header, and error format.
- Verify user-visible state stays consistent after refresh, navigation, failed requests, and repeated actions.

### 2. Security And Privacy

- Keep secrets in environment variables only.
- Enforce authentication and session ownership server-side.
- Validate upload type, size, path, parser behavior, and access boundaries.
- Avoid leaking private document text, tokens, stack traces, local paths, or internal IDs in user-facing errors.
- Check that CORS, auth, and API base URL choices make sense for local and deployed environments.

### 3. AI And Health Safety

- Keep Ayurveda Q&A grounded in retrieved or uploaded source context.
- Show source snippets or references when the product flow supports them.
- Treat weak retrieval as uncertainty, not as permission to invent an answer.
- Avoid diagnosis, emergency advice, guaranteed cures, or demographic assumptions.
- Keep external verification separate from source-grounded answers if both are present.

### 4. UX And Accessibility

- Check desktop and mobile layouts for clipping, overlap, hidden controls, unstable heights, and unreachable actions.
- Confirm forms have labels, validation feedback, disabled states, focus states, and keyboard-friendly controls.
- Confirm icon-only buttons have accessible labels and tooltips when needed.
- Keep copy concise and useful. Avoid explaining obvious UI mechanics inside the app.
- Use existing component patterns and avoid visual churn outside the requested scope.

### 5. Reliability And Performance

- Avoid duplicate requests, runaway polling, memory leaks, unbounded file reads, and long blocking work in request handlers.
- Keep expensive AI, embedding, indexing, and parsing work behind existing service/job boundaries when available.
- Make retries bounded and user-visible.
- Preserve cache, vector store, and database consistency when changing ingestion or chat flows.

### 6. Deployment And Repo Hygiene

- Verify setup docs and examples match the current app structure.
- Exclude logs, uploaded files, local databases, generated caches, `node_modules`, build output, vector stores, and `.env` files.
- Check `package.json`, lockfiles, and dependency changes for necessity.
- Keep branch and PR scope focused. Do not include unrelated user changes.

## Verification Commands

Run commands that match the touched surface.

Backend:

```powershell
cd backend
.\.venv\Scripts\python -m pytest
```

Frontend:

```powershell
cd fronteend-1
npm run lint
npm run build
```

Manual smoke checks:

- Start backend with `uvicorn app.main:app --host 127.0.0.1 --port 5500 --reload` from `backend/` when API behavior changed.
- Start frontend with `npm run dev` from `fronteend-1/` when UI behavior changed.
- Use the browser for any user-facing flow, especially chat, upload, auth redirects, plant/prescription analysis, and responsive layout.

## Output Standard

When reviewing, lead with blockers and serious risks. When fixing, lead with what changed and what passed. Always include:

- Production readiness status: `ready`, `ready with caveats`, or `not ready`.
- Checks run and results.
- Checks not run and exact reason.
- Remaining risks, if any.
- Files changed when implementation happened.

## Skill Update Rule

After each substantial production-readiness pass, update reusable agent knowledge when the work reveals a durable project rule, common failure mode, command, architecture boundary, or verification step. Prefer updating:

- `.agents/SKILLS/SKILL.MD` for general app-building rules.
- `.agents/SKILLS/production-readiness-review/SKILL.md` for release-readiness checks.
- `.agents/SKILLS/references/project-memory.md` for project-specific patterns that are useful but too detailed for the main skill.

Do not add a task-by-task changelog, secrets, temporary failures, or one-off notes. Capture lessons future agents should act on.
