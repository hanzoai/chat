import { Schema } from 'mongoose';
export declare const conversationPreset: {
    endpoint: {
        type: StringConstructor;
        default: null;
        required: boolean;
    };
    endpointType: {
        type: StringConstructor;
    };
    model: {
        type: StringConstructor;
        required: boolean;
    };
    region: {
        type: StringConstructor;
        required: boolean;
    };
    chatGptLabel: {
        type: StringConstructor;
        required: boolean;
    };
    examples: {
        type: {
            type: typeof Schema.Types.Mixed;
        }[];
        default: undefined;
    };
    modelLabel: {
        type: StringConstructor;
        required: boolean;
    };
    promptPrefix: {
        type: StringConstructor;
        required: boolean;
    };
    temperature: {
        type: NumberConstructor;
        required: boolean;
    };
    top_p: {
        type: NumberConstructor;
        required: boolean;
    };
    topP: {
        type: NumberConstructor;
        required: boolean;
    };
    topK: {
        type: NumberConstructor;
        required: boolean;
    };
    maxOutputTokens: {
        type: NumberConstructor;
        required: boolean;
    };
    maxTokens: {
        type: NumberConstructor;
        required: boolean;
    };
    presence_penalty: {
        type: NumberConstructor;
        required: boolean;
    };
    frequency_penalty: {
        type: NumberConstructor;
        required: boolean;
    };
    file_ids: {
        type: {
            type: StringConstructor;
        }[];
        default: undefined;
    };
    resendImages: {
        type: BooleanConstructor;
    };
    promptCache: {
        type: BooleanConstructor;
    };
    thinking: {
        type: BooleanConstructor;
    };
    thinkingBudget: {
        type: NumberConstructor;
    };
    system: {
        type: StringConstructor;
    };
    resendFiles: {
        type: BooleanConstructor;
    };
    imageDetail: {
        type: StringConstructor;
    };
    agent_id: {
        type: StringConstructor;
    };
    assistant_id: {
        type: StringConstructor;
    };
    instructions: {
        type: StringConstructor;
    };
    stop: {
        type: {
            type: StringConstructor;
        }[];
        default: undefined;
    };
    isArchived: {
        type: BooleanConstructor;
        default: boolean;
    };
    iconURL: {
        type: StringConstructor;
    };
    greeting: {
        type: StringConstructor;
    };
    spec: {
        type: StringConstructor;
    };
    tags: {
        type: StringConstructor[];
        default: never[];
    };
    tools: {
        type: {
            type: StringConstructor;
        }[];
        default: undefined;
    };
    maxContextTokens: {
        type: NumberConstructor;
    };
    max_tokens: {
        type: NumberConstructor;
    };
    /** omni models only */
    reasoning_effort: {
        type: StringConstructor;
    };
};
