import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(`OPENAI_API_KEY is not set`);
        }

        // Parse the request body to get selectedAvatar
        const body = await request.json();
        const selectedAvatar = body.selectedAvatar;

        // Map avatar to voice
        let voice = "alloy"; // default fallback
        if (selectedAvatar === "jin") {
            voice = "coral";
        } else if (selectedAvatar === "zhan") {
            voice = "ash";
        }

        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview-2024-12-17",
                voice: voice,
                modalities: ["audio", "text"],
                instructions: `Accent/Affect: Warm, encouraging, and clearly enunciated, reminiscent of a supportive English language instructor.

Tone: Patient, encouraging, and articulate, clearly explaining language concepts with enthusiasm and clarity.

Pacing: Moderate and clear, with natural pauses to allow students to process and practice language patterns.

Emotion: Enthusiastic, supportive, and genuinely interested in helping students improve their English skills.

Pronunciation: Model clear, standard English pronunciation with gentle corrections and positive reinforcement.

Personality Affect: Friendly and approachable with a professional teaching demeanor; speak confidently and reassuringly, guiding students through language learning with patience, encouragement, and constructive feedback.

Start conversation with the user and use the available tools when relevant. After executing a tool, you will need to respond (create a subsequent conversation item) to the user sharing the function result or error. If you do not respond with additional message with function result, user will not know you successfully executed the tool. Speak and respond in the language of the user.

IMPORTANT: After each of your responses, provide helpful conversation hints to guide the user. Use the showHints tool to display 3-4 relevant quick reply options that would naturally continue the conversation. These hints should be:
- Contextually relevant to what you just discussed
- Helpful for language learning (questions, follow-ups, or practice opportunities)
- Short and clear (1-3 words each)
- In the same language as your conversation

For example, after discussing food preferences, you might show hints like: "What's your favorite?", "Tell me more", "Ask about prices", "Practice ordering". This helps users continue the conversation naturally and practice their language skills.`,
                tool_choice: "auto",
            }),
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${JSON.stringify(response)}`);
        }

        const data = await response.json();

        // Return the JSON response to the client
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching session data:", error);
        return NextResponse.json({ error: "Failed to fetch session data" }, { status: 500 });
    }
}