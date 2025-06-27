import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Custom plugin to ensure index.d.ts is created
const ensureIndexDts = () => ({
  name: 'ensure-index-dts',
  writeBundle() {
    try {
      // Read the generated files and create index.d.ts
      const indexDtsPath = join('dist', 'index.d.ts');

      // Create index.d.ts that exports everything
      const indexDtsContent = `// Agent utilities for Hanzo Chat

export * from './types';

export declare const sleep: (ms: number) => Promise<unknown>;

export declare const EnvVar: {
  readonly CODE_API_KEY: "CODE_API_KEY";
};

export declare const Providers: {
  readonly OPENAI: "openai";
  readonly ANTHROPIC: "anthropic";
  readonly GOOGLE: "google";
  readonly AZURE: "azure";
  readonly BEDROCK: "bedrock";
  readonly VERTEXAI: "vertexai";
  readonly XAI: "xai";
  readonly OLLAMA: "ollama";
  readonly DEEPSEEK: "deepseek";
  readonly OPENROUTER: "openrouter";
};

export declare const GraphEvents: {
  readonly START: "start";
  readonly END: "end";
  readonly ERROR: "error";
  readonly MESSAGE: "message";
  readonly TOOL_END: "tool_end";
  readonly ON_RUN_STEP: "on_run_step";
  readonly ON_MESSAGE_DELTA: "on_message_delta";
  readonly ON_REASONING_DELTA: "on_reasoning_delta";
};

export declare class SplitStreamHandler {
  constructor(options?: any);
  handle(stream: any): Promise<any>;
}

export declare class CustomOpenAIClient {
  constructor(options?: any);
}

export declare const createContentAggregator: (options?: any) => {
  aggregate: (content: any) => any;
};

export declare const createCodeExecutionTool: (options?: any) => {
  name: string;
  description: string;
  execute: (code: string) => Promise<string>;
};

export declare const createSearchTool: (options?: any) => {
  name: string;
  description: string;
  execute: (query: string) => Promise<string>;
};

export declare class Run {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  
  constructor(options?: any);
  static create(options: any): Promise<Run>;
  start(): Promise<void>;
  complete(output?: any): Promise<{ run: Run; output?: any }>;
  fail(error: Error): Promise<{ run: Run; error: Error }>;
}`;

      writeFileSync(indexDtsPath, indexDtsContent);
    } catch (err) {
      console.error('Error creating index.d.ts:', err);
    }
  },
});

export default [
  // Build types.ts as a separate module
  {
    input: 'src/types.ts',
    output: [
      {
        file: 'dist/types.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/types.es.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve({
        browser: false,
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        outputToFilesystem: true,
        declaration: true,
        declarationDir: 'dist',
        exclude: ['**/*.test.ts', '**/*.spec.ts'],
      }),
      terser(),
    ],
    external: [
      'fs',
      'path',
      'crypto',
      'stream',
      'util',
      'os',
      'events',
      'http',
      'https',
      'url',
      'zlib',
      'querystring',
      'child_process',
    ],
  },
  // Build index.ts
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.es.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve({
        browser: false,
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        outputToFilesystem: true,
        declaration: true,
        declarationDir: 'dist',
        exclude: ['**/*.test.ts', '**/*.spec.ts'],
      }),
      terser(),
      ensureIndexDts(),
    ],
    external: [
      './types',
      'fs',
      'path',
      'crypto',
      'stream',
      'util',
      'os',
      'events',
      'http',
      'https',
      'url',
      'zlib',
      'querystring',
      'child_process',
    ],
  },
];
