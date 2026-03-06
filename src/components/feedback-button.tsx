'use client'

import { usePathname } from 'next/navigation'
import { FeedbackDialog } from '@/components/feedback-dialog'
import { Button } from '@/components/ui/button'

export function FeedbackButton() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40">
      <FeedbackDialog
        defaultType="bug"
        defaultContextUrl={pathname}
        trigger={
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full shadow-md bg-white"
            title="提交反馈"
          >
            ?
          </Button>
        }
      />
    </div>
  )
}
