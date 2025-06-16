// Supabase Edge Function for HVAC Assistant
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    const { question, conversationId, messages } = await req.json();
    // Check if OpenAI API key is available
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    const customPrompt = `You are a helpful HVAC expert assistant. You have extensive knowledge about heating, ventilation, and air conditioning systems. 
    
    Provide detailed, practical advice for HVAC technicians including:
    - Troubleshooting steps for common issues
    - Safety procedures and best practices
    - Equipment specifications and maintenance
    - Energy efficiency recommendations
    - Code compliance and regulations
    
    Keep your responses professional, clear, and actionable. Format your responses with proper paragraphs and bullet points for readability.
    
    IMPORTANT: Keep your responses concise and focused on mobile users. Prioritize the most important information first.`;
    // Prepare conversation history
    const conversationHistory = messages && messages.length > 0 ? messages : [
      {
        role: 'system',
        content: customPrompt
      }
    ];
    // Add the new user question if not already in history
    if (!messages || !messages.some((m)=>m.role === 'user' && m.content === question)) {
      conversationHistory.push({
        role: 'user',
        content: question
      });
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: conversationHistory,
        temperature: 0.5,
        max_tokens: 800
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }
    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
    return new Response(JSON.stringify({
      result,
      message: {
        role: 'assistant',
        content: result
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in ask-hvac function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
