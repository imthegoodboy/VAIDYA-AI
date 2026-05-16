# AI Vaidya Offline Android Plan

This folder is for the no-auth, no-backend Android build.

The phone app should contain:

1. `assets/ai_vaidya_knowledge.db` - exported public RAG chunks, FTS index, metadata, and vectors.
2. A local Android LLM runtime - recommended: Google AI Edge LiteRT-LM / MediaPipe GenAI.
3. A local model file - for example a converted Gemma/Qwen `.task` or `.litertlm` model.

Important: current Google AI Edge docs say the LLM model is usually too large to bundle directly in an APK. For a real offline demo, use either:

- APK + preloaded model file copied onto the phone before demo.
- APK + Android asset pack / expansion-style delivery.
- A very large sideload APK, only if the target phone accepts it.

The app flow should be:

```text
User question
  -> query local SQLite FTS/vector pack
  -> select source chunks
  -> build strict grounded prompt
  -> local LLM generates answer
  -> show answer plus book/page/source snippets
```

Export the current web RAG index into the mobile knowledge DB:

```powershell
cd backend
.\.venv\Scripts\python -m app.offline_export --out ..\mobile-offline\assets\ai_vaidya_knowledge.db
```

The APK cannot be honestly called fully offline until both the knowledge DB and the local model file are present on-device.
