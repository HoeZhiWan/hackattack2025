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
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [width, setWidth] = useState(400); // Initial width in px
    const isResizing = useRef(false);
    const drawerWrapperRef = useRef<HTMLDivElement>(null);
    const drawerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showMenu, setShowMenu] = useState(false);
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Voice recording related states and refs:
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [audioChunks, setAudioChunks] = useState<BlobPart[]>([]);

    type Message = {
        role: string;
        text: string;
        audioUrl?: string | null;
        photoUrl?: string;
        fileUrl?: string;
        fileName?: string;
    };
      

    // --- Remember chat history using localStorage ---
    useEffect(() => {
        const stored = localStorage.getItem("chatMessages");
        if (stored) setMessages(JSON.parse(stored));
    }, []);

    useEffect(() => {
        localStorage.setItem("chatMessages", JSON.stringify(messages));
    }, [messages]);

    // --- Voice recording logic ---
    async function enableVoiceMode() {
        try {
            if (!streamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
            }

            setIsVoiceMode(true);
            setIsRecording(true);
            setRecordedAudioUrl(null);
            setInput("");
            setAudioChunks([]);

            const mediaRecorder = new MediaRecorder(streamRef.current!);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                setAudioChunks((prev) => [...prev, event.data]);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                const url = URL.createObjectURL(audioBlob);
                setRecordedAudioUrl(url);
                setIsRecording(false);
                setAudioChunks([]);
            };

            mediaRecorder.start();
        } catch (err) {
            alert("Microphone access denied or not available.");
            console.error(err);
            setIsVoiceMode(false);
            setIsRecording(false);
        }
    }

    const sendMessage = async () => {
        if (isVoiceMode) {
            if (isRecording && mediaRecorderRef.current) {
                const audioUrl = await new Promise<string>((resolve) => {
                    mediaRecorderRef.current!.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                        const url = URL.createObjectURL(audioBlob);
                        setRecordedAudioUrl(url);
                        setIsRecording(false);
                        setAudioChunks([]);
                        resolve(url); // Resolve with the audio URL immediately
                    };
                    mediaRecorderRef.current!.stop();
                });

                if (!audioUrl) {
                    alert("Please record your voice message first.");
                    return; // Prevent sending empty message
                }

                const userVoiceMessage = {
                    role: "user",
                    text: "[Voice message]",
                    audioUrl,
                };

                setMessages((prev) => [...prev, userVoiceMessage]);
                setRecordedAudioUrl(null);
                setInput("");
                setIsVoiceMode(false);
                setIsRecording(false);

                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop());
                    streamRef.current = null;
                }

                return;
            }

            // If not recording but have recorded audio
            if (!recordedAudioUrl) {
                alert("Please record your voice message first.");
                return;
            }

            // Send recorded voice message directly
            const userVoiceMessage = {
                role: "user",
                text: "[Voice message]",
                audioUrl: recordedAudioUrl,
            };

            setMessages((prev) => [...prev, userVoiceMessage]);
            setRecordedAudioUrl(null);
            setInput("");
            setIsVoiceMode(false);
            setIsRecording(false);

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }

            return;
        }

        // Text message logic...
        if (!input.trim()) return;

        const userMessage = { role: "user", text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");        try {
            const response = await invoke<string>("ask_ai", { prompt: input });
            const aiMessage = { role: "assistant", text: response as string };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (err) {
            console.error("AI Error:", err);
            setMessages((prev) => [
                ...prev,
                { role: "error", text: `Failed to get response: ${err}` },
            ]);
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

    const handleAddPhotoClick = () => {
        photoInputRef.current?.click();
    };

    const handleAddFileClick = () => {
        fileInputRef.current?.click();
    };
      
    const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);

        setMessages((prev) => [
            ...prev,
            { role: "user", text: "[Photo]", photoUrl: url },
        ]);
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);

        setMessages((prev) => [
            ...prev,
            { role: "user", text: "[File]", fileUrl: url, fileName: file.name },
        ]);
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
            <div onClick={onClose} className="absolute inset-0" />

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
                            <button onClick={onClose} className="text-white text-2xl">
                                &times;
                            </button>
                        </div>
                    </div>

                    {/* Chat body */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded max-w-[75%] text-white ${msg.role === "user" ? "ml-auto text-left" : "mr-auto text-left"
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
                                    {msg.photoUrl ? (
                                        <img
                                            src={msg.photoUrl}
                                            alt="User upload"
                                            className="max-w-full rounded"
                                            style={{ maxHeight: 200 }}
                                        />
                                    ) : msg.fileUrl ? (
                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-400">
                                            {msg.fileName || "Download file"}
                                        </a>
                                    ) : msg.audioUrl ? (
                                        <audio controls src={msg.audioUrl} className="w-full rounded" />
                                    ) : (
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    )}

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

                    {/* Input box with voice mode and 3-dot menu */}
                    <div className="flex p-4 gap-2 items-center border-t border-gray-700 bg-[#1a1a1a] relative">
                        {/* Microphone button - press once to start recording */}
                        <button
                            className={`px-3 py-2 rounded transition-colors ${isVoiceMode
                                    ? isRecording
                                        ? "bg-red-600 animate-pulse text-white"
                                        : "bg-green-600 text-white"
                                    : "bg-gray-700 hover:bg-gray-600 text-white"
                                }`}
                            onClick={() => {
                                if (!isVoiceMode) {
                                    enableVoiceMode(); // Starts recording immediately
                                }
                                // If already in voice mode, do nothing on mic click
                            }}
                            title={
                                !isVoiceMode
                                    ? "Start Recording"
                                    : isRecording
                                        ? "Recording..."
                                        : "Ready to send"
                            }
                        >
                            🎙️
                        </button>

                        {/* Input field */}
                        <input
                            className={`flex-1 p-2 rounded placeholder-gray-500 transition ${isVoiceMode
                                    ? "bg-gray-400 text-white italic cursor-not-allowed"
                                    : "bg-white text-black"
                                }`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={
                                isVoiceMode
                                    ? isRecording
                                        ? "Recording... Press Send to stop and send"
                                        : recordedAudioUrl
                                            ? "Voice recorded! Press Send"
                                            : "Press 🎙️ to start recording"
                                    : "Ask your cybersecurity question..."
                            }
                            disabled={isVoiceMode}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                        />

                        {/* Send button */}
                        <button
                            onClick={sendMessage}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                            disabled={
                                (isVoiceMode && !recordedAudioUrl && !isRecording) ||
                                (!isVoiceMode && !input.trim())
                            }
                            title="Send message"
                        >
                            Send
                        </button>

                        {/* 3-dot menu toggle */}
                        <button
                            onClick={() => setShowMenu((v) => !v)}
                            className="ml-1 text-xl px-2 py-1 hover:bg-gray-700 rounded"
                            title="More options"
                        >
                            &#x22EE;
                        </button>

                        {/* Dropdown menu */}
                        {showMenu && (
                            <div
                                className="absolute bottom-full right-0 mb-10 bg-[#222] border border-gray-600 rounded shadow-lg p-2 w-40 z-50"
                                onClick={() => setShowMenu(false)}
                            >
                                <button
                                    onClick={() => photoInputRef.current?.click()}
                                    className="block w-full text-left px-2 py-1 hover:bg-gray-700 rounded"
                                >
                                    Add Photo
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="block w-full text-left px-2 py-1 hover:bg-gray-700 rounded"
                                >
                                    Add File
                                </button>

                            </div>
                        )}

                        {/* Hidden file inputs should be here */}
                        <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            ref={photoInputRef}
                            onChange={handlePhotoSelected}
                        />

                        <input
                            type="file"
                            style={{ display: "none" }}
                            ref={fileInputRef}
                            onChange={handleFileSelected}
                        />

                        {/* Resize handle */}
                        <div
                            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-gray-600"
                            onMouseDown={startResize}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
