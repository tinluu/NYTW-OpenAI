// app/api/qa/route.ts

import { Agent, run, AgentInputItem } from '@openai/agents';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

// Define the evaluator's output schema
const EvaluationResult = z.object({
    feedback: z.string(),
    score: z.enum(['pass', 'needs_improvement']),
});

// Request schema for API validation
const QARequestSchema = z.object({
    action: z.enum(['start', 'answer']),
    sessionId: z.string().optional(),
    context: z.string().optional(),
    answer: z.string().optional(),
});

// Session interface for state management
interface QASession {
    id: string;
    context: string;
    history: AgentInputItem[];
    currentQuestion: string;
    attemptCount: number;
    maxAttempts: number;
    createdAt: Date;
}

// In-memory session store (consider using Redis or database for production)
const sessions = new Map<string, QASession>();

// Cleanup old sessions (older than 1 hour)
const cleanupSessions = () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [sessionId, session] of sessions.entries()) {
        if (session.createdAt < oneHourAgo) {
            sessions.delete(sessionId);
        }
    }
};

// Create the "questionGenerator" agent
const questionGenerator = new Agent({
    name: 'question_generator',
    instructions: `
Given a context passage (and optionally any previous question/feedback in the history), generate exactly one clear, context‐based question. 
Output must be a single question sentence with no numbering. 
  `.trim(),
});

// Create the "evaluator" agent
const evaluator = new Agent({
    name: 'evaluator',
    instructions: `
You are a grading assistant. 
You receive, in the conversation history, three key pieces of information:
1) The original context passage (from the user). 
2) The question that was asked. 
3) The student's answer to that question.

Your job is to compare the student's answer against the context + question, then decide:
- If the answer is correct (in context), set "score" to "pass" and feedback to a short encouraging message (e.g., "Correct!").
- If the answer is incomplete or incorrect, set "score" to "needs_improvement" and feedback to a concise explanation of what's missing or wrong. 

Always return a JSON object matching this schema exactly:
{
  "feedback": string,
  "score": "pass" | "needs_improvement"
}

Never say "pass" on the very first run without actually evaluating. Keep your feedback focused on how the student can improve if needed.
  `.trim(),
    outputType: EvaluationResult,
});

// Generate a unique session ID
const generateSessionId = (): string => {
    return `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Start a new QA session
async function startSession(context: string): Promise<{
    sessionId: string;
    question: string;
}> {
    const sessionId = generateSessionId();

    // Initialize history with context
    const history: AgentInputItem[] = [{ role: 'user', content: `Context: ${context}` }];

    // Generate the first question
    const qGenResult = await run(questionGenerator, history);
    if (!qGenResult.finalOutput) {
        throw new Error('Failed to generate initial question');
    }

    const question = qGenResult.finalOutput.trim();

    // Create and store session
    const session: QASession = {
        id: sessionId,
        context,
        history: qGenResult.history,
        currentQuestion: question,
        attemptCount: 0,
        maxAttempts: 5,
        createdAt: new Date(),
    };

    sessions.set(sessionId, session);

    return { sessionId, question };
}

// Process student answer
async function processAnswer(sessionId: string, answer: string): Promise<{
    status: 'correct' | 'needs_improvement' | 'max_attempts' | 'new_question';
    feedback: string;
    nextQuestion?: string;
    attemptCount: number;
    maxAttempts: number;
}> {
    const session = sessions.get(sessionId);
    if (!session) {
        throw new Error('Session not found or expired');
    }

    // Increment attempt count
    session.attemptCount++;

    // Add student answer to history
    session.history.push({ role: 'user', content: `Answer: ${answer}` });

    // Run the evaluator
    const evalResult = await run(evaluator, session.history);
    if (!evalResult.finalOutput) {
        throw new Error('Evaluator failed to return result');
    }

    const { feedback, score } = evalResult.finalOutput;
    session.history = evalResult.history;

    if (score === 'pass') {
        // Generate follow-up question
        session.history.push({ role: 'user', content: 'Generate a follow-up question.' });

        const followUpResult = await run(questionGenerator, session.history);
        if (!followUpResult.finalOutput) {
            throw new Error('Failed to generate follow-up question');
        }

        const followUpQuestion = followUpResult.finalOutput.trim();

        // Update session with new question
        session.currentQuestion = followUpQuestion;
        session.history = followUpResult.history;
        session.attemptCount = 0; // Reset attempts for new question

        sessions.set(sessionId, session);

        return {
            status: 'correct',
            feedback,
            nextQuestion: followUpQuestion,
            attemptCount: 0,
            maxAttempts: session.maxAttempts,
        };
    } else {
        // Check if max attempts reached
        if (session.attemptCount >= session.maxAttempts) {
            // Generate a new question (different from current)
            session.history.push({ role: 'user', content: 'Generate a new question (different).' });

            const newQResult = await run(questionGenerator, session.history);
            if (!newQResult.finalOutput) {
                throw new Error('Failed to generate new question');
            }

            const newQuestion = newQResult.finalOutput.trim();

            // Update session
            session.currentQuestion = newQuestion;
            session.history = newQResult.history;
            session.attemptCount = 0;

            sessions.set(sessionId, session);

            return {
                status: 'max_attempts',
                feedback: `Maximum attempts reached. Here's a new question: ${newQuestion}`,
                nextQuestion: newQuestion,
                attemptCount: 0,
                maxAttempts: session.maxAttempts,
            };
        } else {
            // Allow retry with feedback
            session.history.push({ role: 'user', content: `Feedback: ${feedback}` });
            sessions.set(sessionId, session);

            return {
                status: 'needs_improvement',
                feedback,
                attemptCount: session.attemptCount,
                maxAttempts: session.maxAttempts,
            };
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        // Clean up old sessions periodically
        cleanupSessions();

        const body = await request.json();
        const validatedRequest = QARequestSchema.parse(body);

        const { action, sessionId, context, answer } = validatedRequest;

        if (action === 'start') {
            if (!context) {
                return NextResponse.json(
                    { error: 'Context is required to start a session' },
                    { status: 400 }
                );
            }

            const result = await startSession(context);

            return NextResponse.json({
                success: true,
                sessionId: result.sessionId,
                question: result.question,
                attemptCount: 0,
                maxAttempts: 5,
            });
        }

        if (action === 'answer') {
            if (!sessionId || !answer) {
                return NextResponse.json(
                    { error: 'Session ID and answer are required' },
                    { status: 400 }
                );
            }

            const result = await processAnswer(sessionId, answer);

            return NextResponse.json({
                success: true,
                ...result,
            });
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );

    } catch (error) {
        console.error('QA API Error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request format', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}