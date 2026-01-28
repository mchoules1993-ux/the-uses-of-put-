// 1. IMPORT YOUR HTML FILE
import gameHtml from './index.html';

// 2. STATIC DATA FALLBACK
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
  { id: 11, term: "put down (person)", type: "verb", definition: "To criticize someone to make them feel silly or unimportant.", examples: ["Why did you put me down in front of the class.", "The teacher put me down for not knowing the alphabet."] },
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- THE FIX: SERVE HTML ON HOME PAGE ---
    if (url.pathname === "/") {
      return new Response(gameHtml, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // --- API LOGIC (For your app to fetch data if needed) ---
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    let responseData = STATIC_DATA;
    try {
        const dailyData = await env.GAME_DATA.get('daily_questions');
        if (dailyData) {
            responseData = JSON.parse(dailyData);
        }
    } catch (e) { 
        console.error("KV Error:", e); 
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  },

  async scheduled(event, env, ctx) {
    // Keep your existing cron logic here if you want it
    console.log('Cron triggered');
  }
};
