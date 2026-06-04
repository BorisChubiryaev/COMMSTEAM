'use client'

import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

type MarkdownContentProps = {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn('markdown-content text-sm leading-relaxed', className)}>
      <ReactMarkdown
        components={{
          a: ({ className, ...props }) => (
            <a
              className={cn('text-[#007f6f] underline underline-offset-2 hover:text-[#006b5d]', className)}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ className, ...props }) => (
            <code
              className={cn('rounded bg-[var(--comic-tag-bg)] px-1 py-0.5 font-mono text-[0.9em]', className)}
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
