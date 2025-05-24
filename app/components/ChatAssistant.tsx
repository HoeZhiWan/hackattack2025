"use client";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";


export default function ChatAssistant() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: "user", text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        try {
            const aiResponse = await invoke<string>("ask_ai", { prompt: input });
            const assistantMessage = { role: "assistant", text: aiResponse };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            setMessages((prev) => [...prev, { role: "error", text: "Failed to get response." }]);
            console.error(err);
        }
    };

    return (
        <div className="p-4 bg-white border rounded shadow-md max-w-xl mx-auto">
            <h2 className="text-xl font-bold mb-4">🛡️ Security Assistant</h2>
            <div className="space-y-2 h-64 overflow-y-auto border p-2 mb-4 bg-gray-50 rounded">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`text-${msg.role === "user" ? "blue" : "gray"}-700`}>
                        <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong> {msg.text}
                    </div>
                ))}
            </div>
            <div className="flex">
                <input
                    className="flex-1 border px-3 py-2 rounded-l"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about a security alert..."
                />
                <button
                    onClick={sendMessage}
                    className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700"
                >
                    Send
                </button>
            </div>
        </div>
    );
}


