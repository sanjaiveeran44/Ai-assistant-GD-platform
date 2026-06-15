const axios = require('axios');

const generateFeedback = async (transcriptData) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  // transcriptData contains only one user's transcripts.
  // Extract speaker identity from the first record.
  const speakerUserId = transcriptData[0]?.userId || '';
  const speakerUserName = transcriptData[0]?.userName || 'Participant';

  const prompt = `You are an HR interviewer evaluating a single participant in a Group Discussion.
Analyze the following transcript entries spoken by "${speakerUserName}" and return a JSON array with exactly one object:

[
  {
    "userId": "${speakerUserId}",
    "userName": "${speakerUserName}",
    "communicationScore": <number 0-10>,
    "confidenceScore": <number 0-10>,
    "grammarScore": <number 0-10>,
    "participationScore": <number 0-10>,
    "strengths": ["<string>"],
    "improvements": ["<string>"],
    "summary": "<string>"
  }
]

Return ONLY the JSON array. No markdown, no extra text.

Transcript entries:
${JSON.stringify(transcriptData.map(t => ({ text: t.transcript, duration: t.duration })), null, 2)}`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const startIndex = content.indexOf('[');
    const endIndex = content.lastIndexOf(']');
    if (startIndex === -1 || endIndex === -1) {
      console.error('[groq] response did not contain JSON array:', content);
      throw new Error('Invalid JSON format from AI');
    }
    return JSON.parse(content.slice(startIndex, endIndex + 1));
  } catch (error) {
    if (error.message === 'Invalid JSON format from AI') throw error;
    console.error('[groq] API error:', error.response?.data || error.message);
    throw new Error('Failed to generate AI feedback');
  }
};

module.exports = { generateFeedback };
