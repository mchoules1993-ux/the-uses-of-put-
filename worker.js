const STATIC_DATA = [
  { id: 1, term: "put off", type: "verb", definition: "To delay an event or activity until a later time." },
  { id: 2, term: "put off by", type: "verb", definition: "To make someone dislike something or to discourage them." },
  { id: 3, term: "put someone off", type: "verb", definition: "To delay seeing someone or stop them until later." },
  { id: 4, term: "put up with", type: "verb", definition: "To tolerate someone or something unpleasant." },
  { id: 5, term: "put an end to", type: "phrase", definition: "To make something stop happening or existing." },
  { id: 6, term: "put your feet up", type: "idiom", definition: "To relax, chill, literally resting feet on something." },
  { id: 7, term: "put in a good word", type: "phrase", definition: "To say positive things about someone (often for a job)." },
  { id: 8, term: "put heads together", type: "idiom", definition: "When two or more people plan or solve something together." },
  { id: 9, term: "put two and two together", type: "idiom", definition: "To guess the truth from what you see or hear." },
  { id: 10, term: "put down (object)", type: "verb", definition: "To place something on a surface or stop carrying someone." },
  { id: 11, term: "put down (person)", type: "verb", definition: "To criticize someone to make them feel silly or unimportant." },
];

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS (Allow your frontend to call this)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured: No API Key" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 2. Prompt Engineering
    const prompt = `
      You are an English test generator. 
      I will provide a list of phrasal verbs with definitions.
      
      Task:
      For EACH item in the list, generate 2 BRAND NEW, modern, B2-level English example sentences. 
      These examples must be different from standard textbook examples. 
      One example should be a question, one a statement.
      
      Input Data: ${JSON.stringify(STATIC_DATA)}
      
      Output Format:
      Return ONLY a valid JSON array matching the input structure, but with the new "examples": ["...", "..."] array filled in.
      Do not wrap in markdown. Just raw JSON.
    `;

    try {
      // 3. Call Google Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const result = await response.json();
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      // Clean up potential Markdown formatting from AI
      if (text) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }

      // Validate JSON before sending back
      JSON.parse(text); 

      return new Response(text, { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Failed to generate: " + err.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  }
};
