import React from 'react';
import clsx from 'clsx';
import { Bot, User, BookOpenCheck } from 'lucide-react';

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

export function ChatMessage({ message }: { message: MessageProps }) {
    const isUser = message.role === 'user';

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
                </div>

                {/* Premium Grammar Tip UI */}
                {message.feedback && message.feedback.explanation && (
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
}
