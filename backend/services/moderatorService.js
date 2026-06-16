/**
 * AI Moderator Service
 *
 * Per-room state tracks:
 *   - transcript buffer (batches before calling AI)
 *   - last AI call timestamp (cooldown enforcement)
 *   - transcript count since last moderation (batch trigger)
 *   - idle timer (engagement prompt after silence)
 *   - rotating response type queue
 *   - recent moderator messages (avoid repetition)
 *
 * Trigger rules:
 *   gd-start            → Discussion Starter (immediate, no cooldown check)
 *   every 5 transcripts → rotate: Appreciation / Follow-up / Counter
 *   30s idle silence    → Engagement Prompt
 *   gd-end              → AI Summary
 *
 * Cooldown: 30 seconds minimum between any two AI calls (except gd-start/end).
 */

const { callGroqModerator } = require('./groqService');

const COOLDOWN_MS   = 30_000;   // 30 s between moderator messages
const BATCH_SIZE    = 5;        // transcripts before triggering mid-discussion
const IDLE_MS       = 35_000;   // 35 s silence → engagement prompt
const MAX_HISTORY   = 6;        // recent messages kept to avoid repetition

// Response type rotation for mid-discussion triggers
const ROTATE_TYPES  = ['appreciation', 'followup', 'counter', 'engagement'];

// ── Per-room state ────────────────────────────────────────────────────────────

const rooms = {};

const getRoom = (roomId) => {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      topic:           '',
      buffer:          [],        // recent transcripts since last moderation
      lastCallAt:      0,         // timestamp of last AI call
      transcriptCount: 0,         // total transcripts since GD start
      sinceLastMod:    0,         // transcripts since last moderation
      rotateIndex:     0,         // position in ROTATE_TYPES
      history:         [],        // recent moderator message texts
      idleTimer:       null,      // NodeJS timeout handle
      active:          false,
    };
  }
  return rooms[roomId];
};

const destroyRoom = (roomId) => {
  const r = rooms[roomId];
  if (r?.idleTimer) clearTimeout(r.idleTimer);
  delete rooms[roomId];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const isCooledDown = (r) => Date.now() - r.lastCallAt >= COOLDOWN_MS;

const addToHistory = (r, text) => {
  r.history.push(text);
  if (r.history.length > MAX_HISTORY) r.history.shift();
};

const nextRotateType = (r) => {
  const type = ROTATE_TYPES[r.rotateIndex % ROTATE_TYPES.length];
  r.rotateIndex++;
  return type;
};

const resetIdleTimer = (r, roomId, emit) => {
  if (r.idleTimer) clearTimeout(r.idleTimer);
  r.idleTimer = setTimeout(async () => {
    if (!r.active) return;
    if (!isCooledDown(r)) return;
    try {
      const msg = await callGroqModerator({
        type: 'engagement',
        topic: r.topic,
        recentTranscripts: r.buffer,
        history: r.history,
      });
      if (msg) {
        r.lastCallAt = Date.now();
        addToHistory(r, msg);
        emit(roomId, { type: 'engagement', text: msg });
      }
    } catch (err) {
      console.error('[moderator] idle engagement error:', err.message);
    }
  }, IDLE_MS);
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Called when GD starts.
 * Emits a Discussion Starter immediately.
 */
const onGdStart = async (roomId, topic, emit) => {
  const r = getRoom(roomId);
  r.active = true;
  r.topic  = topic || '';

  try {
    const msg = await callGroqModerator({
      type: 'starter',
      topic: r.topic,
      recentTranscripts: [],
      history: [],
    });
    if (msg) {
      r.lastCallAt = Date.now();
      addToHistory(r, msg);
      emit(roomId, { type: 'starter', text: msg });
    }
  } catch (err) {
    console.error('[moderator] gd-start error:', err.message);
  }

  resetIdleTimer(r, roomId, emit);
};

/**
 * Called for every new transcript.
 * Accumulates buffer, fires AI on batch threshold with cooldown guard.
 */
const onTranscript = async (roomId, transcript, emit) => {
  const r = getRoom(roomId);
  if (!r.active) return;

  r.buffer.push(transcript);
  if (r.buffer.length > 10) r.buffer.shift(); // cap buffer at 10
  r.transcriptCount++;
  r.sinceLastMod++;

  // Reset idle timer on every transcript
  resetIdleTimer(r, roomId, emit);

  // Fire on every BATCH_SIZE transcripts, with cooldown
  if (r.sinceLastMod < BATCH_SIZE) return;
  if (!isCooledDown(r)) return;

  r.sinceLastMod = 0;

  const type = nextRotateType(r);
  try {
    const msg = await callGroqModerator({
      type,
      topic: r.topic,
      recentTranscripts: [...r.buffer],
      history: r.history,
    });
    if (msg) {
      r.lastCallAt = Date.now();
      addToHistory(r, msg);
      emit(roomId, { type, text: msg });
    }
  } catch (err) {
    console.error('[moderator] transcript batch error:', err.message);
  }
};

/**
 * Called when GD ends.
 * Emits a closing summary.
 */
const onGdEnd = async (roomId, emit) => {
  const r = getRoom(roomId);
  if (r?.idleTimer) clearTimeout(r.idleTimer);
  r.active = false;

  try {
    const msg = await callGroqModerator({
      type: 'summary',
      topic: r.topic,
      recentTranscripts: r.buffer,
      history: r.history,
    });
    if (msg) {
      emit(roomId, { type: 'summary', text: msg });
    }
  } catch (err) {
    console.error('[moderator] gd-end summary error:', err.message);
  }

  destroyRoom(roomId);
};

/**
 * Called when a topic is set/changed mid-session.
 */
const setTopic = (roomId, topic) => {
  const r = getRoom(roomId);
  r.topic = topic || '';
};

module.exports = { onGdStart, onTranscript, onGdEnd, setTopic };
