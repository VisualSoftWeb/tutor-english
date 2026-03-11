import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Bot, User, BookOpenCheck, Volume2, Pause, Play } from 'lucide-react';

interface Feedback {
    original: string;
    corrected: string;
    explanation: string | null;
}

export interface MessageProps {
    id: string;
    role: 'user' | 'tutor';
    text: string;
    feedback?: Feedback | null;
}

export interface ChatMessageRef {
    toggleSpeech: () => void;
}

export const ChatMessage = React.forwardRef<ChatMessageRef, { message: MessageProps; hideFeedback?: boolean }>(
    ({ message, hideFeedback }, ref) => {
    const isUser = message.role === 'user';
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        // Cleanup function for the component
        return () => {
            if (isSpeaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, [isSpeaking]);

    React.useImperativeHandle(ref, () => ({
        toggleSpeech: () => {
            if (!isSpeaking) toggleSpeech();
        }
    }));

    const toggleSpeech = () => {
        if (typeof window === 'undefined') return;

        // Se estiver tocando, pausar
        if (window.speechSynthesis.speaking && !isPaused) {
            window.speechSynthesis.pause();
            setIsPaused(true);
            return;
        }

        // Se estiver pausado, retomar
        if (isPaused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
            return;
        }

        // Cancelar qualquer processo pendente
        window.speechSynthesis.cancel();
        
        // Pequeno atraso para o navegador processar o cancelamento antes de falar denovo
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(message.text);
            utterance.lang = 'en-US';
            utterance.volume = 1;
            utterance.rate = 1;

            // PROTEÇÃO CONTRA GARBAGE COLLECTION:
            // Guardar referência no window para o Chrome não matar o áudio no meio
            if (!(window as any)._ttsRefs) (window as any)._ttsRefs = new Set();
            (window as any)._ttsRefs.add(utterance);
            
            utterance.onstart = () => {
                console.log("TTS: Iniciou a fala");
                setIsSpeaking(true);
                setIsPaused(false);
            };
            
            utterance.onend = () => {
                console.log("TTS: Terminou a fala");
                setIsSpeaking(false);
                setIsPaused(false);
                (window as any)._ttsRefs.delete(utterance); // Limpar referência
            };

            utterance.onerror = (e) => {
                console.error("TTS: Erro", e.error);
                setIsSpeaking(false);
                setIsPaused(false);
                (window as any)._ttsRefs.delete(utterance);
            };

            // Seleção de vozes
            const voices = window.speechSynthesis.getVoices();
            const englishVoice = voices.find(v => v.lang.includes('en-') && (v.name.includes('Google') || v.name.includes('Premium'))) || 
                               voices.find(v => v.lang.includes('en-'));
            
            if (englishVoice) {
                utterance.voice = englishVoice;
            }

            window.speechSynthesis.speak(utterance);

            // WATCHDOG: Se o navegador esquecer de avisar que terminou (bug comum do Chrome)
            // Estimamos o tempo: ~50ms por caractere + 5 segundos de folga
            const estimatedDuration = (message.text.length * 80) + 5000;
            const watchdog = setTimeout(() => {
                if (window.speechSynthesis.speaking) {
                    console.warn("TTS: Watchdog disparado! Forçando encerramento do estado.");
                    // Não chamamos cancel() aqui para não cortar o áudio se ele ainda estiver tocando fisicamente,
                    // mas liberamos o estado da UI para continuar o fluxo.
                    setIsSpeaking(false);
                    setIsPaused(false);
                }
            }, estimatedDuration);

            // Bug fix crítico do Chrome: manter o áudio "vivo"
            const heartbeat = setInterval(() => {
                if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                } else {
                    clearInterval(heartbeat);
                    clearTimeout(watchdog);
                }
            }, 1000);
        }, 150);
    };

    return (
        <div className={clsx(
            "flex w-full mt-6 space-x-4 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300",
            isUser ? "ml-auto justify-end" : "mr-auto justify-start"
        )}>
            {!isUser && (
                <div className="flex-shrink-0 w-10 h-10 mt-1 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md flex items-center justify-center transform hover:scale-105 transition-transform">
                    <Bot className="w-5 h-5 text-white" />
                </div>
            )}

            <div className="flex flex-col gap-2 max-w-[85%]">
                <div className={clsx(
                    "p-4 text-[15px] leading-relaxed relative group",
                    isUser
                        ? "bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-2xl rounded-tr-sm shadow-md"
                        : "bg-white border border-gray-100/50 text-gray-800 shadow-lg shadow-indigo-100/20 rounded-2xl rounded-tl-sm"
                )}>
                    {message.text}
                    
                    {/* TTS Control Button */}
                    <button 
                        onClick={toggleSpeech}
                        className={clsx(
                            "absolute bottom-2 right-2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                            isUser ? "text-indigo-100 hover:bg-white/10" : "text-gray-400 hover:bg-gray-100",
                            isSpeaking && "opacity-100"
                        )}
                        title={isSpeaking ? (isPaused ? "Resume" : "Pause") : "Listen"}
                    >
                        {isSpeaking ? (
                            isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />
                        ) : (
                            <Volume2 className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Premium Grammar Tip UI */}
                {message.feedback && message.feedback.explanation && !hideFeedback && (
                    <div className="mt-2 p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200/50 shadow-sm flex gap-3 items-start animate-in zoom-in-95 duration-500 delay-150">
                        <div className="bg-amber-100/80 p-1.5 rounded-lg shrink-0 mt-0.5">
                            <BookOpenCheck className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex flex-col gap-1.5 w-full">
                            <span className="font-bold text-amber-900 text-sm tracking-wide uppercase opacity-80">Grammar Tip</span>

                            <div className="flex flex-col gap-1 text-[14px]">
                                <div className="flex items-start gap-2 line-through text-gray-400 decoration-red-400/50">
                                    <span className="text-red-400 select-none">✕</span>
                                    {message.feedback.original}
                                </div>
                                <div className="flex items-start gap-2 text-emerald-700 font-medium">
                                    <span className="text-emerald-500 select-none">✓</span>
                                    {message.feedback.corrected}
                                </div>
                            </div>

                            <div className="text-gray-600 text-[14px] mt-1.5 bg-white/50 p-2.5 rounded-xl border border-white/60">
                                {message.feedback.explanation}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isUser && (
                <div className="flex-shrink-0 w-10 h-10 mt-1 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner flex items-center justify-center border border-slate-200/50">
                    <User className="w-5 h-5 text-slate-600" />
                </div>
            )}
        </div>
    );
});

ChatMessage.displayName = 'ChatMessage';
