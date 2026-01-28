// 1. IMPORT YOUR HTML FILE
import gameHtml from './index.html'; 
// (The rule we added in Step 1 makes this import work!)

// ... keep your existing helper functions like isValidDataStructure ...
// ... keep STATIC_DATA ...
const STATIC_DATA = [ /* ... keep your existing data ... */ ];

// ... keep helper functions like checkRateLimit ...

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- FIX: SERVE HTML ON HOME PAGE ---
    // If the user visits the root url (e.g. your-app.workers.dev/), serve the Game
    if (url.pathname === "/") {
      return new Response(gameHtml, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // --- EXISTING API LOGIC ---
    // If they visit anything else (or you can create a specific path like /api/data)
    // We run your existing logic to return JSON
    
    // ... (Paste your existing CORS and Logic here) ...
    // Below is a simplified version of your existing logic to keep it clean:

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    // Your existing data fetching logic
    let responseData = STATIC_DATA;
    try {
        const dailyData = await env.GAME_DATA.get('daily_questions');
        if (dailyData) responseData = JSON.parse(dailyData);
    } catch (e) { console.error(e); }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  },

  // ... keep your existing scheduled function ...
  async scheduled(event, env, ctx) {
      // ... your existing cron code ...
  }
};
