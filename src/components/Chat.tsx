'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Send, Bot, Sparkles } from 'lucide-react';
import { ChatMessage, MessageProps, ChatMessageRef } from './ChatMessage';
import { Headphones, HeadphoneOff } from 'lucide-react';
import clsx from 'clsx';

export function Chat() {
    const [messages, setMessages] = useState<MessageProps[]>([
        { id: '1', role: 'tutor', text: 'Hello there! I am your AI English Tutor. How can I help you practice today?' }
    ]);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const [isAutoMode, setIsAutoMode] = useState(false);
    const lastMessageRef = useRef<ChatMessageRef>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null); // For Web Speech API

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setInput((prev) => prev + finalTranscript + ' ');
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed') {
                    setAudioError('Microphone access denied. Please check permissions.');
                } else if (event.error === 'audio-capture') {
                    setAudioError('No microphone found or audio capture failed.');
                } else if (event.error === 'no-speech') {
                    setAudioError('No speech detected. Try again.');
                } else {
                    setAudioError('Speech recognition error. Please try again.');
                }
                setIsRecording(false);
                setTimeout(() => setAudioError(null), 5000); // Clear error after 5s
            };

            recognitionRef.current.onstart = () => {
                setAudioError(null);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }
    }, []);

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            setInput('');
            try {
                recognitionRef.current?.start();
                setIsRecording(true);
            } catch (e) {
                console.error("Failed to start recording.", e);
            }
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        if (isRecording) toggleRecording();

        const userMessage: MessageProps = {
            id: Date.now().toString(),
            role: 'user',
            text: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage.text })
            });

            if (!response.ok) throw new Error('Failed to send message');

            const data = await response.json();

            const tutorReply: MessageProps = {
                id: (Date.now() + 1).toString(),
                role: 'tutor',
                text: data.reply || "Sorry, I didn't quite catch that.",
                feedback: data.feedback
            };

            setMessages(prev => [...prev, tutorReply]);

            // Ciclo de Conversação Automática
            if (isAutoMode) {
                // Pequeno delay para garantir que o componente ChatMessage foi renderizado
                setTimeout(() => {
                    if (lastMessageRef.current) {
                        console.log("Auto-Mode: Disparando voz do tutor");
                        lastMessageRef.current.toggleSpeech();
                        
                        // Reativar microfone após a fala terminar
                        // Melhoria: Esperamos um silêncio sólido de 800ms antes de considerar que terminó
                        let stillSpeakingCount = 0;
                        const checkSpeaking = setInterval(() => {
                            if (!window.speechSynthesis.speaking) {
                                stillSpeakingCount++;
                                // Se o navegador disser que não está falando por 2 ciclos seguidos (1s)
                                if (stillSpeakingCount >= 2) {
                                    clearInterval(checkSpeaking);
                                    console.log("Auto-Mode: Confirmado fim da fala, reativando microfone");
                                    // Verificação final antes de abrir o mic
                                    if (isAutoMode) toggleRecording();
                                }
                            } else {
                                stillSpeakingCount = 0; // Se voltou a falar, reseta o contador
                            }
                        }, 500);
                    }
                }, 100);
            }


        } catch (error) {
            console.error("Failed to get response", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto w-full relative">

            {/* Header - Glassmorphism */}
            <div className="absolute top-4 left-4 right-4 z-20 bg-white/70 backdrop-blur-xl border border-white/50 p-4 rounded-3xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md flex items-center justify-center relative">
                        <Bot className="w-6 h-6 text-white" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-sm"></div>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-gray-900 text-lg flex items-center gap-1.5">
                            Praktika Clone
                            <Sparkles className="w-4 h-4 text-purple-500" />
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">Your personal AI English Coach</p>
                    </div>
                </div>

                {/* Auto-Mode Toggle */}
                <button
                    onClick={() => setIsAutoMode(!isAutoMode)}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 font-medium text-sm",
                        isAutoMode 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    )}
                >
                    {isAutoMode ? (
                        <>
                            <Headphones className="w-4 h-4" />
                            <span>Hands-free ON</span>
                        </>
                    ) : (
                        <>
                            <HeadphoneOff className="w-4 h-4" />
                            <span>Hands-free OFF</span>
                        </>
                    )}
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-6 pt-32 pb-40 flex flex-col gap-2 scroll-smooth">
                {messages.map((msg, index) => (
                    <ChatMessage 
                        key={msg.id} 
                        message={msg} 
                        hideFeedback={isAutoMode}
                        ref={index === messages.length - 1 ? lastMessageRef : null} 
                    />
                ))}
                {isLoading && (
                    <div className="mr-auto flex justify-start w-full mt-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <div className="bg-white border text-gray-600 border-gray-100/50 rounded-2xl rounded-tl-sm px-5 py-4 shadow-lg shadow-indigo-100/10 flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                            <span className="text-[15px] font-medium animate-pulse">Tutor is typing...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Controls Area (Floating bottom dock) */}
            <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-center">
                <div className="max-w-xl w-full flex items-end gap-3 transition-all duration-300">

                    {/* Input Bar */}
                    <div className="flex-1 bg-white/90 backdrop-blur-xl border border-gray-200/60 shadow-2xl shadow-indigo-900/10 rounded-[2rem] p-2 flex items-center focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all">
                        <input
                            type="text"
                            className="flex-1 bg-transparent border-none outline-none text-gray-800 text-[15px] px-4 py-3 placeholder:text-gray-400 placeholder:font-light"
                            placeholder="Type a message or use the mic..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:bg-transparent disabled:text-gray-300 transition-colors ml-1"
                        >
                            <Send className="w-5 h-5 ml-1" />
                        </button>
                    </div>

                    {/* Floating Mic Button with Error Tooltip */}
                    <div className="relative group">
                        {audioError && (
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-bottom-1">
                                {audioError}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-red-500"></div>
                            </div>
                        )}
                        <button
                            onClick={toggleRecording}
                            className={clsx(
                                "w-16 h-16 shrink-0 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform",
                                isRecording
                                    ? "bg-red-500 text-white scale-110 animate-pulse shadow-red-500/40"
                                    : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 hover:scale-105"
                            )}
                        >
                            {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-7 h-7" />}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
