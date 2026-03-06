'use client'

import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { cn } from '@/lib/utils'

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  className?: string
}

export function PromptEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = '请输入 Prompt...',
  className,
}: PromptEditorProps) {
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[markdown()]}
        readOnly={readOnly}
        placeholder={placeholder}
        theme="light"
        height="400px"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
      />
    </div>
  )
}