import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContentTypes } from '@hanzochat/data-provider';
import type { TMessageContentParts } from '@hanzochat/data-provider';

jest.mock('~/utils', () => ({
  mapAttachments: () => ({}),
  groupSequentialToolCalls: (parts: Array<{ part: unknown; idx: number }>) =>
    parts.map((p) => ({ type: 'single' as const, part: p })),
}));

jest.mock('~/Providers', () => ({
  MessageContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
  SearchContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

jest.mock('../Parts', () => ({
  EditTextPart: () => <div data-testid="edit-text-part" />,
  EmptyText: () => <div data-testid="empty-text" />,
}));

jest.mock('../MemoryArtifacts', () => ({
  __esModule: true,
  default: () => <div data-testid="memory-artifacts" />,
}));

jest.mock('../ToolCallGroup', () => ({
  __esModule: true,
  default: () => <div data-testid="tool-call-group" />,
}));

jest.mock('../Container', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="container">{children}</div>
  ),
}));

jest.mock('../Part', () => ({
  __esModule: true,
  default: ({ part }: { part: TMessageContentParts }) => (
    <div data-testid={`real-part-${part.type}`} />
  ),
}));

jest.mock('../ParallelContent', () => ({
  ParallelContentRenderer: () => <div data-testid="parallel-renderer" />,
}));

import ContentParts from '../ContentParts';

const baseProps = {
  messageId: 'msg-1',
  isLast: false,
  isSubmitting: false,
  isLatestMessage: false,
  isCreatedByUser: false,
  content: [],
};

