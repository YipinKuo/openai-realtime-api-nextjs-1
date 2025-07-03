"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import useWebRTCAudioSession from "@/hooks/use-webrtc"
import { tools } from "@/lib/tools"
import { Welcome } from "@/components/welcome"
import { VoiceSelector } from "@/components/voice-select"
import { BroadcastButton } from "@/components/broadcast-button"
import { StatusDisplay } from "@/components/status"
import { TokenUsageDisplay } from "@/components/token-usage"
import { MessageControls } from "@/components/message-controls"
import { ToolsEducation } from "@/components/tools-education"
import { TextInput } from "@/components/text-input"
import { motion } from "framer-motion"
import { useToolsFunctions } from "@/hooks/use-tools"
import { Badge } from "@/components/ui/badge"

interface Topic {
  id: string;
  Name?: string;
  name?: string;
  Description?: string;
  Emoji?: string;
}

// Conversation topics and parties are now just string arrays

const App: React.FC = () => {
  // State for voice selection
  const [voice, setVoice] = useState("ash")
  
  // Get URL search parameters
  const searchParams = useSearchParams()
  const topicId = searchParams.get('topicId')
  const level = searchParams.get('level')
  const conversationTopicsParam = searchParams.get('conversationTopics')
  const conversationPartiesParam = searchParams.get('conversationParties')
  
  // State for topic data
  const [topic, setTopic] = useState<Topic | null>(null)
  const [isLoadingTopic, setIsLoadingTopic] = useState(false)
  const [selectedConversationTopics, setSelectedConversationTopics] = useState<string[]>([])
  const [selectedConversationParties, setSelectedConversationParties] = useState<string[]>([])

  // Fetch topic data and parse params as string arrays
  useEffect(() => {
    if (topicId) {
      setIsLoadingTopic(true)
      fetch('/api/options')
        .then(response => response.json())
        .then(data => {
          if (topicId) {
            const foundTopic = data.topics?.find((t: Topic) => t.id === topicId)
            if (foundTopic) {
              setTopic(foundTopic)
            }
          }
        })
        .catch(error => {
          console.error('Error fetching options:', error)
        })
        .finally(() => {
          setIsLoadingTopic(false)
        })
    }
    // Parse conversation topics and parties as string arrays
    if (conversationTopicsParam) {
      setSelectedConversationTopics(conversationTopicsParam.split(',').map(s => s.trim()).filter(Boolean))
    }
    if (conversationPartiesParam) {
      setSelectedConversationParties(conversationPartiesParam.split(',').map(s => s.trim()).filter(Boolean))
    }
  }, [topicId, conversationTopicsParam, conversationPartiesParam])

  // Get topic name for display and instruction generation
  const topicName = topic?.Name || topic?.name || null

  // WebRTC Audio Session Hook with dynamic parameters
  const {
    status,
    isSessionActive,
    registerFunction,
    handleStartStopClick,
    msgs,
    conversation,
    sendTextMessage
  } = useWebRTCAudioSession({
    voice,
    tools,
    level: level || undefined,
    topicName: topicName || undefined,
    conversationTopics: selectedConversationTopics,
    conversationParties: selectedConversationParties
  })

  // Get all tools functions
  const toolsFunctions = useToolsFunctions();

  useEffect(() => {
    // Register all functions by iterating over the object
    Object.entries(toolsFunctions).forEach(([name, func]) => {
      const functionNames: Record<string, string> = {
        timeFunction: 'getCurrentTime',
        backgroundFunction: 'changeBackgroundColor',
        partyFunction: 'partyMode',
        launchWebsite: 'launchWebsite', 
        copyToClipboard: 'copyToClipboard',
        scrapeWebsite: 'scrapeWebsite'
      };
      
      registerFunction(functionNames[name], func);
    });
  }, [registerFunction, toolsFunctions])

  return (
    <main className="h-full">
      <motion.div 
        className="container flex flex-col items-center justify-center mx-auto max-w-3xl my-20 p-12 border rounded-lg shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* <Welcome /> */}
        
        {/* Display topic and level info if available */}
        {(topic || level || selectedConversationTopics.length > 0 || selectedConversationParties.length > 0) && (
          <motion.div 
            className="mb-6 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {topic && (
              <div className="flex items-center justify-center gap-2 mb-2">
                {topic.Emoji && <span className="text-2xl">{topic.Emoji}</span>}
                <h1 className="text-2xl font-bold">{topicName}</h1>
              </div>
            )}
            
            {level && (
              <div className="text-sm text-muted-foreground mb-2">
                Level: {level.charAt(0).toUpperCase() + level.slice(1)}
              </div>
            )}
            
            {topic?.Description && (
              <div className="text-sm text-muted-foreground mb-3">
                {topic.Description}
              </div>
            )}
            
            {/* Display selected conversation topics */}
            {selectedConversationTopics.length > 0 && (
              <div className="mb-3">
                <div className="text-sm font-medium text-muted-foreground mb-1">Conversation Topics:</div>
                <div className="flex flex-wrap justify-center gap-1">
                  {selectedConversationTopics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Display selected conversation parties */}
            {selectedConversationParties.length > 0 && (
              <div className="mb-3">
                <div className="text-sm font-medium text-muted-foreground mb-1">Conversation Parties:</div>
                <div className="flex flex-wrap justify-center gap-1">
                  {selectedConversationParties.map((party) => (
                    <Badge key={party} variant="outline" className="text-xs">
                      {party}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
        
        <motion.div 
          className="w-full max-w-md bg-card text-card-foreground rounded-xl border shadow-sm p-6 space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <VoiceSelector value={voice} onValueChange={setVoice} />
          
          <div className="flex flex-col items-center gap-4">
            <BroadcastButton 
              isSessionActive={isSessionActive} 
              onClick={handleStartStopClick}
            />
          </div>
          {msgs.length > 4 && <TokenUsageDisplay messages={msgs} />}
          {status && (
            <motion.div 
              className="w-full flex flex-col gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MessageControls conversation={conversation} msgs={msgs} />
              <TextInput 
                onSubmit={sendTextMessage}
                disabled={!isSessionActive}
              />
            </motion.div>
          )}
        </motion.div>
        
        {status && <StatusDisplay status={status} />}
        <div className="w-full flex flex-col items-center gap-4">
          <ToolsEducation />
        </div>
      </motion.div>
    </main>
  )
}

export default App; 