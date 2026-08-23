import { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(apiKey);

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import {
    MessageSquare,
    Database,
    FileText,
    Settings,
    Send,
    Plus,
    Sparkles,
    PanelLeft,
    Upload,
    File,
    CheckCircle2,
    Trash2,
    Loader2,
} from "lucide-react";

type Message = {
    id: number;
    role: "user" | "assistant";
    content: string;
    sources?: string[];
};
interface Chat {
    id: number;
    title: string;
    messages: Message[];
}

type KnowledgeDocument = {
    id: number;
    name: string;
    size: number;
    text: string;
    status: "processing" | "ready" | "error";
};

interface KnowledgeAssistantProps {
    onLogout: () => void;
}

export default function KnowledgeAssistant({
    onLogout,
}: KnowledgeAssistantProps) {

    const [messages, setMessages] = useState<Message[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);

    const [activeChatId, setActiveChatId] = useState<number | null>(null);

    const [question, setQuestion] = useState("");
    const [confirmAction, setConfirmAction] = useState<
        "clearChat" | "clearDocuments" | "logout" | null
    >(null);



    const [activePage, setActivePage] = useState<
        "assistant" | "knowledge" | "documents" | "settings"
    >("assistant");

    const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages, isLoading]);

    const suggestedQuestions = [
        "What information is available in the knowledge base?",
        "Summarize the uploaded documents",
        "What are the important points?",
        "Tell me about the available documents",
    ];

    const sendMessage = async (suggestedQuestion?: string) => {
        const userQuestion = suggestedQuestion || question;

        if (!userQuestion.trim()) return;
        const newMessage: Message = {
            id: Date.now(),
            role: "user",
            content: userQuestion,
        };
        let currentChatId = activeChatId;

        if (currentChatId === null) {
            currentChatId = Date.now();

            const newChat: Chat = {
                id: currentChatId,
                title:
                    userQuestion.length > 35
                        ? `${userQuestion.slice(0, 35)}...`
                        : userQuestion,
                messages: [],
            };

            setChats((prev) => [newChat, ...prev]);
            setActiveChatId(currentChatId);
        }

        setMessages((prev) => [...prev, newMessage]);

        setChats((prev) =>
            prev.map((chat) =>
                chat.id === currentChatId
                    ? {
                        ...chat,
                        messages: [...chat.messages, newMessage],
                    }
                    : chat
            )
        );
        setQuestion("");

        if (readyDocuments.length === 0) {
            const noDocumentMessage: Message = {
                id: Date.now() + 1,
                role: "assistant",
                content:
                    "Please upload a PDF document to the Knowledge Base before asking a question.",
            };

            setMessages((prev) => [...prev, noDocumentMessage]);

            setChats((prev) =>
                prev.map((chat) =>
                    chat.id === currentChatId
                        ? {
                            ...chat,
                            messages: [
                                ...chat.messages,
                                noDocumentMessage,
                            ],
                        }
                        : chat
                )
            );

            return;
        }

        try {
            // Convert question into searchable keywords
            const questionWords = userQuestion
                .toLowerCase()
                .replace(/[^\w\s]/g, "")
                .split(/\s+/)
                .filter((word) => word.length > 2);

            // Split every uploaded document into chunks
            const allDocumentChunks = readyDocuments.map((document) => {
                const words = document.text.split(/\s+/);
                const chunkSize = 150;

                const chunks: {
                    text: string;
                    documentName: string;
                    score: number;
                }[] = [];

                for (let i = 0; i < words.length; i += chunkSize) {
                    const text = words.slice(i, i + chunkSize).join(" ");
                    const lowerText = text.toLowerCase();

                    let score = 0;

                    questionWords.forEach((word) => {
                        const matches = lowerText.match(
                            new RegExp(`\\b${word}\\b`, "g")
                        );

                        if (matches) {
                            score += matches.length;
                        }
                    });

                    chunks.push({
                        text,
                        documentName: document.name,
                        score,
                    });
                }

                return {
                    documentName: document.name,
                    chunks,
                };
            });

            // Get the best relevant chunks from EACH document
            const selectedChunks = allDocumentChunks.flatMap((document) => {
                const relevant = document.chunks
                    .filter((chunk) => chunk.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 2);

                return relevant;
            });

            // Build context from all relevant documents
            const context =
                selectedChunks.length > 0
                    ? selectedChunks
                        .map(
                            (chunk, index) =>
                                `[Source ${index + 1}: ${chunk.documentName}]\n${chunk.text}`
                        )
                        .join("\n\n---\n\n")
                    : readyDocuments
                        .map(
                            (document) =>
                                `[Document: ${document.name}]\n${document.text.slice(
                                    0,
                                    5000
                                )}`
                        )
                        .join("\n\n---\n\n");

            setIsLoading(true);

            // Show every document that actually contributed relevant content
            const sources =
                selectedChunks.length > 0
                    ? [
                        ...new Set(
                            selectedChunks.map((chunk) => chunk.documentName)
                        ),
                    ]
                    : readyDocuments.map((document) => document.name);


            const model = genAI.getGenerativeModel({
                model: "gemini-3.6-flash",
            });

            const prompt = `
You are an Quanta AI.

Answer the user's question using ONLY the provided document context.

Rules:
- Answer only using the provided document context.
- Do not use outside knowledge or information.
- If the answer is not available in the provided context, clearly say:
  "I couldn't find that information in the uploaded documents."
- Do not make up, assume, or invent information.
- Give clear and well-structured answers.
- Use Markdown formatting where helpful.
- Answer concisely unless the user asks for a detailed explanation.

DOCUMENT CONTEXT:
${context}

USER QUESTION:
${userQuestion}
`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const answer = response.text();

            const assistantMessage: Message = {
                id: Date.now() + 2,
                role: "assistant",
                content: answer,
                sources: sources,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            setChats((prev) =>
                prev.map((chat) =>
                    chat.id === currentChatId
                        ? {
                            ...chat,
                            messages: [
                                ...chat.messages,
                                assistantMessage,
                            ],
                        }
                        : chat
                )
            );
        } catch (error) {
            console.error("Gemini error:", error);

            const errorMessage: Message = {
                id: Date.now() + 2,
                role: "assistant",
                content:
                    "Sorry, there was an error while generating the answer. Please try again.",
            };

            setMessages((prev) => [...prev, errorMessage]);

            setChats((prev) =>
                prev.map((chat) =>
                    chat.id === currentChatId
                        ? {
                            ...chat,
                            messages: [
                                ...chat.messages,
                                errorMessage,
                            ],
                        }
                        : chat
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    const extractPdfText = async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();

            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(arrayBuffer),
            });

            const pdf = await loadingTask.promise;

            let fullText = "";

            for (
                let pageNumber = 1;
                pageNumber <= pdf.numPages;
                pageNumber++
            ) {
                const page = await pdf.getPage(pageNumber);

                const content = await page.getTextContent();

                let pageText = "";

                for (const item of content.items) {
                    if ("str" in item) {
                        pageText += item.str + " ";
                    }
                }

                fullText += pageText + "\n\n";
            }

            if (!fullText.trim()) {
                throw new Error("No readable text found in this PDF");
            }

            return fullText;
        } catch (error) {
            console.error("PDF extraction error:", error);
            throw error;
        }
    };

    const handleUpload = async (files: FileList | null) => {
        if (!files) return;

        const pdfFiles = Array.from(files).filter(
            (file) =>
                file.type === "application/pdf" ||
                file.name.toLowerCase().endsWith(".pdf")
        );

        for (const file of pdfFiles) {
            const documentId = Date.now() + Math.random();

            const newDocument: KnowledgeDocument = {
                id: documentId,
                name: file.name,
                size: file.size,
                text: "",
                status: "processing",
            };

            setDocuments((prev) => [...prev, newDocument]);

            try {
                const extractedText = await extractPdfText(file);

                setDocuments((prev) =>
                    prev.map((doc) =>
                        doc.id === documentId
                            ? {
                                ...doc,
                                text: extractedText,
                                status: "ready",
                            }
                            : doc
                    )
                );
            } catch (error) {
                console.error("PDF extraction error:", error);

                setDocuments((prev) =>
                    prev.map((doc) =>
                        doc.id === documentId
                            ? {
                                ...doc,
                                status: "error",
                            }
                            : doc
                    )
                );
            }
        }
    };

    const removeDocument = (id: number) => {
        setDocuments((prev) =>
            prev.filter((document) => document.id !== id)
        );
    };

    const readyDocuments = documents.filter(
        (document) => document.status === "ready"
    );

    return (
        <div className="min-h-screen bg-[#06110d] text-white flex overflow-hidden">

            {/* ================= SIDEBAR ================= */}
            <aside className="w-[260px] border-r border-white/10 bg-black/20 flex flex-col p-4">

                <div className="flex items-center gap-3 px-3 py-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-300/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-emerald-300" />
                    </div>

                    <div>
                        <h1 className="font-semibold text-lg">Quanta AI</h1>
                        <p className="text-xs text-white/40">Knowledge Assistant</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setMessages([]);
                        setQuestion("");
                        setIsLoading(false);
                        setActivePage("assistant");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition"
                >
                    <Plus className="w-4 h-4" />
                    New Conversation
                </button>

                {/* ================= CHAT HISTORY ================= */}
                <div className="mt-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">

                    <p className="px-3 mb-3 text-[11px] font-medium uppercase tracking-wider text-white/30">
                        Chat History
                    </p>

                    {chats.length === 0 ? (
                        <p className="px-3 text-xs text-white/30">
                            No conversations yet
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {chats.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => {
                                        setMessages(chat.messages);
                                        setActiveChatId(chat.id);
                                        setActivePage("assistant");
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm truncate transition ${activeChatId === chat.id
                                        ? "bg-emerald-400/10 text-emerald-200"
                                        : "text-white/50 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    {chat.title}
                                </button>
                            ))}
                        </div>
                    )}

                </div>

                <nav className="mt-6 space-y-2">

                    <button
                        onClick={() => setActivePage("assistant")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activePage === "assistant"
                            ? "bg-emerald-400/10 text-emerald-200"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <MessageSquare className="w-5 h-5" />
                        AI Assistant
                    </button>

                    <button
                        onClick={() => setActivePage("knowledge")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activePage === "knowledge"
                            ? "bg-emerald-400/10 text-emerald-200"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <Database className="w-5 h-5" />
                        Knowledge Base

                        {documents.length > 0 && (
                            <span className="ml-auto text-xs bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">
                                {documents.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActivePage("documents")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activePage === "documents"
                            ? "bg-emerald-400/10 text-emerald-200"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <FileText className="w-5 h-5" />
                        Documents
                    </button>

                </nav>

                <div className="mt-auto">

                    <button
                        onClick={() => setActivePage("settings")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activePage === "settings"
                            ? "bg-emerald-400/10 text-emerald-200"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <Settings className="w-5 h-5" />
                        Settings
                    </button>

                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3 px-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-300 to-emerald-700 flex items-center justify-center text-sm font-bold">
                            Q
                        </div>

                        <div>
                            <p className="text-sm font-medium">Quantum Coders</p>
                            <p className="text-xs text-emerald-300">● Online</p>
                        </div>
                    </div>

                </div>
            </aside>

            {/* ================= MAIN CONTENT ================= */}
            <main className="flex-1 flex flex-col relative min-w-0 h-screen overflow-hidden">

                <header className="h-[72px] border-b border-white/10 flex items-center justify-between px-8 shrink-0">

                    <div className="flex items-center gap-4">
                        <PanelLeft className="w-5 h-5 text-white/40" />

                        <div>
                            <h2 className="font-semibold">
                                {activePage === "assistant" && "Quanta AI"}
                                {activePage === "knowledge" && "Knowledge Base"}
                                {activePage === "documents" && "Documents"}
                                {activePage === "settings" && "Settings"}
                            </h2>

                            <p className="text-xs text-white/40">
                                {activePage === "assistant" &&
                                    "Ask questions based on your knowledge base"}

                                {activePage === "knowledge" &&
                                    "Upload and manage AI knowledge"}

                                {activePage === "documents" &&
                                    "View all available documents"}
                                {activePage === "settings" &&
                                    "Manage your application preferences"}
                            </p>
                        </div>
                    </div>



                </header>

                {/* ================= PAGE CONTENT ================= */}
                <div className="flex-1 min-h-0 overflow-y-auto">

                    {/* AI ASSISTANT */}
                    {activePage === "assistant" && (
                        <>
                            {messages.length === 0 ? (
                                <div className="relative min-h-full flex flex-col items-center justify-center px-6 py-10 overflow-hidden">

                                    {/* Background glow */}
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                        <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[140px] -top-40 left-1/2 -translate-x-1/2" />
                                        <div className="absolute w-[350px] h-[350px] rounded-full bg-emerald-400/5 blur-[120px] bottom-0 right-0" />
                                    </div>

                                    {/* Main content */}
                                    <div className="relative z-10 flex flex-col items-center w-full">

                                        {/* Quanta AI icon */}
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 border border-emerald-300/20 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
                                            <Sparkles className="w-7 h-7 text-emerald-300" />
                                        </div>

                                        {/* Branding */}
                                        <h1 className="text-4xl md:text-5xl font-semibold text-center bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-white to-emerald-300">
                                            Quanta AI
                                        </h1>

                                        <p className="text-white/50 text-center mt-3 max-w-xl text-sm md:text-base">
                                            Your intelligent knowledge assistant. Ask questions and discover
                                            insights from your uploaded documents.
                                        </p>

                                        {/* Document status */}
                                        {readyDocuments.length > 0 && (
                                            <div className="flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-emerald-400/10 border border-emerald-300/20">
                                                <FileText className="w-4 h-4 text-emerald-300" />

                                                <span className="text-sm text-emerald-200">
                                                    {readyDocuments.length} document
                                                    {readyDocuments.length !== 1 ? "s" : ""} ready
                                                </span>
                                            </div>
                                        )}

                                        {/* Suggested questions */}
                                        <div className="flex flex-wrap justify-center gap-3 mt-10 max-w-3xl">

                                            {suggestedQuestions.map((item) => (
                                                <button
                                                    key={item}
                                                    onClick={() => sendMessage(item)}
                                                    className="group flex items-center gap-2 px-4 py-3 rounded-full border border-white/10 bg-white/[0.04] hover:bg-emerald-400/10 hover:border-emerald-300/30 transition-all duration-300 hover:-translate-y-0.5"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 text-emerald-300 group-hover:scale-110 transition-transform" />

                                                    <span className="text-sm text-white/70 group-hover:text-white">
                                                        {item}
                                                    </span>
                                                </button>
                                            ))}

                                        </div>

                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-4xl mx-auto w-full px-8 py-10 space-y-6">

                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.role === "user"
                                                ? "justify-end"
                                                : "justify-start"
                                                }`}
                                        >
                                            <div
                                                className={`max-w-[75%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${message.role === "user"
                                                    ? "bg-emerald-500 text-black"
                                                    : "bg-white/5 border border-white/10 text-white/90"
                                                    }`}
                                            >
                                                {message.role === "assistant" ? (
                                                    <div>
                                                        {/* AI Markdown Response */}
                                                        <div className="prose prose-invert max-w-none text-sm leading-7">
                                                            <ReactMarkdown>
                                                                {message.content}
                                                            </ReactMarkdown>
                                                        </div>

                                                        {/* Sources */}
                                                        {message.sources && message.sources.length > 0 && (
                                                            <div className="mt-4 pt-3 border-t border-white/10">
                                                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
                                                                    Sources
                                                                </p>

                                                                <div className="flex flex-wrap gap-2">
                                                                    {message.sources.map((source) => (
                                                                        <div
                                                                            key={source}
                                                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-xs text-emerald-300"
                                                                        >
                                                                            <FileText className="w-3.5 h-3.5" />
                                                                            {source}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm leading-7 whitespace-pre-wrap">
                                                        {message.content}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* AI Reply Animation */}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-emerald-400/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-bounce [animation-delay:-0.3s]" />
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-bounce" />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />

                                </div>
                            )}
                        </>
                    )}

                    {/* KNOWLEDGE BASE */}
                    {activePage === "knowledge" && (
                        <div className="max-w-5xl mx-auto px-10 py-10">

                            <div className="mb-10">
                                <div className="flex items-center gap-3">

                                    <div className="w-11 h-11 rounded-xl bg-emerald-400/10 border border-emerald-300/20 flex items-center justify-center">
                                        <Database className="w-5 h-5 text-emerald-300" />
                                    </div>

                                    <div>
                                        <h2 className="text-2xl font-semibold">
                                            Knowledge Base
                                        </h2>

                                        <p className="text-sm text-white/40 mt-1">
                                            Manage the documents your AI can use to answer questions.
                                        </p>
                                    </div>

                                </div>
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full min-h-[220px] rounded-2xl border border-dashed border-emerald-300/30 bg-emerald-400/[0.03] hover:bg-emerald-400/[0.07] transition flex flex-col items-center justify-center"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-emerald-400/10 flex items-center justify-center mb-4">
                                    <Upload className="w-6 h-6 text-emerald-300" />
                                </div>

                                <p className="font-medium">
                                    Upload knowledge documents
                                </p>

                                <p className="text-sm text-white/40 mt-2">
                                    Click to select PDF files
                                </p>
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                multiple
                                onChange={(e) => handleUpload(e.target.files)}
                                className="hidden"
                            />

                            {documents.length > 0 && (
                                <div className="mt-10">

                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-medium">
                                            Uploaded Documents
                                        </h3>

                                        <span className="text-sm text-white/40">
                                            {documents.length} document
                                            {documents.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    <div className="space-y-3">

                                        {documents.map((document) => (
                                            <div
                                                key={document.id}
                                                className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.03]"
                                            >
                                                <div className="w-11 h-11 rounded-lg bg-red-400/10 flex items-center justify-center">
                                                    <File className="w-5 h-5 text-red-300" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {document.name}
                                                    </p>

                                                    <p className="text-xs text-white/40 mt-1">
                                                        {(document.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>

                                                {document.status === "processing" && (
                                                    <div className="flex items-center gap-2 text-yellow-300">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="text-xs">Processing</span>
                                                    </div>
                                                )}

                                                {document.status === "ready" && (
                                                    <div className="flex items-center gap-2 text-emerald-300">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="text-xs">Ready</span>
                                                    </div>
                                                )}

                                                {document.status === "error" && (
                                                    <span className="text-xs text-red-300">
                                                        Error reading PDF
                                                    </span>
                                                )}

                                                <button
                                                    onClick={() => removeDocument(document.id)}
                                                    className="p-2 text-white/30 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}

                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* DOCUMENTS */}
                    {activePage === "documents" && (
                        <div className="max-w-5xl mx-auto px-10 py-10">

                            <div className="mb-10">
                                <h2 className="text-2xl font-semibold">
                                    Documents
                                </h2>

                                <p className="text-sm text-white/40 mt-2">
                                    All documents currently available to your AI assistant.
                                </p>
                            </div>

                            {documents.length === 0 ? (
                                <div className="min-h-[400px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl">

                                    <FileText className="w-12 h-12 text-white/20 mb-4" />

                                    <p className="text-white/60">
                                        No documents uploaded yet
                                    </p>

                                    <button
                                        onClick={() => setActivePage("knowledge")}
                                        className="mt-4 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition"
                                    >
                                        Upload Documents
                                    </button>

                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-4">

                                    {documents.map((document) => (
                                        <div
                                            key={document.id}
                                            className="p-5 rounded-2xl border border-white/10 bg-white/[0.03]"
                                        >
                                            <div className="flex items-start justify-between">

                                                <div className="w-12 h-12 rounded-xl bg-emerald-400/10 flex items-center justify-center">
                                                    <FileText className="w-6 h-6 text-emerald-300" />
                                                </div>

                                                {document.status === "ready" ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                                                ) : (
                                                    <Loader2 className="w-5 h-5 text-yellow-300 animate-spin" />
                                                )}

                                            </div>

                                            <h3 className="font-medium mt-5 truncate">
                                                {document.name}
                                            </h3>

                                            <p className="text-xs text-white/40 mt-2">
                                                PDF Document ·{" "}
                                                {(document.size / 1024 / 1024).toFixed(2)} MB
                                            </p>

                                            <p
                                                className={`text-xs mt-4 ${document.status === "ready"
                                                    ? "text-emerald-300"
                                                    : document.status === "error"
                                                        ? "text-red-300"
                                                        : "text-yellow-300"
                                                    }`}
                                            >
                                                {document.status === "ready" &&
                                                    "Ready for AI search"}

                                                {document.status === "processing" &&
                                                    "Processing document..."}

                                                {document.status === "error" &&
                                                    "Unable to extract text"}
                                            </p>
                                        </div>
                                    ))}

                                </div>
                            )}

                        </div>
                    )}

                </div>
                {/* ================= SETTINGS ================= */}
                {activePage === "settings" && (
                    <div className="max-w-4xl mx-auto w-full px-8 py-10">

                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-white">
                                Application Settings
                            </h2>

                            <p className="text-sm text-white/40 mt-2">
                                Manage your chat and knowledge base.
                            </p>
                        </div>

                        <div className="space-y-4">

                            {/* Clear Chat */}
                            <div className="flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
                                <div>
                                    <h3 className="font-medium text-white">
                                        Clear Conversation
                                    </h3>

                                    <p className="text-sm text-white/40 mt-1">
                                        Remove all messages from the current chat.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setConfirmAction("clearChat")}
                                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-sm hover:bg-red-500/20 transition"
                                >
                                    Clear Chat
                                </button>
                            </div>

                            {/* Clear Documents */}
                            <div className="flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
                                <div>
                                    <h3 className="font-medium text-white">
                                        Clear Documents
                                    </h3>

                                    <p className="text-sm text-white/40 mt-1">
                                        Remove all uploaded documents from the knowledge base.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setConfirmAction("clearDocuments")}
                                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-sm hover:bg-red-500/20 transition"
                                >
                                    Clear Documents
                                </button>
                            </div>

                            {/* About */}
                            <div className="p-5 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.03]">
                                <h3 className="font-medium text-white">
                                    About Quanta AI
                                </h3>

                                <p className="text-sm text-white/40 mt-2 leading-6">
                                    Quanta AI is an intelligent knowledge assistant that allows users
                                    to upload documents and ask AI-powered questions based on their content.
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="px-3 py-1 rounded-full text-xs bg-emerald-400/10 text-emerald-300">
                                        Gemini AI
                                    </span>

                                    <span className="px-3 py-1 rounded-full text-xs bg-emerald-400/10 text-emerald-300">
                                        Document RAG
                                    </span>

                                    <span className="px-3 py-1 rounded-full text-xs bg-emerald-400/10 text-emerald-300">
                                        React + TypeScript
                                    </span>
                                </div>
                            </div>

                            {/* Logout */}
                            <div className="flex items-center justify-between p-5 rounded-2xl border border-red-400/20 bg-red-500/[0.03]">
                                <div>
                                    <h3 className="font-medium text-white">
                                        Logout
                                    </h3>

                                    <p className="text-sm text-white/40 mt-1">
                                        Sign out and return to the login page.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setConfirmAction("logout")}
                                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-sm hover:bg-red-500/20 transition"
                                >
                                    Logout
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* ================= CHAT INPUT ================= */}
                {activePage === "assistant" && (
                    <div className="border-t border-white/10 p-6 shrink-0">

                        <div className="max-w-4xl mx-auto relative">

                            <input
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !isLoading) {
                                        sendMessage();
                                    }
                                }}
                                placeholder={
                                    readyDocuments.length > 0
                                        ? "Ask anything about your documents..."
                                        : "Upload a document first..."
                                }
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-16 text-sm text-white outline-none focus:border-emerald-400/50 focus:bg-white/[0.07] transition"
                            />

                            <button
                                onClick={() => sendMessage()}
                                disabled={isLoading}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center transition ${isLoading
                                    ? "bg-white/20 text-white/40 cursor-not-allowed"
                                    : "bg-white text-black hover:scale-105"
                                    }`}
                            >
                                <Send className="w-5 h-5" />
                            </button>

                        </div>

                        <p className="text-center text-xs text-white/25 mt-3">
                            {readyDocuments.length > 0
                                ? `${readyDocuments.length} document${readyDocuments.length !== 1 ? "s" : ""
                                } ready for AI search`
                                : "Upload a PDF to start building your knowledge base"}
                        </p>

                    </div>
                )}
                {confirmAction && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">

                        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1712] p-6 shadow-2xl">

                            <h2 className="text-xl font-semibold text-white">
                                {confirmAction === "clearChat" && "Clear conversation?"}
                                {confirmAction === "clearDocuments" && "Clear all documents?"}
                                {confirmAction === "logout" && "Logout?"}
                            </h2>

                            <p className="text-sm text-white/45 mt-3 leading-6">
                                {confirmAction === "clearChat" &&
                                    "All messages in the current conversation will be removed."}

                                {confirmAction === "clearDocuments" &&
                                    "All uploaded documents will be removed from the knowledge base."}

                                {confirmAction === "logout" &&
                                    "You will be signed out and returned to the login page."}
                            </p>

                            <div className="flex justify-end gap-3 mt-7">

                                <button
                                    onClick={() => setConfirmAction(null)}
                                    className="px-4 py-2 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={() => {
                                        if (confirmAction === "clearChat") {
                                            setMessages([]);
                                        }

                                        if (confirmAction === "clearDocuments") {
                                            setDocuments([]);
                                        }

                                        if (confirmAction === "logout") {
                                            onLogout();
                                        }

                                        setConfirmAction(null);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-red-500/15 border border-red-400/20 text-red-300 text-sm hover:bg-red-500/25 transition"
                                >
                                    Confirm
                                </button>

                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}