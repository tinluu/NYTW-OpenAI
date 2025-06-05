// /app/api/openai/route.ts (Next.js 14, TypeScript)
import { NextRequest } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { query, option, originalResponse } = await request.json();
    
    // Handle initial query (no option) or options with missing originalResponse
    if (!query || (option && !originalResponse)) {
      return new Response(
        JSON.stringify({ error: "Required parameters are missing" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Determine what prompt to use based on the option
    let promptText = query;
    
    if (option) {
      switch (option) {
        case "keywords":
          promptText = `Extract the most important keywords from the following text. Format as a simple bulleted list of keywords or short phrases:\n\n${originalResponse}`;
          break;
        case "talking-points":
          promptText = `Simplify the following text into clear, short, concise talking points that would be easy to remember and discuss with others:\n\n${originalResponse}`;
          break;
        // case "questions":
        //   promptText = `Based on the following text, generate 1 thought-provoking question that would help someone explore the topic further or reflect on the content:\n\n${originalResponse}`;
        //   break;
        default:
          // Just use the original query if option is not recognized
          break;
      }
    }

    // Make a streaming call
    const openaiStream = await client.responses.create({
      model: "gpt-4.1-mini",
      tools: option ? [] : [{ type: "web_search_preview" }], // Only use web search for initial queries
      input: promptText,
      stream: true,
    });

    // Build a ReadableStream that pushes each delta as it arrives
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of openaiStream) {
            // Only enqueue when the event is a partial text delta
            if (event.type === "response.output_text.delta") {
              // event.delta is just the new text to append
              controller.enqueue(encoder.encode(event.delta));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return new Response(
      JSON.stringify({ error: "Error processing your request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
