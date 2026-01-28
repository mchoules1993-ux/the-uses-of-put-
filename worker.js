// Static fallback data (The original PDF content)
const STATIC_DATA = [
  { id: 1, term: "put off", type: "verb", definition: "To delay an event or activity until a later time.", examples: ["She shouldn't put off going to the dentist.", "We put off the meeting because everyone is on leave."] },
  { id: 2, term: "put off by", type: "verb", definition: "To make someone dislike something or to discourage them.", examples: ["The sight of blood puts me off donating.", "I was put off by his messy appearance."] },
  { id: 3, term: "put someone off", type: "verb", definition: "To delay seeing someone or stop them until later.", examples: ["I'd rather put them off than meet today.", "I had to put Trang off due to a meeting."] },
  { id: 4, term: "put up with", type: "verb", definition: "To tolerate someone or something unpleasant.", examples: ["I can't put up with the karaoke noise.", "It's cold, but I'll put up with it."] },
  { id: 5, term: "put an end to", type: "phrase", definition: "To make something stop happening or existing.", examples: ["How can we put an end to the conflict?", "The team put an end to their losing streak."] },
  { id: 6, term: "put your feet up", type: "idiom", definition: "To relax, chill, literally resting feet on something.", examples: ["I'm putting my feet up this weekend.", "Everyone is away, so I'll put my feet up."] },
  { id: 7, term: "put in a good word", type: "phrase", definition: "To say positive things about someone (often for a job).", examples: ["I can put in a good word for you with HR.", "She put in a good word for me with the boss."] },
  { id: 8, term: "put heads together", type: "idiom", definition: "When two or more people plan or solve something together.", examples: ["We'll figure it out if we put our heads together.", "They solved it after putting their heads together."] },
  { id: 9, term: "put two and two together", type: "idiom", definition: "To guess the truth from what you see or hear.", examples: ["I saw them holding hands and put two and two together."] },
  { id: 10, term: "put down (object)", type: "verb", definition: "To place something on a surface or stop carrying someone.", examples: ["I put my bags down.", "Put me down, Daddy!"] },
  { id: 11, term: "put down (person)", type: "verb", definition: "To criticize someone to make them feel silly or unimportant.", examples: ["Why did you put me down in front of the class?", "The teacher put me down for not knowing the alphabet."] },
];

// Validate data structure
function isValidDataStructure(data) {
  if (!Array.isArray(data)) return false;
  
  return data.every(item => 
    item.id && 
    typeof item.id === 'number' &&
    item.term && 
    typeof item.term === 'string' &&
    item.type && 
    typeof item.type === 'string' &&
    item.definition && 
    typeof item.definition === 'string' &&
    Array.isArray(item.examples) &&
    item.examples.length > 0 &&
    item.examples.every(ex => typeof ex === 'string')
  );
}

// Simple rate limiting using KV
async function checkRateLimit(env, identifier) {
  const key = `ratelimit:${identifier}`;
  const limit = 60; // requests per minute
  const window = 60; // seconds
  
  try {
    const current = await env.GAME_DATA.get(key);
    const now = Date.now();
    
    if (current) {
      const data = JSON.parse(current);
      if (now - data.timestamp < window * 1000) {
        if (data.count >= limit) {
          return false; // Rate limit exceeded
        }
        data.count++;
        await env.GAME_DATA.put(key, JSON.stringify(data), { expirationTtl: window });
        return true;
      }
    }
    
    // New window
    await env.GAME_DATA.put(key, JSON.stringify({ count: 1, timestamp: now }), { expirationTtl: window });
    return true;
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return true; // Allow on error to avoid blocking legitimate users
  }
}

// Get client identifier for rate limiting
function getClientIdentifier(request) {
  // Use CF-Connecting-IP header (Cloudflare provides real IP)
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For') || 
         'unknown';
}

export default {
  // 1. SERVE DATA (Frontend calls this)
  async fetch(request, env, ctx) {
    // IMPORTANT: Replace with your actual frontend domain(s)
    const ALLOWED_ORIGINS = [
      'https://yourdomain.com',
      'https://www.yourdomain.com',
      // Add your Cloudflare Pages domain here, e.g.:
      // 'https://your-project.pages.dev'
    ];
    
    // For development/testing only - REMOVE IN PRODUCTION
    if (env.ENVIRONMENT === 'development') {
      ALLOWED_ORIGINS.push('http://localhost:3000', 'http://127.0.0.1:3000');
    }
    
    const origin = request.headers.get('Origin');
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    // Rate limiting
    const clientId = getClientIdentifier(request);
    const withinLimit = await checkRateLimit(env, clientId);
    
    if (!withinLimit) {
      return new Response(JSON.stringify({ 
        error: 'Too many requests. Please try again later.' 
      }), { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        } 
      });
    }

    try {
      // Try to get fresh data from KV Storage
      const dailyData = await env.GAME_DATA.get('daily_questions');
      
      let responseData;
      
      if (dailyData) {
        // Validate stored data before serving
        const parsedData = JSON.parse(dailyData);
        if (isValidDataStructure(parsedData)) {
          responseData = parsedData;
        } else {
          console.error('Stored data failed validation, using static fallback');
          responseData = STATIC_DATA;
        }
      } else {
        // If KV is empty (first run), return static data
        responseData = STATIC_DATA;
      }

      return new Response(JSON.stringify(responseData), { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        } 
      });
      
    } catch (err) {
      // Log detailed error server-side
      console.error('Fetch error:', err);
      
      // Return generic error to client
      return new Response(JSON.stringify({ 
        error: 'Unable to retrieve data. Please try again later.' 
      }), { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      });
    }
  },

  // 2. GENERATE DATA (Cron Job runs this)
  async scheduled(event, env, ctx) {
    console.log('Cron trigger fired: Generating new context...');
    
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: No API Key configured in worker environment.');
      return;
    }

    // We ask AI to regenerate examples for the static structure
    const prompt = `
      You are an English teacher. I have a JSON list of phrasal verbs. 
      For each item, keep the id, term, type, and definition exactly as they are.
      HOWEVER, generate 2 NEW, unique, modern example sentences for the "examples" array.
      The sentences should be clear and show the meaning in context.
      
      Input JSON: ${JSON.stringify(STATIC_DATA)}
      
      IMPORTANT: Return ONLY valid JSON. No markdown formatting, no code blocks, no explanations.
      The output must be a valid JSON array that can be parsed directly.
    `;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, 
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No content received from API');
      }
      
      // Cleanup markdown if AI adds it
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse and validate
      const newData = JSON.parse(text);
      
      if (!isValidDataStructure(newData)) {
        throw new Error('Generated data failed validation');
      }
      
      // Ensure we have the same number of items
      if (newData.length !== STATIC_DATA.length) {
        throw new Error(`Item count mismatch: expected ${STATIC_DATA.length}, got ${newData.length}`);
      }

      // Save to Cloudflare KV
      await env.GAME_DATA.put('daily_questions', JSON.stringify(newData));
      console.log('Successfully updated daily questions with new examples.');

    } catch (e) {
      console.error('FAILED to generate content:', e.message);
      console.error('Stack trace:', e.stack);
      
      // On failure, ensure we have valid fallback data in KV
      try {
        const existing = await env.GAME_DATA.get('daily_questions');
        if (!existing) {
          await env.GAME_DATA.put('daily_questions', JSON.stringify(STATIC_DATA));
          console.log('Stored static fallback data in KV');
        }
      } catch (fallbackError) {
        console.error('Failed to store fallback data:', fallbackError);
      }
    }
  }
};
