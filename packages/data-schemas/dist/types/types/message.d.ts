import type { Document } from 'mongoose';
import type { TFeedbackRating, TFeedbackTag } from '@hanzochat/data-provider';
export interface IMessage extends Document {
    messageId: string;
    conversationId: string;
    user: string;
    /** Organization this message belongs to */
    organization?: string;
    model?: string;
    endpoint?: string;
    conversationSignature?: string;
    clientId?: string;
    invocationId?: number;
    parentMessageId?: string;
    tokenCount?: number;
    summaryTokenCount?: number;
    sender?: string;
    text?: string;
    summary?: string;
    isCreatedByUser: boolean;
    unfinished?: boolean;
    error?: boolean;
    finish_reason?: string;
    feedback?: {
        rating: TFeedbackRating;
        tag: TFeedbackTag | undefined;
        text?: string;
    };
    _meiliIndex?: boolean;
    files?: unknown[];
    plugin?: {
        latest?: string;
        inputs?: unknown[];
        outputs?: string;
    };
    plugins?: unknown[];
    content?: unknown[];
    thread_id?: string;
    iconURL?: string;
    addedConvo?: boolean;
    /** Upstream gateway response id — the content-free reward-signal join key (routing ledger). */
    feedbackRequestId?: string;
    metadata?: Record<string, unknown>;
    attachments?: unknown[];
    expiredAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
