"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle, Globe } from "lucide-react";

// Define the response schema type
type ResponseSchema = {
    mainResponse: string;
    keywords: string;
    simplify: string;
    questions: string;
};

// Q&A Session types
type QASession = {
    sessionId: string;
    currentQuestion: string;
    attemptCount: number;
    maxAttempts: number;
    conversationHistory: Array<{
        type: 'question' | 'answer' | 'feedback';
        content: string;
        status?: 'correct' | 'needs_improvement' | 'max_attempts';
    }>;
};

type ViewMode = "main" | "keywords" | "talking-points" | "questions";

export default function OpenAIPage() {
    const [query, setQuery] = useState("");
    const [responses, setResponses] = useState<ResponseSchema>({
        mainResponse: "",
        keywords: "",
        simplify: "",
        questions: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [processingOption, setProcessingOption] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("main");

    // Q&A Session state
    const [qaSession, setQASession] = useState<QASession | null>(null);
    const [studentAnswer, setStudentAnswer] = useState("");
    const [isQALoading, setIsQALoading] = useState(false);

    const handleOptionClick = async (option: string) => {
        // Handle Questions mode with Q&A Agent
        if (option === "questions") {
            await startQASession();
            return;
        }

        // Check if content already exists for this option
        if ((option === "keywords" && responses.keywords) ||
            (option === "talking-points" && responses.simplify)) {
            return;
        }

        setProcessingOption(option);

        try {
            const res = await fetch("/api/openai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query,
                    option,
                    originalResponse: responses.mainResponse
                }),
            });

            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }

            if (!res.body) {
                throw new Error("No response body for streaming.");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            // Read chunk by chunk:
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    // Decode this Uint8Array chunk into string
                    const chunkText = decoder.decode(value, { stream: true });
                    accumulated += chunkText;

                    // Update the appropriate field in the responses object based on the option
                    setResponses(prev => {
                        if (option === "keywords") {
                            return { ...prev, keywords: accumulated };
                        } else if (option === "talking-points") {
                            return { ...prev, simplify: accumulated };
                        }
                        return prev;
                    });
                }
            }
        } catch (err) {
            console.error(`Failed to process ${option} option:`, err);
            setError(`Failed to process ${option} option. Please try again.`);
        } finally {
            setProcessingOption(null);
        }
    };

    // Start a new Q&A session using the main response as context
    const startQASession = async () => {
        if (!responses.mainResponse) {
            setError("Please submit a query first to generate context for questions.");
            return;
        }

        setIsQALoading(true);
        setError("");

        try {
            const res = await fetch("/api/openai/qa", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "start",
                    context: responses.mainResponse
                }),
            });

            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }

            const data = await res.json();

            if (data.success) {
                setQASession({
                    sessionId: data.sessionId,
                    currentQuestion: data.question,
                    attemptCount: data.attemptCount,
                    maxAttempts: data.maxAttempts,
                    conversationHistory: [{
                        type: 'question',
                        content: data.question
                    }]
                });
            } else {
                throw new Error(data.error || "Failed to start Q&A session");
            }
        } catch (err) {
            console.error("Failed to start Q&A session:", err);
            setError("Failed to start Q&A session. Please try again.");
        } finally {
            setIsQALoading(false);
        }
    };

    // Submit student answer to Q&A agent
    const submitAnswer = async () => {
        if (!qaSession || !studentAnswer.trim()) return;

        setIsQALoading(true);

        try {
            const res = await fetch("/api/openai/qa", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "answer",
                    sessionId: qaSession.sessionId,
                    answer: studentAnswer.trim()
                }),
            });

            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }

            const data = await res.json();

            if (data.success) {
                // Add student answer to conversation history
                const newHistory = [...qaSession.conversationHistory, {
                    type: 'answer' as const,
                    content: studentAnswer.trim()
                }];

                // Add feedback to conversation history
                newHistory.push({
                    type: 'feedback' as const,
                    content: data.feedback,
                    status: data.status
                });

                // If there's a next question, add it to history
                if (data.nextQuestion) {
                    newHistory.push({
                        type: 'question' as const,
                        content: data.nextQuestion
                    });
                }

                setQASession({
                    ...qaSession,
                    currentQuestion: data.nextQuestion || qaSession.currentQuestion,
                    attemptCount: data.attemptCount,
                    conversationHistory: newHistory
                });

                setStudentAnswer(""); // Clear the input
            } else {
                throw new Error(data.error || "Failed to process answer");
            }
        } catch (err) {
            console.error("Failed to submit answer:", err);
            setError("Failed to submit answer. Please try again.");
        } finally {
            setIsQALoading(false);
        }
    };

    // Reset Q&A session
    const resetQASession = () => {
        setQASession(null);
        setStudentAnswer("");
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError("");
        setResponses(prev => ({ ...prev, mainResponse: "" }));

        try {
            const res = await fetch("/api/openai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query }),
            });

            if (!res.ok) {
                throw new Error(`Error: ${res.status}`);
            }

            // === STREAMING LOGIC STARTS HERE ===
            if (!res.body) {
                throw new Error("No response body for streaming.");
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            // Read chunk by chunk:
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    // Decode this Uint8Array chunk into string
                    const chunkText = decoder.decode(value, { stream: true });
                    accumulated += chunkText;
                    setResponses(prev => ({ ...prev, mainResponse: accumulated }));
                }
            }
            // === STREAMING LOGIC ENDS HERE ===

        } catch (err) {
            console.error("Failed to fetch OpenAI response:", err);
            setError("Failed to get response. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <section className="bg-gray-50 py-20 px-4 text-center">
                <h1
                    className="text-5xl md:text-6xl font-extrabold mb-4 flex justify-center items-center gap-3 bg-gradient-to-r from-pink-500 via-purple-400 to-blue-500 bg-clip-text text-transparent"
                >
                    Stay Informed
                    <Globe className="w-10 h-10 text-pink-500 animate-spin-slow" />
                </h1>
                <ul className="inline-block text-left space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                        <CheckCircle className="text-green-500 w-5 h-5 mt-1" />
                        We search the internet to find the latest updates on your query.
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="text-green-500 w-5 h-5 mt-1" />
                        We give you key and talking points
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="text-green-500 w-5 h-5 mt-1" />
                        We build a question agent to help you quickly learn about this update.
                    </li>
                </ul>
            </section>
            <form onSubmit={handleSubmit} className="mb-8">
                <div className="flex gap-3">
                    <Input
                        type="text"
                        placeholder="What is the latest news on New York City?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !query.trim()}>
                        {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : <Globe className="mr-2 h-4 w-4" />}
                        Submit
                    </Button>
                </div>
            </form>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                    {error}
                </div>
            )}

            {responses.mainResponse && (
                <>
                    {/* Toggle buttons at the top */}
                    <div className="mb-6 flex justify-center gap-4">
                        <Button
                            variant={viewMode === "main" ? "default" : "outline"}
                            onClick={() => setViewMode("main")}
                            className="flex-1"
                        >
                            Main Response
                        </Button>
                        <Button
                            variant={viewMode === "keywords" ? "default" : "outline"}
                            onClick={() => {
                                setViewMode("keywords");
                                if (!responses.keywords) handleOptionClick("keywords");
                            }}
                            className="flex-1"
                            disabled={!!processingOption}
                        >
                            {processingOption === "keywords" ? <Spinner className="mr-2 h-4 w-4" /> : null}
                            Key Topics
                        </Button>
                        <Button
                            variant={viewMode === "talking-points" ? "default" : "outline"}
                            onClick={() => {
                                setViewMode("talking-points");
                                if (!responses.simplify) handleOptionClick("talking-points");
                            }}
                            className="flex-1"
                            disabled={!!processingOption}
                        >
                            {processingOption === "talking-points" ? <Spinner className="mr-2 h-4 w-4" /> : null}
                            Talking Points
                        </Button>
                        <Button
                            variant={viewMode === "questions" ? "default" : "outline"}
                            onClick={() => {
                                setViewMode("questions");
                                handleOptionClick("questions");
                            }}
                            className="flex-1"
                            disabled={!!processingOption || isQALoading}
                        >
                            {(processingOption === "questions" || isQALoading) ? <Spinner className="mr-2 h-4 w-4" /> : null}
                            Interactive Q&A
                        </Button>
                    </div>

                    {/* Content card - shows different content based on view mode */}
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {viewMode === "main" && "Response"}
                                {viewMode === "keywords" && "Key Topics"}
                                {viewMode === "talking-points" && "Talking Points"}
                                {viewMode === "questions" && "Interactive Q&A Session"}
                            </CardTitle>
                            <CardDescription>
                                {viewMode === "main" ? "OpenAI generated response" :
                                    viewMode === "questions" ? "Answer questions based on the content above" :
                                        "Generated from your content"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {viewMode === "questions" ? (
                                // Q&A Interface
                                <div className="space-y-4">
                                    {qaSession ? (
                                        <>
                                            {/* Conversation History */}
                                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                                {qaSession.conversationHistory.map((item, index) => (
                                                    <div key={index} className={`p-3 rounded-lg ${item.type === 'question' ? 'bg-blue-50 border-l-4 border-blue-400' :
                                                        item.type === 'answer' ? 'bg-gray-50 border-l-4 border-gray-400' :
                                                            item.status === 'correct' ? 'bg-green-50 border-l-4 border-green-400' :
                                                                item.status === 'needs_improvement' ? 'bg-yellow-50 border-l-4 border-yellow-400' :
                                                                    'bg-red-50 border-l-4 border-red-400'
                                                        }`}>
                                                        <div className="font-semibold text-sm mb-1">
                                                            {item.type === 'question' ? '❓ Question:' :
                                                                item.type === 'answer' ? '📝 Your Answer:' :
                                                                    item.status === 'correct' ? '✅ Correct!' :
                                                                        item.status === 'needs_improvement' ? '🔄 Try Again:' :
                                                                            '⚠️ Feedback:'}
                                                        </div>
                                                        <div className="text-sm">{item.content}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Current Question and Answer Input */}
                                            {qaSession.currentQuestion && (
                                                <div className="border-t pt-4">
                                                    <div className="mb-4">
                                                        <p className="font-medium text-blue-600 mb-2">Current Question:</p>
                                                        <p className="text-lg">{qaSession.currentQuestion}</p>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            Attempt {qaSession.attemptCount + 1} of {qaSession.maxAttempts}
                                                        </p>
                                                    </div>

                                                    <div className="flex gap-3">
                                                        <Input
                                                            type="text"
                                                            placeholder="Type your answer here..."
                                                            value={studentAnswer}
                                                            onChange={(e) => setStudentAnswer(e.target.value)}
                                                            onKeyPress={(e) => e.key === 'Enter' && !isQALoading && submitAnswer()}
                                                            className="flex-1"
                                                        />
                                                        <Button
                                                            onClick={submitAnswer}
                                                            disabled={isQALoading || !studentAnswer.trim()}
                                                        >
                                                            {isQALoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                                                            Submit
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Reset Session Button */}
                                            <div className="border-t pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={resetQASession}
                                                    className="w-full"
                                                >
                                                    Start New Q&A Session
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        // Start Q&A Session
                                        <div className="text-center py-8">
                                            <p className="text-gray-600 mb-4">
                                                Ready to test your understanding? Start an interactive Q&A session based on the content above.
                                            </p>
                                            <Button
                                                onClick={startQASession}
                                                disabled={isQALoading}
                                                size="lg"
                                            >
                                                {isQALoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                                                Start Q&A Session
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Other view modes (main, keywords, talking-points)
                                <div className="prose max-w-none dark:prose-invert prose-blue prose-sm sm:prose-base">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {viewMode === "main" ? responses.mainResponse :
                                            viewMode === "keywords" ? (responses.keywords || "Click to generate keywords") :
                                                (responses.simplify || "Click to simplify as talking points")}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
