const axios = require('axios');

const generateFeedback = async (transcriptData) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  console.log("Groq Key:", apiKey);
  console.log("Length:", apiKey.length);

  const prompt = `You are an HR interviewer analyzing a Group Discussion transcript.
For every participant return JSON in the following strict format:
[
  {
    "userId": "string",
    "userName": "string",
    "communicationScore": number (0-10),
    "confidenceScore": number (0-10),
    "grammarScore": number (0-10),
    "participationScore": number (0-10),
    "strengths": ["string"],
    "improvements": ["string"],
    "summary": "string"
  }
]

Return ONLY valid JSON array. No markdown blocks, no other text.

Transcript Data:
${JSON.stringify(transcriptData, null, 2)}`;

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
    try {
        // Find the first '[' and last ']' just in case Groq added markdown
        const startIndex = content.indexOf('[');
        const endIndex = content.lastIndexOf(']');
        const jsonStr = content.slice(startIndex, endIndex + 1);
        return JSON.parse(jsonStr);
    } catch (parseError) {
        console.error('Failed to parse Groq response as JSON:', content);
        throw new Error('Invalid JSON format from AI');
    }
  } catch (error) {
    console.error('Groq API error:', error.response?.data || error.message);
    throw new Error('Failed to generate AI feedback');
  }
};

module.exports = {
  generateFeedback
};
