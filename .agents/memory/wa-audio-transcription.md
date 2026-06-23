---
name: WhatsApp audio transcription
description: How PTT/voice note messages are transcribed via OpenAI Whisper.
---

Detection: `msg.message.audioMessage || msg.message.pttMessage` (both PTT and regular audio hit this).

Download: `downloadMediaMessage(msg, "buffer", {}, { reuploadRequest: sock.updateMediaMessage })` from `@whiskeysockets/baileys` — returns a `Buffer`.

Transcription: `client.audio.transcriptions.create({ model: "whisper-1", file: await toFile(buffer, "audio.ogg", { type: "audio/ogg" }), language: "pt" })`. WhatsApp encodes all audio as OGG/OPUS which Whisper accepts natively — no conversion needed.

**Why:** `toFile` is imported from `"openai"` (not a separate package). The `reuploadRequest` option prevents download failures when the CDN URL has expired.

**How to apply:** If transcription returns null (no API key, empty buffer, etc.), send a polite fallback text message asking the user to type their question. The transcribed text is saved to the DB as the user message and forwarded to GPT like any text message; SSE preview prefixes it with 🎵.
