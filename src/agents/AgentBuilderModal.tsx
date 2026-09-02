/**
 * Defining an agent.
 *
 * Every field is one the server stores: a name, the one line other agents read,
 * the system prompt, a model out of `/v1/models`, and tool names out of
 * `/v1/tools`. Nothing here is a preference this client keeps to itself, and
 * the tool list is the catalogue the run will resolve against rather than five
 * connectors written into the page.
 *
 * A long-running agent MUST carry a cron — the scheduler would otherwise never
 * fire it — so the schedule appears with the mode and is required with it.
 */
import { Bot, Save, X } from '@hanzogui/lucide-icons-2'
import { SizableText, XStack, YStack } from '@hanzo/ui'
import { useState, type FormEvent } from 'react'

import { useModels } from '~/data/config'
import { create, useTools } from './store'

export interface AgentBuilderProps {
  isOpen: boolean
  onClose: () => void
}

const field = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.04)',
  color: '#ffffff',
  fontSize: 12.5,
  outline: 'none',
} as const

export const AgentBuilderModal = ({ isOpen, onClose }: AgentBuilderProps) => {
  const models = useModels(isOpen)
  const tools = useTools(isOpen)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [model, setModel] = useState('')
  const [chosen, setChosen] = useState<string[]>([])
  const [scheduled, setScheduled] = useState(false)
  const [schedule, setSchedule] = useState('')
  const [saving, setSaving] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)

  if (!isOpen) return null

  const served = Object.entries(models.data ?? {})
  const listed = tools.data ?? []

  const toggleTool = (toolName: string) =>
    setChosen(
      chosen.includes(toolName) ? chosen.filter((t) => t !== toolName) : [...chosen, toolName],
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setRefused(null)
    try {
      await create({
        name,
        model,
        ...(description ? { description } : {}),
        ...(instructions ? { instructions } : {}),
        ...(chosen.length ? { tools: chosen } : {}),
        ...(scheduled ? { executionMode: 'long-running', schedule } : {}),
      })
      onClose()
    } catch (failure) {
      // The server refuses a taken name, a model it does not serve and a cron it
      // cannot parse. Its reason is the useful one; this page has no better.
      setRefused(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
      onClick={onClose}
    >
      <YStack
        width="100%"
        maxWidth={680}
        maxHeight="90vh"
        borderRadius="$4"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.12)"
        backgroundColor="#0c0c0e"
        style={{ boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)', overflowY: 'auto' }}
        padding="$5"
        gap="$4"
        onClick={(e: any) => e.stopPropagation()}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap="$2.5">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Bot size={18} />
            </div>
            <YStack gap="$0.5">
              <SizableText size="$3" fontWeight="700" style={{ color: '#ffffff' }}>
                Define an Agent
              </SizableText>
              <SizableText size="$1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                A model, a system prompt, and the tools it may call.
              </SizableText>
            </YStack>
          </XStack>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </XStack>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <XStack gap="$3">
            <YStack flex={1} gap="$1.5">
              <SizableText size="$1" fontWeight="600" color="$ink">
                Name
              </SizableText>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="helper"
                pattern="[A-Za-z0-9][A-Za-z0-9._\-]{0,63}"
                title="Letters, digits, dot, dash and underscore. Up to 64 characters."
                required
                style={field}
              />
            </YStack>

            <YStack flex={1} gap="$1.5">
              <SizableText size="$1" fontWeight="600" color="$ink">
                Model
              </SizableText>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                style={{ ...field, background: '#141418' }}
              >
                <option value="">
                  {models.error ? 'The models could not be read.' : 'Choose a model'}
                </option>
                {served.map(([owner, ids]) => (
                  <optgroup key={owner} label={owner}>
                    {ids.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </YStack>
          </XStack>

          <YStack gap="$1.5">
            <SizableText size="$1" fontWeight="600" color="$ink">
              Description
            </SizableText>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="The one line another agent reads when deciding to call this one."
              style={field}
            />
          </YStack>

          <YStack gap="$1.5">
            <SizableText size="$1" fontWeight="600" color="$ink">
              System Instructions
            </SizableText>
            <textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="What the model reads before every run."
              style={{
                ...field,
                fontSize: 12,
                fontFamily: 'var(--font-mono, monospace)',
                resize: 'vertical',
              }}
            />
          </YStack>

          <YStack gap="$2">
            <SizableText size="$1" fontWeight="600" color="$ink">
              Tools it may call
            </SizableText>
            {tools.error ? (
              <SizableText size="$1" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
                The tool catalogue could not be read.
              </SizableText>
            ) : listed.length === 0 && !tools.pending ? (
              <SizableText size="$1" style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
                No tools are served to this org.
              </SizableText>
            ) : (
              <XStack gap="$2" flexWrap="wrap">
                {listed.map((tool) => {
                  const active = chosen.includes(tool.name)
                  return (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => toggleTool(tool.name)}
                      className="tap"
                      title={tool.description}
                      style={{
                        padding: '5px 9px',
                        borderRadius: 6,
                        background: active ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        border: active
                          ? '1px solid rgba(52, 211, 153, 0.35)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        color: active ? '#34d399' : 'rgba(255, 255, 255, 0.65)',
                        fontSize: 11.5,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {tool.name}
                    </button>
                  )
                })}
              </XStack>
            )}
          </YStack>

          <YStack gap="$2">
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={scheduled}
                onChange={(e) => setScheduled(e.target.checked)}
              />
              <span>Run on a schedule</span>
            </label>
            {scheduled && (
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="0 * * * *"
                required
                style={{ ...field, fontFamily: 'var(--font-mono, monospace)' }}
              />
            )}
          </YStack>

          {refused && (
            <SizableText size="$1" style={{ fontSize: 11.5, color: '#f87171' }}>
              {refused}
            </SizableText>
          )}

          <XStack justifyContent="flex-end" gap="$2" paddingTop="$3">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tap"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 16px',
                borderRadius: 6,
                background: '#ffffff',
                border: 'none',
                color: '#000000',
                fontSize: 12,
                fontWeight: 600,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Save size={13} />
              <span>{saving ? 'Defining…' : 'Define Agent'}</span>
            </button>
          </XStack>
        </form>
      </YStack>
    </div>
  )
}
