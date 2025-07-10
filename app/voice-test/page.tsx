'use client';

import React, { useState } from "react";
import { VoiceInput } from "@/components/voice-input";
import { TextInput } from "@/components/text-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VoiceTestPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [isTTSLoading, setIsTTSLoading] = useState(false);

  const handleVoiceInput = (text: string) => {
    setMessages(prev => [...prev, `Voice: ${text}`]);
  };

  const handleTextInput = (text: string) => {
    setMessages(prev => [...prev, `Text: ${text}`]);
  };

  const simulateTTSLoading = () => {
    setIsTTSLoading(true);
    setTimeout(() => setIsTTSLoading(false), 3000);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">Voice Input Test</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Voice Input Test */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Input Component</CardTitle>
            <CardDescription>
              Test the voice input functionality with long press recording
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <VoiceInput 
              onVoiceInput={handleVoiceInput}
              isTTSLoading={isTTSLoading}
            />
            <div className="text-sm text-muted-foreground">
              <p>• Long press (500ms) to start recording</p>
              <p>• Release to stop and process</p>
              <p>• Shows loading indicator during TTS</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={simulateTTSLoading}
            >
              Simulate TTS Loading
            </Button>
          </CardContent>
        </Card>

        {/* Text Input Test */}
        <Card>
          <CardHeader>
            <CardTitle>Text Input Component</CardTitle>
            <CardDescription>
              Test the combined text and voice input
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TextInput 
              onSubmit={handleTextInput}
              isTTSLoading={isTTSLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Messages Display */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            Messages received from voice and text input
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No messages yet. Try using voice or text input above.
              </p>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-muted rounded-lg text-sm"
                >
                  {message}
                </div>
              ))
            )}
          </div>
          {messages.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setMessages([])}
              className="mt-4"
            >
              Clear Messages
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 