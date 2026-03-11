import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const tutorSystemInstruction = `You are a helpful and positive English Tutor. 
Analyze the user's message and provide a response in English.
If the message is not in English (e.g., Portuguese), respond in English but acknowledge it kindly.

ALWAYS return a JSON object with this EXACT structure:
{
  "reply": "Your conversational response in English...",
  "feedback": {
    "original": "the original user text",
    "corrected": "the corrected English version (or same if correct)",
    "explanation": "Brief explanation of the mistake in English, or null if correct. If the message was in another language, use this field to gently encourage practicing English."
  }
}`;

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'SUA_CHAVE_AQUI') {
            return NextResponse.json({ error: 'Configuração pendente: Insira sua GEMINI_API_KEY no arquivo .env.local' }, { status: 500 });
        }

        const { message } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: message }] }],
            config: {
                systemInstruction: tutorSystemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.7
            }
        });

        const rawText = response.text || '';
        console.log('Raw AI Response:', rawText);

        let result;
        try {
            if (!rawText) throw new Error('Empty response from AI');
            
            // Remove markdown format if present
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            result = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', rawText);
            // Fallback result if JSON fails
            result = {
                reply: rawText || "I'm sorry, I had trouble processing that. Could you try again?",
                feedback: null
            };
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Chat API Error:', error);
        
        // Handle Quota Exceeded politely
        if (error.message?.includes('429')) {
            return NextResponse.json({ 
                reply: "I'm a bit overwhelmed with students right now! Could you wait a few seconds and try again? 😊",
                feedback: null
            });
        }

        return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
    }
}
