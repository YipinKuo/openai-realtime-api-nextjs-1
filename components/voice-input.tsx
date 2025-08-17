"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Type declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

interface VoiceInputProps {
  onVoiceInput: (text: string) => void
  disabled?: boolean
  isTTSLoading?: boolean
  className?: string
}

export function VoiceInput({ 
  onVoiceInput, 
  disabled = false, 
  isTTSLoading = false,
  className 
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)
  const lastStartMethodRef = useRef<"click" | "longPress" | null>(null)
  const suppressNextClickRef = useRef<boolean>(false)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'zh-TW' // Chinese Traditional

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ""
        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript)
        } else {
          setTranscript(interimTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        stopRecording()
      }

      recognitionRef.current.onend = () => {
        if (isRecording) {
          // Restart recognition if still recording
          recognitionRef.current?.start()
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [isRecording])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsProcessing(true)

      // Stop speech recognition
      recognitionRef.current?.stop()

      // Clear recording timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }

      // Process the transcript
      if (transcript.trim()) {
        onVoiceInput(transcript.trim())
      }
      
      setTranscript("")
      setRecordingTime(0)
      setIsProcessing(false)
    }
  }, [isRecording, transcript, onVoiceInput])

  const startLongPressTimer = () => {
    setIsLongPressing(true)
    longPressTimerRef.current = setTimeout(() => {
      startRecording("longPress")
      // Prevent the subsequent click event from toggling state
      suppressNextClickRef.current = true
    }, 500) // 500ms long press threshold
  }

  const stopLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsLongPressing(false)
  }

  const startRecording = async (method: "click" | "longPress") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      setTranscript("")
      lastStartMethodRef.current = method

      // Start speech recognition
      recognitionRef.current?.start()

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error starting recording:', error)
      setIsRecording(false)
    }
  }

  const handleMouseDown = () => {
    if (!disabled && !isRecording) {
      startLongPressTimer()
    }
  }

  const handleMouseUp = () => {
    stopLongPressTimer()
    if (isRecording && lastStartMethodRef.current === "longPress") {
      stopRecording()
    }
  }

  const handleMouseLeave = () => {
    stopLongPressTimer()
    if (isRecording && lastStartMethodRef.current === "longPress") {
      stopRecording()
    }
  }

  const handleTouchStart = () => {
    if (!disabled && !isRecording) {
      startLongPressTimer()
    }
  }

  const handleTouchEnd = () => {
    stopLongPressTimer()
    if (isRecording && lastStartMethodRef.current === "longPress") {
      stopRecording()
    }
  }

  const handleClick = () => {
    if (disabled || isTTSLoading) return
    // If a long-press triggered, the subsequent click should be ignored once
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }
    if (isRecording) {
      stopRecording()
    } else {
      startRecording("click")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Voice Button */}
      <div className="relative">
        <Button
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          className={cn(
            "relative transition-all duration-200",
            isRecording && "animate-pulse voice-recording",
            isLongPressing && !isRecording && "scale-110 voice-long-press",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={disabled || isTTSLoading}
        >
          {isRecording ? (
            <MicOff className="h-5 w-5" />
          ) : isTTSLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Recording time display */}
      {isRecording && !isLongPressing && (
        <div className="text-sm text-muted-foreground">
          {formatTime(recordingTime)}
        </div>
      )}

      {/* Transcript display */}
      {transcript && (
        <div className="flex-1 text-sm text-muted-foreground">
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          處理中...
        </div>
      )}
    </div>
  )
} 