'use client';

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { VoiceInput } from "@/components/voice-input";

export default function CustomPage() {
  const [value, setValue] = useState("");
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      // Redirect to /live with conversationTopic param
      router.push(`/live?conversationTopic=${encodeURIComponent(value.trim())}`);
    }
  }

  function handleVoiceInput(text: string) {
    setValue(text);
    // Optionally auto-submit after voice input
    if (text.trim()) {
      router.push(`/live?conversationTopic=${encodeURIComponent(text.trim())}`);
    }
  }

  return (
    <div className="min-h-[300px] w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#f3e8ff] to-[#e0e7ff] rounded-2xl p-8 shadow-lg max-w-full mx-auto mt-12">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 mt-2">今天想學什麼呢？</h1>
      <p className="text-muted-foreground text-center mb-6 text-base md:text-lg">從推薦的主題選擇，或輸入你想學習的話題：</p>
      
      {/* Voice Input */}
      <div className="w-full max-w-2xl mb-4">
        <VoiceInput 
          onVoiceInput={handleVoiceInput}
          isTTSLoading={isTTSLoading}
          className="justify-center"
        />
      </div>
      
      <div className="text-center text-sm text-muted-foreground mb-4">
        或
      </div>
      
      {/* Text Input Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl flex items-center gap-2 bg-white rounded-xl shadow-md px-4 py-2">
        <Input
          className="border-0 shadow-none focus:ring-0 text-base bg-transparent flex-1"
          placeholder="e.g. 餐廳點餐"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <Button type="submit" size="icon" className="rounded-full bg-primary text-white shadow-md hover:bg-primary/90">
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
} 