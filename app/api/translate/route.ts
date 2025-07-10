import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(`OPENAI_API_KEY is not set`);
        }

        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional translator. Translate the given text to Traditional Chinese (繁體中文). Provide only the translation without any additional explanations or formatting."
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                max_tokens: 1000,
                temperature: 0.3
            }),
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const translation = data.choices[0]?.message?.content?.trim();

        if (!translation) {
            throw new Error("No translation received from API");
        }

        return NextResponse.json({ translation });
    } catch (error) {
        console.error("Error translating text:", error);
        return NextResponse.json({ error: "Failed to translate text" }, { status: 500 });
    }
} 