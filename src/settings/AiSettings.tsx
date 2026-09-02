/**
 * AI & Agent Swarm Settings Tab.
 */
import { Paragraph, SizableText, Switch, XStack, YStack } from '@hanzo/ui'
import { row, rows } from '@hanzo/ui/glass'
import { useState } from 'react'

export function AiSettings() {
  const [instructions, setInstructions] = useState(
    'You are a senior full-stack AI engineer specializing in Next.js 16, React 19, TypeScript, and sub-millisecond ZAP binary microservices.',
  )
  const [temperature, setTemperature] = useState(0.7)
  const [reasoning, setReasoning] = useState(true)
  const [zapStream, setZapStream] = useState(true)
  const [maxTokens, setMaxTokens] = useState('8192')

  return (
    <YStack rowGap="$5" paddingVertical="$2">
      {/* Custom System Prompt */}
      <YStack rowGap="$2">
        <SizableText fontSize="$3" fontWeight="600" color="$color">
          Custom System Instructions
        </SizableText>
        <Paragraph fontSize="$1" color="$color11">
          Provide baseline persona rules and context prepended to every swarm conversation turn.
        </Paragraph>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            fontSize: 12,
            fontFamily: 'sans-serif',
            lineHeight: 1.5,
            outline: 'none',
            resize: 'vertical',
          }}
        />
      </YStack>

      {/* Model Parameters */}
      <YStack {...rows}>
        {/* Temperature */}
        <XStack {...row}>
          <YStack minWidth={0} rowGap="$1" flex={1}>
            <SizableText fontSize="$3" fontWeight="500" color="$color">
              Temperature ({temperature})
            </SizableText>
            <Paragraph fontSize="$1" color="$color11">
              Controls randomness. Lower values are deterministic and precise; higher values are creative.
            </Paragraph>
          </YStack>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            style={{ width: 120, accentColor: '#34d399', cursor: 'pointer' }}
          />
        </XStack>

        {/* Deep Reasoning */}
        <XStack {...row}>
          <YStack minWidth={0} rowGap="$1">
            <SizableText fontSize="$3" fontWeight="500" color="$color">
              Deep Reasoning & Chain-of-Thought
            </SizableText>
            <Paragraph fontSize="$1" color="$color11">
              Stream structured agentic thoughts before returning the synthesized response.
            </Paragraph>
          </YStack>
          <Switch checked={reasoning} onCheckedChange={setReasoning} />
        </XStack>

        {/* ZAP Protocol Streaming */}
        <XStack {...row}>
          <YStack minWidth={0} rowGap="$1">
            <SizableText fontSize="$3" fontWeight="500" color="$color">
              ZAP Zero-Allocation Stream (0.18ms p99)
            </SizableText>
            <Paragraph fontSize="$1" color="$color11">
              Enable sub-millisecond memory-pooled binary token streaming.
            </Paragraph>
          </YStack>
          <Switch checked={zapStream} onCheckedChange={setZapStream} />
        </XStack>

        {/* Max Context Output Tokens */}
        <XStack {...row}>
          <YStack minWidth={0} rowGap="$1">
            <SizableText fontSize="$3" fontWeight="500" color="$color">
              Max Generation Tokens
            </SizableText>
            <Paragraph fontSize="$1" color="$color11">
              Maximum completion tokens generated per request.
            </Paragraph>
          </YStack>
          <select
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#34d399',
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="4096">4,096 tokens</option>
            <option value="8192">8,192 tokens</option>
            <option value="16384">16,384 tokens</option>
            <option value="32768">32,768 tokens</option>
          </select>
        </XStack>
      </YStack>
    </YStack>
  )
}
