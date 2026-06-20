const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const callGroq = async (prompt) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');

  const response = await axios.post(
    GROQ_API_URL,
    { model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.1 },
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
  );
  return response.data.choices[0].message.content;
};

// ─── Topic Generator ────────────────────────────────────────────────────────

const generateTopic = async () => {
  const prompt = `Generate one unique Group Discussion topic suitable for corporate interviews and placement GD rounds.
The topic must be:
- Relevant to technology, business, society, environment, education, or current affairs
- Thought-provoking and debatable
- Concise — one sentence, maximum 15 words
- No punctuation at the end

Return ONLY the topic text. No quotes, no numbering, no extra text.`;

  try {
    const content = await callGroq(prompt);
    return content.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('[groq] generateTopic error:', error.response?.data || error.message);
    throw new Error('Failed to generate topic');
  }
};

// ─── Feedback Generator ──────────────────────────────────────────────────────

const generateFeedback = async (transcriptData) => {
  const speakerUserId = transcriptData[0]?.userId || '';
  const speakerUserName = transcriptData[0]?.userName || 'Participant';

  const prompt = `You are an expert HR communication coach evaluating a single Group Discussion participant.

Participant: "${speakerUserName}"
Transcripts spoken by this participant only:
${JSON.stringify(transcriptData.map(t => ({ text: t.transcript, duration: t.duration })), null, 2)}

Evaluate ONLY this participant's performance. Do NOT evaluate or mention any other participants.

Return a JSON array with EXACTLY ONE object using this structure:
[
  {
    "userId": "${speakerUserId}",
    "userName": "${speakerUserName}",
    "communicationScore": <integer 0-10>,
    "confidenceScore": <integer 0-10>,
    "grammarScore": <integer 0-10>,
    "participationScore": <integer 0-10>,
    "fluencyScore": <integer 0-10>,
    "vocabularyScore": <integer 0-10>,
    "logicalThinkingScore": <integer 0-10>,
    "overallScore": <integer 0-10>,
    "summary": "<2-3 paragraph personalized performance summary>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
    "betterExpressions": [
      { "original": "<exact phrase from transcript>", "improved": "<professionally rewritten version>" },
      { "original": "<exact phrase from transcript>", "improved": "<professionally rewritten version>" },
      { "original": "<exact phrase from transcript>", "improved": "<professionally rewritten version>" }
    ],
    "vocabularySuggestions": [
      { "word": "<simple word used>", "replacement": "<advanced alternative>" },
      { "word": "<simple word used>", "replacement": "<advanced alternative>" },
      { "word": "<simple word used>", "replacement": "<advanced alternative>" }
    ],
    "communicationTips": ["<personalized tip 1>", "<personalized tip 2>", "<personalized tip 3>"],
    "motivation": "<one encouraging paragraph specific to this participant's performance>"
  }
]

Rules:
- Base ALL feedback on the actual transcript text provided. Never invent content.
- betterExpressions must use EXACT phrases from the transcript above.
- vocabularySuggestions must use ACTUAL words from the transcript.
- If the transcript is short, still provide meaningful feedback based on what was said.
- communicationScore covers clarity, articulation, and expression.
- overallScore is a holistic average of all dimensions.
- Return ONLY the JSON array. No markdown fences, no extra text.`;

  try {
    const content = await callGroq(prompt);
    const startIndex = content.indexOf('[');
    const endIndex = content.lastIndexOf(']');
    if (startIndex === -1 || endIndex === -1) {
      console.error('[groq] no JSON array in response:', content);
      throw new Error('Invalid JSON format from AI');
    }
    return JSON.parse(content.slice(startIndex, endIndex + 1));
  } catch (error) {
    if (error.message === 'Invalid JSON format from AI') throw error;
    console.error('[groq] generateFeedback error:', error.response?.data || error.message);
    throw new Error('Failed to generate AI feedback');
  }
};

// ─── Moderator Message Generator ─────────────────────────────────────────────

const TYPE_META = {
  starter:     { emoji: '👋', label: 'Discussion Starter' },
  appreciation:{ emoji: '✨', label: 'Appreciation'       },
  followup:    { emoji: '💡', label: 'Follow-up'          },
  counter:     { emoji: '🔄', label: 'Counter Perspective'},
  engagement:  { emoji: '🎯', label: 'Engagement Prompt'  },
  summary:     { emoji: '📋', label: 'Summary'            },
};

/**
 * callGroqModerator({ type, topic, recentTranscripts, history })
 * Returns a plain string — the moderator message text.
 */
const callGroqModerator = async ({ type, topic, recentTranscripts = [], history = [] }) => {
  const topicLine    = topic ? `Topic: "${topic}"` : 'Topic: (not yet set)';
  const recentLines  = recentTranscripts.length
    ? recentTranscripts.map(t => `  ${t.userName}: "${t.transcript}"`).join('\n')
    : '  (no messages yet)';
  const historyLines = history.length
    ? history.map(h => `  - ${h}`).join('\n')
    : '  (none)';

  const instructions = {
    starter: `Welcome participants warmly, introduce the topic in one sentence, and set a positive, energetic tone. Invite everyone to share their thoughts.`,
    appreciation: `Acknowledge the quality of recent contributions with a specific, genuine compliment. Reference what was actually said.`,
    followup: `Ask ONE sharp, open-ended follow-up question directly inspired by the last few messages. Make it thought-provoking.`,
    counter: `Introduce a respectful counter-perspective or devil's advocate viewpoint relevant to recent discussion. Phrase it as a question.`,
    engagement: `Notice the discussion energy and invite participation with an encouraging, open question. Do not call out anyone by name.`,
    summary: `Summarise the discussion: list 2-3 main arguments made, 1-2 counter-arguments, and key takeaways. End with a warm, motivating closing message.`,
  };

  const prompt = `You are a professional, encouraging Group Discussion moderator facilitating a live session.

${topicLine}

Recent participant messages:
${recentLines}

Your previous moderator messages (do NOT repeat these ideas):
${historyLines}

Your task: ${instructions[type] || instructions.engagement}

Rules:
- Be warm, positive, and encouraging. Never criticise anyone.
- Keep the response under 50 words (except for summary type — up to 120 words).
- Stay strictly on the current topic.
- Do not repeat ideas from your previous messages listed above.
- Do not prefix with labels like "Moderator:" or emojis.
- Return ONLY the message text. No quotes, no extra text.`;

  const content = await callGroq(prompt);
  return content.trim().replace(/^["']|["']$/g, '');
};

// ─── Daily Challenge Generators ─────────────────────────────────────────────

const generateDailyTopic = async () => {
  const prompt = `Generate one unique Daily Challenge topic suitable for a 2-minute solo speech.
The topic must be:
- Relevant to technology, business, personal growth, or current affairs.
- Thought-provoking and debatable.
- Concise — one sentence, maximum 15 words.

Return a JSON object with EXACTLY this structure:
{
  "topic": "<The generated topic>",
  "category": "<A one-word category like Technology, Business, Education, etc.>",
  "difficulty": "<Easy, Medium, or Hard>"
}

Return ONLY the JSON object. No quotes, no numbering, no markdown fences, no extra text.`;

  try {
    const content = await callGroq(prompt);
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Invalid JSON format from AI');
    }
    return JSON.parse(content.slice(startIndex, endIndex + 1));
  } catch (error) {
    console.error('[groq] generateDailyTopic error:', error.response?.data || error.message);
    throw new Error('Failed to generate daily topic');
  }
};

const evaluateDailyChallenge = async (transcript, duration) => {
  const prompt = `You are an expert communication coach evaluating a user's 2-minute solo speech.

Speech Transcript (spoken in ${duration} seconds):
"${transcript}"

Evaluate this performance.
Return a JSON object with EXACTLY this structure:
{
  "overallScore": <integer 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "betterExpression": {
    "original": "<exact phrase from transcript>",
    "improved": "<professionally rewritten version>"
  },
  "motivation": "<one encouraging, short motivational sentence>"
}

Rules:
- Base ALL feedback on the actual transcript text provided.
- If the transcript is very short, adapt the feedback appropriately, perhaps lowering the score and suggesting to speak more.
- betterExpression MUST use EXACT phrases from the transcript.
- Return ONLY the JSON object. No markdown fences, no extra text.`;

  try {
    const content = await callGroq(prompt);
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Invalid JSON format from AI');
    }
    return JSON.parse(content.slice(startIndex, endIndex + 1));
  } catch (error) {
    console.error('[groq] evaluateDailyChallenge error:', error.response?.data || error.message);
    throw new Error('Failed to evaluate daily challenge');
  }
};

module.exports = { generateTopic, generateFeedback, callGroqModerator, generateDailyTopic, evaluateDailyChallenge };
