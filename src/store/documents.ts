// src/store/documents.ts
import { create } from 'zustand'
import type { Document } from '@/types'

interface DocumentsStore {
  documents: Document[]
  total: number
  isLoading: boolean
  setDocuments: (docs: Document[], total: number) => void
  prependDocument: (doc: Document) => void
  removeDocument: (id: string) => void
}

export const useDocumentsStore = create<DocumentsStore>((set) => ({
  documents: [],
  total: 0,
  isLoading: false,
  setDocuments: (docs, total) => set({ documents: docs, total }),
  prependDocument: (doc) =>
    set((state) => ({
      documents: [doc, ...state.documents],
      total: state.total + 1,
    })),
  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      total: state.total - 1,
    })),
}))
