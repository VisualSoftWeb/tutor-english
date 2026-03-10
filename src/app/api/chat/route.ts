import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const tutorInstruction = `Você é um tutor de inglês avançado, positivo e prestativo. Mantenha conversas naturais e fluidas. Sempre que o usuário cometer um erro, responda em inglês, mas no final da mensagem, adicione uma seção especial e estruturada chamada 'Grammar Tip' explicando a correção de forma breve e gentil.`;

export async function POST(req: Request) {
    try {
        const { message, history } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // 1. Instância 1 (Feedback Analisador)
        const feedbackResponsePromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following English sentence. If there are any grammatical errors, return a strict JSON object with this exact structure: { "original": "...", "corrected": "...", "explanation": "..." }. If it's perfectly correct, return { "original": "${message}", "corrected": "${message}", "explanation": null }.\nSentence: "${message}"`,
            config: {
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        });

        // 2. Instância 2 (Agente Conversacional)
        const chatResponsePromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message, // Simplificado, idealmente passar o history
            config: {
                systemInstruction: tutorInstruction,
                temperature: 0.7
            }
        });

        // Esperar ambas
        const [feedbackResult, chatResult] = await Promise.all([feedbackResponsePromise, chatResponsePromise]);

        let feedbackData = null;
        try {
            if (feedbackResult.text) {
                feedbackData = JSON.parse(feedbackResult.text);
            }
        } catch (e) {
            console.error("Failed to parse feedback JSON", e);
        }

        return NextResponse.json({
            reply: chatResult.text,
            feedback: feedbackData
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
    }
}
