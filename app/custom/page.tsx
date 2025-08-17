'use client';

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { VoiceInput } from "@/components/voice-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function CustomPage() {
  const [value, setValue] = useState("");
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogValue, setDialogValue] = useState("");
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
    setDialogValue(text);
    if (text.trim()) setIsDialogOpen(true);
  }

  function handleGoBack() {
    router.push("/categories");
  }

  return (
    <div className="max-w-full mx-auto">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={handleGoBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回主題分類
        </Button>
      </div>

      <div className="min-h-[300px] w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#f3e8ff] to-[#e0e7ff] rounded-2xl p-8 shadow-lg max-w-full mx-auto">
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

      {/* Confirm & Edit Dialog for Transcribed Topic */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認主題</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">請確認或編輯辨識到的主題內容：</p>
            <Textarea
              value={dialogValue}
              onChange={(e) => setDialogValue(e.target.value)}
              placeholder="主題內容"
              className="min-h-[120px]"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                const topic = dialogValue.trim();
                if (!topic) return;
                setIsDialogOpen(false);
                router.push(`/live?conversationTopic=${encodeURIComponent(topic)}`);
              }}
            >
              開始對話
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 