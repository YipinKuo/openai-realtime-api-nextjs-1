"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TextInputProps {
  onSubmit: (text: string) => void
  disabled?: boolean
}

export function TextInput({ onSubmit, disabled = false }: TextInputProps) {
  const [text, setText] = useState("")
  const [hints, setHints] = useState<string[]>([])

  useEffect(() => {
    const handleShowHints = (event: CustomEvent) => {
      console.log('showHints event received:', event.detail)
      setHints(event.detail.hints || [])
    }

    window.addEventListener('showHints', handleShowHints as EventListener)
    
    return () => {
      window.removeEventListener('showHints', handleShowHints as EventListener)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onSubmit(text.trim())
      setText("")
    }
  }

  const handleHintClick = (hint: string) => {
    onSubmit(hint)
    setHints([]) // Clear hints after selection
  }

  const clearHints = () => {
    setHints([])
  }

  return (
    <div className="w-full space-y-3">
      {/* Hint buttons */}
      {hints.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">快速回覆:</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearHints}
              className="h-6 px-2 text-xs"
            >
              關閉
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {hints.map((hint, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleHintClick(hint)}
              >
                {hint}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Text input form */}
      <form onSubmit={handleSubmit} className="flex w-full gap-2">
        <Input
          type="text"
          placeholder="輸入訊息..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={disabled || !text.trim()}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
