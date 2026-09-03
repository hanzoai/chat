import { ModelSelector } from '@hanzo/ui/models'
import { useMemo } from 'react'

import { origins } from '../data/origin'
import type { Served } from '../data/types'
import { catalog } from './models'

/**
 * Which model answers — one control, every surface that asks.
 *
 * `ModelSelector` is the picker itself: family-grouped, searchable past ten
 * entries, keyboard-navigable, and styled in tokens. Nothing about that is
 * chat's, so none of it lives here. What IS chat's is the shape the server
 * answers in, so this is the mapping (`./models`) and the picker, together, and
 * the composer's toolbar and the General tab mount the same component rather
 * than two pickers fed from two readings of one catalog.
 *
 * It stays presentational: hand it what was fetched, take back an address.
 */
export interface ModelProps {
  models?: Served | null
  /** The chosen address — `origin/model`, from `catalog`. */
  value?: string
  onChange: (id: string) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  placeholder?: string
}

export function Model({
  models,
  value,
  onChange,
  disabled,
  size,
  placeholder,
}: ModelProps) {
  const list = useMemo(() => catalog(models, origins()), [models])

  return (
    <ModelSelector
      models={list}
      value={value}
      onChange={onChange}
      disabled={disabled}
      size={size}
      placeholder={placeholder}
    />
  )
}

export default Model
