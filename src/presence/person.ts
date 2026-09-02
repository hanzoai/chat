/**
 * Reading a SCIM person for the screen.
 *
 * A `Person` carries `id` ("<org>/<name>"), `name` (the login), an optional
 * `displayName` and `email`, `active`, `service` and `admin`. Everything a row
 * shows is one of those; nothing here invents a field.
 */
import type { Person } from '@hanzo/ai'

/** What to call somebody. The login is the fallback, never a placeholder. */
export const label = (person: Person): string => person.displayName || person.name

/** The letter an avatar shows. */
export const initial = (person: Person): string => label(person).charAt(0).toUpperCase()

/**
 * An avatar's tint.
 *
 * Presentation, derived from the id so it is stable across reads and equal on
 * every surface. IAM sends no colour, and picking one per render would make the
 * same teammate a different person in the header and in the roster.
 */
export const tint = (person: Person): string => {
  let hue = 0
  for (let i = 0; i < person.id.length; i++) hue = (hue * 31 + person.id.charCodeAt(i)) % 360
  return `hsl(${hue} 58% 62%)`
}
