import { lexicalEditor } from '@payloadcms/richtext-lexical'

// Shared Lexical config. Import this everywhere instead of constructing a new
// lexicalEditor() per collection so the toolbar/feature set stays consistent.
export const editor = lexicalEditor()
