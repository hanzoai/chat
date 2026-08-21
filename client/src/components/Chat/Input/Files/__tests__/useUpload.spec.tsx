import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'jotai';
import { EModelEndpoint, Providers } from '@hanzochat/data-provider';
import { useUpload } from '../useUpload';

/**
 * Adding a file is ONE gesture now, so the only thing left to get wrong is
 * what the input will take. That used to be spread over a menu of capability
 * rows — upload as an image, as OCR text, for file search, for the sandbox —
 * and the rows are gone; `accept` is what survives them, and it is read off
 * the real input at the moment of the click, because `add()` puts it back to
 * empty immediately afterwards.
 */

const IMAGES = 'image/*,.heif,.heic';
const DOCUMENTS = `${IMAGES},.pdf,application/pdf`;
const MEDIA = `${DOCUMENTS},video/*,audio/*`;

jest.mock('~/hooks', () => ({
  useAgentToolPermissions: jest.fn(),
  useFileHandling: jest.fn(),
}));

jest.mock('../PreviousImagesDialog', () => ({ __esModule: true, default: () => null }));

jest.mock('@hanzochat/client', () => {
  const react = jest.requireActual('react');
  return {
    FileUpload: react.forwardRef(({ children, handleFileChange }: any, ref: any) => (
      <>
        <input ref={ref} type="file" onChange={handleFileChange} data-testid="file-input" />
        {children}
      </>
    )),
  };
});

const permissions = jest.requireMock('~/hooks').useAgentToolPermissions;
const fileHandling = jest.requireMock('~/hooks').useFileHandling;

let api: ReturnType<typeof useUpload>;

function Harness(props: Record<string, unknown>) {
  api = useUpload(props as never);
  return <>{api.portals}</>;
}

function mount(props: Record<string, unknown> = {}) {
  return render(
    <Provider>
      <Harness conversationId="c1" {...props} />
    </Provider>,
  );
}

/** What the input would take, read at the instant `add()` clicks it. */
function acceptOnAdd(props: Record<string, unknown> = {}): string {
  let seen = 'never clicked';
  const click = jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
    this: HTMLInputElement,
  ) {
    seen = this.accept;
  });
  mount(props);
  api.add();
  click.mockRestore();
  return seen;
}

beforeEach(() => {
  jest.clearAllMocks();
  permissions.mockReturnValue({ provider: null });
  fileHandling.mockReturnValue({ handleFileChange: jest.fn() });
});

describe('what the input will take', () => {
  it('takes documents on a provider that reads them', () => {
    expect(acceptOnAdd({ endpoint: 'Moonshot', endpointType: EModelEndpoint.custom })).toBe(
      DOCUMENTS,
    );
  });

  it('takes images only on a provider that reads nothing else', () => {
    expect(acceptOnAdd({ endpoint: EModelEndpoint.bedrock })).toBe(IMAGES);
  });

  it('takes video and audio too on Google', () => {
    permissions.mockReturnValue({ provider: Providers.GOOGLE });
    expect(acceptOnAdd({ endpoint: EModelEndpoint.agents })).toBe(MEDIA);
  });

  it('takes video and audio too on OpenRouter, whatever its case', () => {
    permissions.mockReturnValue({ provider: 'OpenRouter' });
    expect(acceptOnAdd({ endpoint: EModelEndpoint.agents })).toBe(MEDIA);
  });

  it('reads the agent provider ahead of the endpoint', () => {
    permissions.mockReturnValue({ provider: EModelEndpoint.anthropic });
    expect(acceptOnAdd({ endpoint: EModelEndpoint.agents })).toBe(DOCUMENTS);
  });

  it('refuses documents on Azure until the Responses API is on', () => {
    permissions.mockReturnValue({ provider: EModelEndpoint.azureOpenAI });
    expect(acceptOnAdd({ endpoint: EModelEndpoint.azureOpenAI })).toBe(IMAGES);
    expect(acceptOnAdd({ endpoint: EModelEndpoint.azureOpenAI, useResponsesApi: true })).toBe(
      DOCUMENTS,
    );
  });

  it('takes anything for an assistant, which offers no choice of its own', () => {
    expect(acceptOnAdd({ endpoint: EModelEndpoint.assistants })).toBe('');
  });
});

describe('what the row is called', () => {
  /* The name IS the state. A row that says "Add photos" where only pictures can
   * be read tells the reader the rule; a greyed-out "Add photos & files" makes
   * them go and find it. */
  it('says photos where only pictures can be read', () => {
    mount({ endpoint: EModelEndpoint.bedrock });
    expect(api.takes).toBe('photos');
  });

  it('says both where documents can be read too', () => {
    mount({ endpoint: 'Moonshot', endpointType: EModelEndpoint.custom });
    expect(api.takes).toBe('both');
  });

  it('says files where anything goes', () => {
    mount({ endpoint: EModelEndpoint.assistants });
    expect(api.takes).toBe('files');
  });
});

describe('the library', () => {
  it('is absent on a conversation that has not started', () => {
    mount({ conversationId: 'new', endpoint: EModelEndpoint.agents });
    expect(api.library).toBeNull();
  });

  it('is there once there is a conversation to draw on', () => {
    mount({ conversationId: 'c1', endpoint: EModelEndpoint.agents });
    expect(typeof api.library).toBe('function');
  });
});

describe('the input', () => {
  it('is rendered once, and hands its change to the file handler', () => {
    const handleFileChange = jest.fn();
    fileHandling.mockReturnValue({ handleFileChange });
    const { getAllByTestId } = mount({ endpoint: EModelEndpoint.agents });
    const inputs = getAllByTestId('file-input');
    expect(inputs).toHaveLength(1);
    inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    expect(handleFileChange).toHaveBeenCalled();
  });
});
