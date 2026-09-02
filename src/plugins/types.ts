/**
 * Plugins and Extensions Marketplace Types.
 */
export interface PluginExtension {
  id: string
  name: string
  version: string
  author: string
  description: string
  iconName: string
  category: 'devtools' | 'database' | 'security' | 'ai' | 'cloud'
  installed: boolean
  enabled: boolean
  downloads: string
  rating: number
}
