# Chat Session And Memory Architecture

This app keeps each user's chats isolated by account and by session. A chat session is the parent record. Messages, uploads, and memory belong to exactly one session.

## Data Model

```text
chat_sessions
  id
  clerk_user_id
  title
  created_at
  updated_at

chat_messages
  id
  session_id
  role
  content
  position
  sources_json
  created_at

chat_session_memory
  id
  session_id
  summary_text
  created_at
  updated_at

session_uploads
  id
  session_id
  original_filename
  storage_path
  status
  parse_result_json
  verify_result_json
```

Important rules:

- `chat_sessions.clerk_user_id` is the account boundary.
- `chat_messages.session_id` is the chat boundary.
- `chat_session_memory.session_id` is unique, so one chat has one memory summary.
- `session_uploads.session_id` keeps uploaded files attached to only the chat where they were uploaded.
- `chat_messages.position` gives stable ordering inside one chat, even when timestamps are very close.

## Backend Flow

1. The frontend sends the Clerk bearer token with every chat, history, upload, and delete request.
2. The backend resolves the Clerk user with `require_clerk_user`.
3. Session routes verify ownership before reading, writing, deleting, uploading, or returning files.
4. A new message is inserted with the next `position` for that session only.
5. Chat memory is read from `chat_session_memory`, merged only for the current session, and saved back to that same session.
6. Listing sessions returns only non-empty sessions for the authenticated Clerk user.

Example:

```text
User A
  Chat 1
    message positions: 1, 2, 3
    memory: "User prefers Hindi."

  Chat 2
    message positions: 1, 2
    memory: "User is allergic to peanuts."

User B
  Chat 3
    completely separate from User A
```

In this example, Chat 1 can never read Chat 2 memory, and User B can never list or open User A's chats.

## Frontend Flow

The chat page keeps a single active session id in both React state and a ref. The ref is used inside async work so old requests cannot update the wrong chat after the user switches sessions.

Protected frontend behaviors:

- Switching chats cancels the active response.
- New chat clears active messages and starts from a clean state.
- A pending message load only updates the UI if it still belongs to the current active session.
- A pending chat response only writes server messages, photos, agent steps, and errors if the same session is still active.
- Plant detail links create a fresh chat instead of injecting a herb prompt into the latest chat.
- The stop button aborts the current response without corrupting another chat.

## API Contract

```text
GET    /sessions/
POST   /sessions/
DELETE /sessions/{session_id}
GET    /sessions/{session_id}/messages
GET    /sessions/{session_id}/uploads
POST   /sessions/{session_id}/uploads
GET    /sessions/{session_id}/uploads/{upload_id}/file
POST   /sessions/{session_id}/chat/
```

Every route above requires auth. Routes with a `session_id` must verify that the session belongs to the authenticated Clerk user.

## Production Invariants

Keep these true when changing chat, uploads, auth, memory, or history:

- Never list sessions without `clerk_user_id` filtering.
- Never load messages without both `session_id` and user ownership checks.
- Never reuse memory across sessions.
- Never let frontend async work update messages after the active session has changed.
- Never show empty placeholder sessions in history unless the product intentionally adds drafts.
- Never expose uploaded files without checking the owning session and Clerk user.

## Verification

Run these after changes to chat, memory, uploads, auth, or history:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

```powershell
cd fronteend-1
npm run lint
npx tsc --noEmit --pretty false
npm run build
```

For browser-level checks, start both apps:

```powershell
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 5500 --reload
```

```powershell
cd fronteend-1
npm run dev
```

Then verify sign-in, new chat, session switching, stop, delete, upload, refresh, and plant detail deep link flows.
