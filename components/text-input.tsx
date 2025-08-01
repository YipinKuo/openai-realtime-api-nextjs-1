"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { VoiceInput } from "@/components/voice-input"
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom"

interface TextInputProps {
  onSubmit: (text: string) => void
  disabled?: boolean
  isTTSLoading?: boolean
  showMicrophone?: boolean
}

export function TextInput({ onSubmit, disabled = false, isTTSLoading = false, showMicrophone = true }: TextInputProps) {
  const [text, setText] = useState("")
  const [hints, setHints] = useState<string[]>([])
  const hintsRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  console.log('🎯 TextInput render - hints count:', hints.length);
  console.log('🎯 TextInput render - hintsRef.current:', !!hintsRef.current);
  console.log('🎯 TextInput render - containerRef.current:', !!containerRef.current);

  // Use the scroll hook for better scroll behavior
  const { scrollToElement } = useScrollToBottom(containerRef, [hints.length], {
    delay: 150,
    behavior: 'smooth',
    block: 'nearest'
  });

  useEffect(() => {
    const handleShowHints = (event: CustomEvent) => {
      console.log('🎯 TextInput - showHints event received:', event.detail)
      setHints(event.detail.hints || [])
    }

    window.addEventListener('showHints', handleShowHints as EventListener)
    
    return () => {
      window.removeEventListener('showHints', handleShowHints as EventListener)
    }
  }, [])

  // Scroll to hints when they appear
  useEffect(() => {
    console.log('🎯 TextInput - hints useEffect triggered, hints.length:', hints.length);
    if (hints.length > 0 && hintsRef.current) {
      console.log('🎯 TextInput - scrolling to hints');
      // Use a small delay to ensure the hints are rendered
      setTimeout(() => {
        console.log('🎯 TextInput - executing scrollToElement');
        scrollToElement(hintsRef);
      }, 100);
    }
  }, [hints.length, scrollToElement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onSubmit(text.trim())
      setText("")
    }
  }

  const handleHintClick = (hint: string) => {
    console.log('🎯 TextInput - hint clicked:', hint);
    onSubmit(hint)
    setHints([]) // Clear hints after selection
  }

  const clearHints = () => {
    console.log('🎯 TextInput - clearing hints');
    setHints([])
  }

  const handleVoiceInput = (voiceText: string) => {
    onSubmit(voiceText)
  }

  return (
    <div ref={containerRef} className="w-full space-y-3">
      {/* Hint buttons */}
      {hints.length > 0 && (
        <div ref={hintsRef} className="space-y-2">
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
      
      {/* Voice Input */}
      {showMicrophone && (
        <>
          <div className="flex justify-center">
            <VoiceInput 
              onVoiceInput={handleVoiceInput}
              disabled={disabled}
              isTTSLoading={isTTSLoading}
            />
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            或輸入文字
          </div>
        </>
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
