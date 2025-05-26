"use client";

import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";

export default function ChatAssistant({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
    const [input, setInput] = useState("");
    const [width, setWidth] = useState(400); // Initial width in px
    const isResizing = useRef(false);
    const drawerWrapperRef = useRef<HTMLDivElement>(null);
    const drawerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null); // <--- added ref for auto-scroll

    // --- Remember chat history using localStorage ---
    useEffect(() => {
        const stored = localStorage.getItem("chatMessages");
        if (stored) setMessages(JSON.parse(stored));
    }, []);

    useEffect(() => {
        localStorage.setItem("chatMessages", JSON.stringify(messages));
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: "user", text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        try {
            const response = await invoke<string>("ask_ai", { prompt: input });
            const aiMessage = { role: "assistant", text: response as string };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { role: "error", text: "Failed to get response." },
            ]);
            console.error(err);
        }
    };

    // --- Resizing logic ---
    const startResize = () => {
        isResizing.current = true;
        document.body.style.cursor = "ew-resize";
    };

    const stopResize = () => {
        isResizing.current = false;
        document.body.style.cursor = "auto";
    };

    const clearHistory = () => {
        setMessages([]);
        localStorage.removeItem("chatMessages");
    };


    const onResize = (e: MouseEvent) => {
        if (isResizing.current) {
            const newWidth = window.innerWidth - e.clientX;
            setWidth(Math.max(300, Math.min(newWidth, window.innerWidth * 0.7))); // min 300px, max 70% of screen
        }
    };

    useEffect(() => {
        window.addEventListener("mousemove", onResize);
        window.addEventListener("mouseup", stopResize);
        return () => {
            window.removeEventListener("mousemove", onResize);
            window.removeEventListener("mouseup", stopResize);
        };
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                drawerWrapperRef.current &&
                !drawerWrapperRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    // --- Auto-scroll to bottom when messages or input change ---
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, input]);

    return (
        <div
            className={`fixed inset-0 z-60 transition-all duration-300 ${isOpen ? "pointer-events-auto" : "pointer-events-none"
                }`}
        >
            {/* Dimmed click-to-close background */}
            <div
                //className={`absolute inset-0 bg-white bg-opacity-100 transition-opacity duration-300`}
                onClick={onClose}
            />

            {/* Chat drawer */}
            <div ref={drawerWrapperRef}>
                <div
                    ref={drawerRef}
                    className={`absolute right-0 top-16 h-[calc(100%-64px)] text-white shadow-2xl transform transition-transform duration-300 flex flex-col border-l border-white/20`}
                    style={{
                        width: `${width}px`,
                        transform: isOpen ? "translateX(0)" : `translateX(${width}px)`,
                        backgroundImage:
                            "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.5)), url('/chat2.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backdropFilter: "blur(2px)",
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-[#121212]">
                        <h2 className="text-xl font-bold">💬 Security Assistant</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={clearHistory}
                                className="text-xs px-1 py-0.5 bg-red-500 hover:bg-red-700 rounded text-white"
                                title="Clear chat history"
                            >
                                Clear History
                            </button>
                            <button onClick={onClose} className="text-white text-2xl">&times;</button>
                        </div>
                    </div>


                    {/* Chat body */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded max-w-[75%] text-white ${msg.role === "user" ? "ml-auto text-right" : "mr-auto text-left"
                                    }`}
                                style={{
                                    background:
                                        msg.role === "user"
                                            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" // purple-blue gradient for user
                                            : "linear-gradient(135deg, #1f2937 0%, #374151 100%)", // dark gray gradient for assistant/error
                                }}
                            >
                                <p className="text-sm font-semibold">
                                    {msg.role === "user"
                                        ? "🧑 You"
                                        : msg.role === "assistant"
                                            ? "🤖 Assistant"
                                            : "⚠️ Error"}
                                </p>
                                <div className="prose prose-invert max-w-none break-words">
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                                {msg.role === "assistant" && (
                                    <div className="mt-2 flex space-x-2 text-sm justify-start">
                                        <button className="hover:text-green-400">👍</button>
                                        <button className="hover:text-red-400">👎</button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* Dummy div to scroll into view */}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input box */}
                    <div className="flex p-4 gap-2 border-t border-gray-700 bg-[#1a1a1a]">
                        <input
                            className="flex-1 p-2 rounded bg-white text-black placeholder-gray-500"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask your cybersecurity question..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault(); // prevent newline if using textarea or multi-line input
                                    sendMessage();
                                }
                            }}
                        />

                        <button
                            onClick={sendMessage}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                        >
                            Send
                        </button>
                    </div>

                    {/* Resizer Handle */}
                    <div
                        onMouseDown={startResize}
                        className="absolute left-0 top-0 h-full w-1 cursor-ew-resize bg-transparent hover:bg-white/10 transition"
                    />
                </div>
            </div>
        </div>
    );
}
