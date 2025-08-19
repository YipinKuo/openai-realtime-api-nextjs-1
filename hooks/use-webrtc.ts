"use client";

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { Conversation } from "@/lib/conversations";
import { useTranslations } from "@/components/translations-context";

export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

interface ConversationOption {
  id: string;
  Name?: string;
  Description?: string;
  [key: string]: any;
}

interface UseWebRTCAudioSessionParams {
  voice: string;
  tools?: Tool[];
  level?: string;
  topicName?: string;
  conversationTopics?: string[];
  conversationParties?: string[];
  subtopic?: { id?: string; name?: string; description?: string };
}

/**
 * The return type for the hook, matching Approach A
 * (RefObject<HTMLDivElement | null> for the audioIndicatorRef).
 */
interface UseWebRTCAudioSessionReturn {
  status: string;
  isSessionActive: boolean;
  isTTSLoading: boolean;
  audioIndicatorRef: React.RefObject<HTMLDivElement | null>;
  startSession: () => Promise<void>;
  stopSession: () => void;
  handleStartStopClick: () => Promise<void>;
  registerFunction: (name: string, fn: Function) => void;
  msgs: any[];
  currentVolume: number;
  conversation: Conversation[];
  sendTextMessage: (text: string) => void;
  countdownSeconds: number | null;
}

/**
 * Hook to manage a real-time session with OpenAI's Realtime endpoints.
 */
export default function useWebRTCAudioSession(
  params: UseWebRTCAudioSessionParams,
): UseWebRTCAudioSessionReturn {
  const { voice, tools, level, topicName, conversationTopics, conversationParties, subtopic } = params;
  const { t, locale } = useTranslations();
  const router = useRouter();
  // Connection/session states
  const [status, setStatus] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);

  // Audio references for local mic
  // Approach A: explicitly typed as HTMLDivElement | null
  const audioIndicatorRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // WebRTC references
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Keep track of all raw events/messages
  const [msgs, setMsgs] = useState<any[]>([]);

  // Main conversation state
  const [conversation, setConversation] = useState<Conversation[]>([]);

  // For function calls (AI "tools")
  const functionRegistry = useRef<Record<string, Function>>({});

  // Volume analysis (assistant inbound audio)
  const [currentVolume, setCurrentVolume] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  // Timeout tracking for assistant responses
  const lastAssistantResponseRef = useRef<number | null>(null);
  const responseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  /**
   * We track only the ephemeral user message **ID** here.
   * While user is speaking, we update that conversation item by ID.
   */
  const ephemeralUserMessageIdRef = useRef<string | null>(null);

  // Template definitions
  const BEGINNER_TEMPLATE = `你是一位友善耐心的對話夥伴，幫助初學者練習「{{topic}}」主題下的情境對話，並根據子主題（如有）和角色設定靈活調整。

{{roleplay_context}}

請嚴格遵循以下原則：
- 直接以角色身份開始對話，不要解釋場景設定，直接問第一個問題。
- 每次回應後，根據當前情境，動態產生8-12個多樣且實用的建議回覆（hints），涵蓋常見回應、提問、猶豫、需求、偏好、疑問等，幫助學習者自然參與對話。
- 當學習者做出選擇時，請根據情境給予細緻的追問或說明（如詢問細節、偏好、後續步驟等）。
- 當學習者表示不確定或猶豫時，請主動用一連串具體問題引導對方思考與決定（如詢問偏好、需求、目標等），並根據回覆給出個人化建議。
- 對話要持續推進，回覆自然貼近真實互動，並根據學習者回應靈活調整，不要讓對話中斷。
- 只使用最常見、最簡單的單字和文法，說話慢且清楚，重點句子請學習者跟著你大聲重複，多給鼓勵。

【範例】
假設主題是「醫院看診」，角色是「病人」與「醫生」：
醫生：Good morning! I'm Dr. Lee. What brings you in today?
建議回覆："I have a headache."、"It's just a check-up."、"I've been coughing."、"Can you check my blood pressure?"、"I'm not sure how to describe it."、"I feel dizzy sometimes."、"Do I need any tests?"、"Is it serious?"、"Can I get some medicine?"、"How long will it take to recover?"、"I'm allergic to penicillin."、"I have diabetes."

如果學習者說"I have a headache."，醫生應追問：
"I'm sorry to hear that. How long have you had the headache? Is it sharp or dull? Does anything make it better or worse?"

如果學習者說"I'm not sure how to describe it."，醫生應引導：
"No problem! Let me ask a few questions: Where exactly does it hurt? Is the pain constant or does it come and go? Do you have any other symptoms, like fever or nausea?"

請直接開始對話，不需要說明規則或角色扮演設定。

請注意：建議回覆（hints）只能透過 showHints() 函數提供，請勿在主要訊息中重複列出或說明這些選項，也不需告知使用者如何使用 hints，因為使用者已經知道。
請務必在每一次回應後都使用 showHints() 函數提供 8-12 個與當前情境相關的建議回覆（hints），不可省略。

在每次呼叫 showHints() 之後，請用目標語言（如英文）說一句簡短自然的鼓勵語，鼓勵使用者繼續對話，例如：「Feel free to choose a reply below!」或「Let me know how you'd like to respond.」。不要解釋 hints 是什麼，也不要說明如何使用 hints。`;

  const INTERMEDIATE_TEMPLATE = `你是一位專業對話夥伴，協助中級學習者在「{{topic}}」主題下進行情境對話，根據子主題和角色靈活調整。

{{roleplay_context}}

請嚴格遵循以下原則：
- 直接以角色身份開始對話，不要解釋場景設定，直接問第一個問題。
- 每次回應後，根據情境動態產生8-12個多樣且實用的建議回覆（hints），涵蓋常見回應、提問、猶豫、需求、偏好、疑問等，鼓勵學習者主動參與。
- 當學習者做出選擇時，根據情境給予細緻追問、說明或延伸討論。
- 當學習者猶豫或不確定時，主動用一連串具體問題引導思考與決定，並給出個人化建議。
- 對話要持續推進，回覆自然貼近真實互動，根據學習者回應靈活調整。
- 使用自然但清楚的英文，句型和單字可多樣，並在情境中自然引入新單字或文法，必要時簡短說明。
- 鼓勵學習者用自身經驗或想法回答，並主動提問或延伸對話。
- 當學習者犯錯時，簡短說明並溫和糾正。

【範例】
主題「租房」，角色「房東」與「租客」：
房東：Hi there! This is a two-bedroom unit with a spacious living room and a balcony. Do you have any questions about the place, or would you like to see the kitchen first?
建議回覆："How much is the rent?"、"Is the apartment furnished?"、"Can I bring a pet?"、"What is the neighborhood like?"、"How long is the lease?"、"Can I move in next month?"、"Is there parking?"、"Are utilities included?"、"Can I see the bedroom?"、"Is there air conditioning?"、"What is the deposit?"、"Can I negotiate the price?"

如果學習者說"How much is the rent?"，房東應回覆：
"The rent is $1,200 per month, including water and internet. Electricity is separate. Would you like to know more about the lease terms or see the contract?"

如果學習者說"I'm not sure if I want to live here yet."，房東應引導：
"That's totally fine! What are your main priorities in a new home? Do you prefer a quiet neighborhood, or is being close to public transport more important?"

請直接開始對話，不需要說明規則或角色扮演設定。

請注意：建議回覆（hints）只能透過 showHints() 函數提供，請勿在主要訊息中重複列出或說明這些選項，也不需告知使用者如何使用 hints，因為使用者已經知道。
請務必在每一次回應後都使用 showHints() 函數提供 8-12 個與當前情境相關的建議回覆（hints），不可省略。

在每次呼叫 showHints() 之後，請用目標語言（如英文）說一句簡短自然的鼓勵語，鼓勵使用者繼續對話，例如：「Feel free to choose a reply below!」或「Let me know how you'd like to respond.」。不要解釋 hints 是什麼，也不要說明如何使用 hints。`;

  const ADVANCED_TEMPLATE = `你是一位高級對話夥伴，協助高級學習者在「{{topic}}」主題下進行專業、複雜的情境對話，根據子主題和角色靈活調整。

{{roleplay_context}}

請嚴格遵循以下原則：
- 直接以角色身份開始對話，不要解釋場景設定，直接問第一個問題。
- 每次回應後，根據情境動態產生8-12個多樣且高階的建議回覆（hints），涵蓋專業回應、深入提問、猶豫、需求、偏好、疑問、批判性思考等，鼓勵學習者挑戰自我。
- 當學習者做出選擇時，根據情境給予細緻追問、專業討論或延伸分析。
- 當學習者猶豫或不確定時，主動用一連串具體且高階的問題引導思考與決策，並給出專業建議。
- 對話要持續推進，回覆自然貼近真實專業互動，根據學習者回應靈活調整。
- 使用複雜、道地、專業的英文，包括慣用語、成語和高階文法，並鼓勵學習者使用高階詞彙、文化參考與地道表達。
- 模擬真實世界的挑戰情境（如談判、辯論、緊急狀況、專業會議等），鼓勵學習者表達意見、解決問題、應對突發狀況。
- 給予詳細回饋，要求學習者追求語言的精確與細膩。

【範例】
主題「商業會議」，角色「專案經理」與「團隊成員」：
專案經理：Good morning, everyone. What do you think were our biggest challenges last quarter, and how can we address them moving forward?
建議回覆："I believe our main challenge was resource allocation."、"We need to improve cross-team communication."、"Can we discuss the new project timeline?"、"What are the client's main concerns?"、"How can we optimize our workflow?"、"I think we should invest in new tools."、"Can we get more data on user feedback?"、"What are the risks for the next quarter?"、"How do we prioritize tasks?"、"Can we schedule a follow-up meeting?"、"What is the budget for the new project?"、"How do we measure success?"

如果學習者說"I believe our main challenge was resource allocation."，專案經理應追問：
"That's a great point. Can you elaborate on which resources were most limited, and how that impacted our deliverables? Do you have any suggestions for improvement?"

如果學習者說"I'm not sure what the main challenge was."，專案經理應引導：
"No worries! Let's break it down: Did you notice any bottlenecks in the workflow? Were there any recurring issues in communication or deadlines?"

請直接開始對話，不需要說明規則或角色扮演設定。

請注意：建議回覆（hints）只能透過 showHints() 函數提供，請勿在主要訊息中重複列出或說明這些選項，也不需告知使用者如何使用 hints，因為使用者已經知道。
請務必在每一次回應後都使用 showHints() 函數提供 8-12 個與當前情境相關的建議回覆（hints），不可省略。

在每次呼叫 showHints() 之後，請用目標語言（如英文）說一句簡短自然的鼓勵語，鼓勵使用者繼續對話，例如：「Feel free to choose a reply below!」或「Let me know how you'd like to respond.」。不要解釋 hints 是什麼，也不要說明如何使用 hints。`;

  /**
   * Register a function (tool) so the AI can call it.
   */
  function registerFunction(name: string, fn: Function) {
    functionRegistry.current[name] = fn;
  }

  /**
   * Resolve topic name from params or URL (fallback).
   */
  function getQueryParam(name: string): string | undefined {
    if (typeof window === 'undefined') return undefined;
    const value = new URLSearchParams(window.location.search).get(name);
    return value ? value.trim() : undefined;
  }

  function getTopicFromUrl(): string | undefined {
    // Topic-related params (exclude customOption here; it will be handled separately)
    return (
      getQueryParam('subtopicName') ||
      getQueryParam('section') ||
      undefined
    );
  }

  function getCustomOptionFromUrl(): string | undefined {
    return getQueryParam('customOption');
  }

  function resolveTopicName(): string | undefined {
    const fromParams = topicName && topicName.trim() ? topicName.trim() : undefined;
    const fromArray = conversationTopics && conversationTopics.length > 0 ? conversationTopics[0] : undefined;
    const fromUrl = getTopicFromUrl();
    return fromParams || fromArray || fromUrl || undefined;
  }

  function buildTopicPhrase(): string {
    const name = resolveTopicName();
    if (!name) return 'conversation';
    return name.toLowerCase() === 'conversation' ? 'conversation' : `${name} conversation`;
  }

  /**
   * Generate instruction text based on level and topic
   */
  function generateInstructionText(): string {
    // Use params, then conversationTopics, then URL as fallback
    const effectiveTopicName = resolveTopicName();

    // Use provided level, or default to 'beginner' if missing
    const usedLevel = level || 'beginner';

    // Debug logging
    console.log("[generateInstructionText] level:", level);
    console.log("[generateInstructionText] usedLevel:", usedLevel);
    console.log("[generateInstructionText] topicName:", topicName);
    console.log("[generateInstructionText] conversationTopics:", conversationTopics);
    console.log("[generateInstructionText] effectiveTopicName:", effectiveTopicName);

    // Default fallback text if no topic provided
    const defaultText = ``;

    if (!effectiveTopicName) {
      console.log("[generateInstructionText] Returning defaultText (empty string) - no topic");
      return defaultText;
    }

    let template: string;
    switch (usedLevel) {
      case 'beginner':
        template = BEGINNER_TEMPLATE;
        break;
      case 'intermediate':
        template = INTERMEDIATE_TEMPLATE;
        break;
      case 'advanced':
        template = ADVANCED_TEMPLATE;
        break;
      default:
        console.log("[generateInstructionText] Unknown level, returning defaultText");
        return defaultText;
    }

    // Replace {{topic}} placeholder with actual topic name
    let instruction = template.replace(/\{\{topic\}\}/g, effectiveTopicName);

    // If subtopic context is present, add it to the instruction
    if (subtopic && (subtopic.name || subtopic.description)) {
      instruction = `【子主題】${subtopic.name || ''}${subtopic.description ? '：' + subtopic.description : ''}\n` + instruction;
    }

    // Generate roleplay context based on conversation topic and party
    let roleplayContext = "";
    if (conversationTopics && conversationTopics.length > 0 && conversationParties && conversationParties.length > 0) {
      const topic = conversationTopics[0]; // Single topic
      const party = conversationParties[0]; // Single party
      roleplayContext = `角色扮演設定：學習者扮演「${party}」的角色，你將與他討論「${topic}」相關的內容。請根據這個角色設定來調整你的回應和語氣。`;
    } else if (conversationTopics && conversationTopics.length > 0) {
      const topic = conversationTopics[0];
      roleplayContext = `對話重點：請專注於「${topic}」相關的內容進行討論。`;
    } else if (conversationParties && conversationParties.length > 0) {
      const party = conversationParties[0];
      roleplayContext = `角色扮演設定：學習者扮演「${party}」的角色，請根據這個角色來調整你的回應。`;
    }

    // Replace {{roleplay_context}} placeholder
    instruction = instruction.replace(/\{\{roleplay_context\}\}/g, roleplayContext);

    // --- Custom: If user came from /custom or URL contains topic-like params, prepend a special instruction ---
    const customTopic = effectiveTopicName || (conversationTopics && conversationTopics.length > 0 ? conversationTopics[0] : undefined);
    const customOption = getCustomOptionFromUrl();
    if (customTopic) {
      instruction = `The user wants to practice the following topic: "${customTopic}". Please focus the conversation on this topic.\n\n` + instruction;
    }
    if (customOption) {
      instruction = `Additionally, the user's custom option is: "${customOption}". This should be treated as the primary focus when shaping scenarios, examples, and questions.\n\n` + instruction;
    }
    // -------------------------------------------------------------

    // Add hint functionality instructions to all templates
    instruction += `

IMPORTANT: After each of your responses, provide helpful conversation hints to guide the user. Use the showHints tool to display 8-12 relevant quick reply options that would naturally continue the conversation. These hints should be:
- Contextually relevant to what you just discussed
- Helpful for language learning (questions, follow-ups, or practice opportunities)
- Short and clear
- In the same language as your conversation
- Only shown through the showHints() function, not repeated or listed in your main message
- Do NOT inform the user about the hints or how to use them; the user already knows
- Always use the showHints() function to provide 8-12 contextually relevant hints after every response, without exception.

For example, after discussing food preferences, you might show hints like: "What's your favorite?", "Tell me more", "Ask about prices", "Practice ordering". This helps users continue the conversation naturally and practice their language skills.`;

    // Also, add to each template:
    // "請注意：建議回覆（hints）只能透過 showHints() 函數提供，請勿在主要訊息中重複列出或說明這些選項，也不需告知使用者如何使用 hints，因為使用者已經知道。"

    console.log("[generateInstructionText] Final instruction:", instruction);
    return instruction;
  }

  /**
   * Configure the data channel on open, sending a session update to the server.
   * This function triggers the AI to speak first by:
   * 1. Sending session configuration
   * 2. Sending instruction text as a system message first
   * 3. Sending an initial user message to trigger AI response
   * 4. Sending response.create to start the AI's response
   */
  function configureDataChannel(dataChannel: RTCDataChannel) {
    console.log("configureDataChannel");
    // Send session update
    const sessionUpdate = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        tools: tools || [],
        // turn_detection: {
        //   type: "semantic_vad",
        //   eagerness: "low",
        // }
      },
    };
    dataChannel.send(JSON.stringify(sessionUpdate));

    console.log("Session update sent:", sessionUpdate);
    console.log("Setting locale: " + t("language") + " : " + locale);

    // Send the instruction text as a system message first
    const instructionMessage = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            text: generateInstructionText(),
          },
        ],
      },
    };
    console.log("Instruction message:", instructionMessage);
    dataChannel.send(JSON.stringify(instructionMessage));

    // Send initial conversation item to trigger AI to speak first
    const effectiveTopicName = resolveTopicName() || "conversation";
    const customOption = getCustomOptionFromUrl();
    const topicPhrase = customOption
      ? `${customOption} conversation`
      : buildTopicPhrase();
    const initialMessage = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Hello, I'm ready to start our ${topicPhrase}. Please begin by introducing yourself and starting the conversation.`,
          },
        ],
      },
    };
    console.log("Initial message to trigger AI:", initialMessage);
    dataChannel.send(JSON.stringify(initialMessage));

    // Send response.create to trigger the AI response
    const responseCreate = {
      type: "response.create",
    };
    dataChannel.send(JSON.stringify(responseCreate));
  }

  /**
   * Return an ephemeral user ID, creating a new ephemeral message in conversation if needed.
   */
  function getOrCreateEphemeralUserId(): string {
    let ephemeralId = ephemeralUserMessageIdRef.current;
    if (!ephemeralId) {
      // Use uuidv4 for a robust unique ID
      ephemeralId = uuidv4();
      ephemeralUserMessageIdRef.current = ephemeralId;

      const newMessage: Conversation = {
        id: ephemeralId,
        role: "user",
        text: "",
        timestamp: new Date().toISOString(),
        isFinal: false,
        status: "speaking",
      };

      // Append the ephemeral item to conversation
      setConversation((prev) => [...prev, newMessage]);
    }
    return ephemeralId;
  }

  /**
   * Update the ephemeral user message (by ephemeralUserMessageIdRef) with partial changes.
   */
  function updateEphemeralUserMessage(partial: Partial<Conversation>) {
    const ephemeralId = ephemeralUserMessageIdRef.current;
    if (!ephemeralId) return; // no ephemeral user message to update

    setConversation((prev) =>
      prev.map((msg) => {
        if (msg.id === ephemeralId) {
          return { ...msg, ...partial };
        }
        return msg;
      }),
    );
  }

  /**
   * Clear ephemeral user message ID so the next user speech starts fresh.
   */
  function clearEphemeralUserMessage() {
    ephemeralUserMessageIdRef.current = null;
  }

  /**
   * Main data channel message handler: interprets events from the server.
   */
  async function handleDataChannelMessage(event: MessageEvent) {
    try {
      const msg = JSON.parse(event.data);
      // console.log("Incoming dataChannel message:", msg);

      switch (msg.type) {
        /**
         * User speech started
         */
        case "input_audio_buffer.speech_started": {
          // Reset countdown when user starts speaking
          if (responseTimeoutRef.current) {
            clearTimeout(responseTimeoutRef.current);
            responseTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCountdownSeconds(null);
          
          getOrCreateEphemeralUserId();
          updateEphemeralUserMessage({ status: "speaking" });
          break;
        }

        /**
         * User speech stopped
         */
        case "input_audio_buffer.speech_stopped": {
          // optional: you could set "stopped" or just keep "speaking"
          updateEphemeralUserMessage({ status: "speaking" });
          break;
        }

        /**
         * Audio buffer committed => "Processing speech..."
         */
        case "input_audio_buffer.committed": {
          updateEphemeralUserMessage({
            text: "Processing speech...",
            status: "processing",
          });
          break;
        }

        /**
         * Partial user transcription
         */
        case "conversation.item.input_audio_transcription": {
          const partialText =
            msg.transcript ?? msg.text ?? "User is speaking...";
          updateEphemeralUserMessage({
            text: partialText,
            status: "speaking",
            isFinal: false,
          });
          break;
        }

        /**
         * Final user transcription
         */
        case "conversation.item.input_audio_transcription.completed": {
          // console.log("Final user transcription:", msg.transcript);
          updateEphemeralUserMessage({
            text: msg.transcript || "",
            isFinal: true,
            status: "final",
          });
          clearEphemeralUserMessage();
          break;
        }

        /**
         * Streaming AI transcripts (assistant partial)
         */
        case "response.audio_transcript.delta": {
          // Set TTS loading to true when assistant starts speaking
          setIsTTSLoading(true);
          
          // Update last assistant response timestamp
          lastAssistantResponseRef.current = Date.now();
          
          // Clear existing timeout and countdown
          if (responseTimeoutRef.current) {
            clearTimeout(responseTimeoutRef.current);
            responseTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCountdownSeconds(null);
          
          // Set new timeout for 30 seconds
          responseTimeoutRef.current = setTimeout(() => {
            // Start countdown after 15 seconds of inactivity
            setCountdownSeconds(15);
            
            // Start countdown interval
            countdownIntervalRef.current = setInterval(() => {
              setCountdownSeconds(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                  // End conversation after 30 seconds total (15 + 15)
                  stopSession();
                  return null;
                }
                return prev - 1;
              });
            }, 1000);
          }, 15000);

          const newMessage: Conversation = {
            id: uuidv4(), // generate a fresh ID for each assistant partial
            role: "assistant",
            text: msg.delta,
            timestamp: new Date().toISOString(),
            isFinal: false,
          };

          setConversation((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === "assistant" && !lastMsg.isFinal) {
              // Append to existing assistant partial
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMsg,
                text: lastMsg.text + msg.delta,
              };
              return updated;
            } else {
              // Start a new assistant partial
              return [...prev, newMessage];
            }
          });
          break;
        }

        /**
         * Mark the last assistant message as final
         */
        case "response.audio_transcript.done": {
          // Set TTS loading to false when assistant finishes speaking
          setIsTTSLoading(false);
          
          setConversation((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1].isFinal = true;
            return updated;
          });
          break;
        }

        /**
         * AI calls a function (tool)
         */
        case "response.function_call_arguments.done": {
          const fn = functionRegistry.current[msg.name];
          if (fn) {
            const args = JSON.parse(msg.arguments);
            const result = await fn(args);

            // Respond with function output
            const response = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: msg.call_id,
                output: JSON.stringify(result),
              },
            };
            dataChannelRef.current?.send(JSON.stringify(response));

            const responseCreate = {
              type: "response.create",
            };
            dataChannelRef.current?.send(JSON.stringify(responseCreate));
          }
          break;
        }

        default: {
          // console.warn("Unhandled message type:", msg.type);
          break;
        }
      }

      // Always log the raw message
      setMsgs((prevMsgs) => [...prevMsgs, msg]);
      return msg;
    } catch (error) {
      console.error("Error handling data channel message:", error);
    }
  }

  /**
   * Fetch ephemeral token from your Next.js endpoint
   */
  async function getEphemeralToken() {
    try {
      // Get selected avatar from localStorage
      const selectedAvatar = typeof window !== 'undefined' ? localStorage.getItem('selectedAvatar') : null;

      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAvatar }),
      });
      if (!response.ok) {
        throw new Error(`Failed to get ephemeral token: ${response.status}`);
      }
      const data = await response.json();
      return data.client_secret.value;
    } catch (err) {
      console.error("getEphemeralToken error:", err);
      throw err;
    }
  }

  /**
   * Sets up a local audio visualization for mic input (toggle wave CSS).
   */
  function setupAudioVisualization(stream: MediaStream) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateIndicator = () => {
      if (!audioContext) return;
      analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      // Toggle an "active" class if volume is above a threshold
      if (audioIndicatorRef.current) {
        audioIndicatorRef.current.classList.toggle("active", average > 30);
      }
      requestAnimationFrame(updateIndicator);
    };
    updateIndicator();

    audioContextRef.current = audioContext;
  }

  /**
   * Calculate RMS volume from inbound assistant audio
   */
  function getVolume(): number {
    if (!analyserRef.current) return 0;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const float = (dataArray[i] - 128) / 128;
      sum += float * float;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  /**
   * Start a new session:
   */
  async function startSession() {
    try {
      // setStatus("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setupAudioVisualization(stream);

      // setStatus("Fetching ephemeral token...");
      const ephemeralToken = await getEphemeralToken();

      // setStatus("Establishing connection...");
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Hidden <audio> element for inbound assistant TTS
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;

      // Inbound track => assistant's TTS
      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];

        // Optional: measure inbound volume
        const audioCtx = new (window.AudioContext || window.AudioContext)();
        const src = audioCtx.createMediaStreamSource(event.streams[0]);
        const inboundAnalyzer = audioCtx.createAnalyser();
        inboundAnalyzer.fftSize = 256;
        src.connect(inboundAnalyzer);
        analyserRef.current = inboundAnalyzer;

        // Start volume monitoring
        volumeIntervalRef.current = window.setInterval(() => {
          setCurrentVolume(getVolume());
        }, 100);
      };

      // Data channel for transcripts
      const dataChannel = pc.createDataChannel("response");
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        // console.log("Data channel open");
        configureDataChannel(dataChannel);
      };
      dataChannel.onmessage = handleDataChannelMessage;

      // Add local (mic) track
      pc.addTrack(stream.getTracks()[0]);

      // Create offer & set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send SDP offer to OpenAI Realtime
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview";
      const response = await fetch(`${baseUrl}?model=${model}&voice=${voice}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralToken}`,
          "Content-Type": "application/sdp",
        },
      });

      // Set remote description
      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setIsSessionActive(true);
      // setStatus("Session established successfully!");
    } catch (err) {
      console.error("startSession error:", err);
      setStatus(`Error: ${err}`);
      stopSession();
    }
  }

  /**
   * Stop the session & cleanup
   */
  function stopSession() {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioIndicatorRef.current) {
      audioIndicatorRef.current.classList.remove("active");
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownSeconds(null);
    analyserRef.current = null;

    ephemeralUserMessageIdRef.current = null;

    setCurrentVolume(0);
    setIsSessionActive(false);
    setIsTTSLoading(false);
    setStatus("Session stopped");
    setMsgs([]);
    setConversation([]);
  }

  /**
   * Toggle start/stop from a single button
   */
  async function handleStartStopClick() {
    if (isSessionActive) {
      stopSession();
    } else {
      await startSession();
    }
  }

  /**
   * Send a text message through the data channel
   */
  function sendTextMessage(text: string) {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
      console.error("Data channel not ready");
      return;
    }

    // Reset countdown when user sends a text message
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownSeconds(null);

    const messageId = uuidv4();

    // Add message to conversation immediately
    const newMessage: Conversation = {
      id: messageId,
      role: "user",
      text,
      timestamp: new Date().toISOString(),
      isFinal: true,
      status: "final",
    };

    setConversation(prev => [...prev, newMessage]);

    // Send message through data channel
    const message = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: text,
          },
        ],
      },
    };

    const response = {
      type: "response.create",
    };

    dataChannelRef.current.send(JSON.stringify(message));
    dataChannelRef.current.send(JSON.stringify(response));
  }

  // Navigate to completed page when session becomes inactive
  const wasSessionActiveRef = useRef(false);

  useEffect(() => {
    console.log("isSessionActive", isSessionActive);
    if (wasSessionActiveRef.current && !isSessionActive) {
      router.push("/completed");
    }
    wasSessionActiveRef.current = isSessionActive;
  }, [isSessionActive, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    isSessionActive,
    isTTSLoading,
    audioIndicatorRef,
    startSession,
    stopSession,
    handleStartStopClick,
    registerFunction,
    msgs,
    currentVolume,
    conversation,
    sendTextMessage,
    countdownSeconds,
  };
}
