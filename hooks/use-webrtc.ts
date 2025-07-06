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
}

/**
 * The return type for the hook, matching Approach A
 * (RefObject<HTMLDivElement | null> for the audioIndicatorRef).
 */
interface UseWebRTCAudioSessionReturn {
  status: string;
  isSessionActive: boolean;
  audioIndicatorRef: React.RefObject<HTMLDivElement | null>;
  startSession: () => Promise<void>;
  stopSession: () => void;
  handleStartStopClick: () => void;
  registerFunction: (name: string, fn: Function) => void;
  msgs: any[];
  currentVolume: number;
  conversation: Conversation[];
  sendTextMessage: (text: string) => void;
}

/**
 * Hook to manage a real-time session with OpenAI's Realtime endpoints.
 */
export default function useWebRTCAudioSession(
  params: UseWebRTCAudioSessionParams,
): UseWebRTCAudioSessionReturn {
  const { voice, tools, level, topicName, conversationTopics, conversationParties } = params;
  const { t, locale } = useTranslations();
  const router = useRouter();
  // Connection/session states
  const [status, setStatus] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);

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

  /**
   * We track only the ephemeral user message **ID** here.
   * While user is speaking, we update that conversation item by ID.
   */
  const ephemeralUserMessageIdRef = useRef<string | null>(null);

  // Template definitions
  const BEGINNER_TEMPLATE = `你是一位友善耐心的英語對話夥伴，幫助英語初學者練習與「{{topic}}」相關的英文情境對話。

{{roleplay_context}}

請嚴格遵循以下原則：
- 只使用最常見、最簡單的單字和文法。
- 說話要慢且清楚。
- 每次教一個重點句子，請學習者跟著你大聲重複。
- 多給予鼓勵和讚美，幫助學習者建立信心。
- 不要解釋文法規則，只要讓學習者模仿和練習。
- 每次只問一個簡單問題，等待學習者回答。

範例：
你：Let's practice: "Can I have some water, please?" 跟我一起說："Can I have some water, please?" 很棒！請你自己再說一次。

在每一輪對話中，請主動教學習者一個有用的英文句子（可以是回應或提問），並請學習者跟著你大聲重複這句話。這有助於加強口說練習與實際應用能力。

請以角色扮演方式開始對話，並引導對方參與，幫助他一步步建立英語口說信心。

請從你的第一句話開始（不需要再說明規則）。`;

  const INTERMEDIATE_TEMPLATE = `你是一位在「{{topic}}」領域工作的專業人士，正在協助一位中級英文學習者練習英文對話。

{{roleplay_context}}

請嚴格遵循以下原則：
- 使用自然但清楚的英文，句型和單字可以比初級多樣，但仍要避免太難。
- 鼓勵學習者用自己的經驗或想法回答問題。
- 在情境中自然引入新單字或文法，必要時簡短說明。
- 鼓勵學習者主動提問或延伸對話。
- 當學習者犯錯時，簡短說明並溫和糾正。
- 問題可以稍微複雜，並引導學習者思考。

範例：
你：In a restaurant, you might say: "Could I see the menu, please?" 請你試著說一次。你還能想到其他禮貌詢問服務生的英文句子嗎？

在每一輪對話中，請主動教學習者一個有用的英文句子（可以是回應或提問），並請學習者跟著你大聲重複這句話。這有助於加強口說練習與實際應用能力。

請以角色扮演方式開始互動，不需列出規則。

目標：幫助學習者增強溝通表達力、詞彙多樣性，以及應變能力。`;

  const ADVANCED_TEMPLATE = `你是「{{topic}}」的專業人員，正在與一位高級英文學習者進行角色扮演對話，主題為 {{topic}}。

{{roleplay_context}}

請嚴格遵循以下原則：
- 使用複雜、道地、專業的英文，包括慣用語、成語和高階文法。
- 模擬真實世界的挑戰情境（如談判、辯論、緊急狀況等）。
- 鼓勵學習者表達意見、解決問題、應對突發狀況。
- 給予詳細回饋，要求學習者追求語言的精確與細膩。
- 鼓勵學習者使用高階詞彙、文化參考與地道表達。
- 問題可以具挑戰性，並要求學習者解釋理由或立場。

範例：
你：Imagine you're in a business meeting and disagree with a proposal. How would you express your concerns diplomatically? 試著用英文完整表達你的想法。你可以用這句開頭："While I see your point, I have some reservations regarding..."

在每一輪對話中，請主動教學習者一個有用的英文句子（可以是回應或提問），並請學習者跟著你大聲重複這句話。這有助於加強口說練習與實際應用能力。

請自然開始對話，不需解釋規則，並根據對方回應靈活調整難度。

目標：讓學習者能在高壓或正式情境中自信流暢地溝通，提升語言與應對能力。`;

  /**
   * Register a function (tool) so the AI can call it.
   */
  function registerFunction(name: string, fn: Function) {
    functionRegistry.current[name] = fn;
  }

  /**
   * Generate instruction text based on level and topic
   */
  function generateInstructionText(): string {
    // Default fallback text if no level or topic provided
    const defaultText = `你是一位友善耐心的餐廳服務員 Linda。你正在幫助一位英語初學者練習餐廳訂位對話。

請遵循以下原則：
1. 使用簡單清楚的英語，避免複雜句型
2. 語氣友善溫暖，充滿鼓勵
3. 當學習者犯錯時，溫和地糾正並提供正確說法
4. 逐步引導收集訂位資訊：人數、日期時間、特殊需求、聯絡方式
5. 每次回應只問一個問題，等待學習者回答後再繼續
6. 適時給予讚美和鼓勵

記住：你的目標是讓學習者感到輕鬆自在，建立說英語的信心。

在每一輪對話中，請主動教學習者一個有用的英文句子（可以是回應或提問），並請學習者跟著你大聲重複這句話。這有助於加強口說練習與實際應用能力。

IMPORTANT: After each of your responses, provide helpful conversation hints to guide the user. Use the showHints tool to display 3-4 relevant quick reply options that would naturally continue the conversation. These hints should be:
- Contextually relevant to what you just discussed
- Helpful for language learning (questions, follow-ups, or practice opportunities)
- Short and clear (1-3 words each)
- In the same language as your conversation

For example, after discussing food preferences, you might show hints like: "What's your favorite?, Tell me more, Ask about prices, Practice ordering". This helps users continue the conversation naturally and practice their language skills.`;

    if (!level || !topicName) {
      return defaultText;
    }

    let template: string;
    switch (level) {
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
        return defaultText;
    }

    // Replace {{topic}} placeholder with actual topic name
    let instruction = template.replace(/\{\{topic\}\}/g, topicName);

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

    // Add hint functionality instructions to all templates
    instruction += `

IMPORTANT: After each of your responses, provide helpful conversation hints to guide the user. Use the showHints tool to display 3-4 relevant quick reply options that would naturally continue the conversation. These hints should be:
- Contextually relevant to what you just discussed
- Helpful for language learning (questions, follow-ups, or practice opportunities)
- Short and clear (1-3 words each)
- In the same language as your conversation

For example, after discussing food preferences, you might show hints like: "What's your favorite?, Tell me more, Ask about prices, Practice ordering". This helps users continue the conversation naturally and practice their language skills.`;

    return instruction;
  }

  /**
   * Configure the data channel on open, sending a session update to the server.
   */
  function configureDataChannel(dataChannel: RTCDataChannel) {
    // Send session update
    const sessionUpdate = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        tools: tools || [],
        input_audio_transcription: {
          model: "whisper-1",
        },
      },
    };
    dataChannel.send(JSON.stringify(sessionUpdate));

    console.log("Session update sent:", sessionUpdate);
    console.log("Setting locale: " + t("language") + " : " + locale);

    // Send language preference message with dynamic instruction text
    const languageMessage = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: generateInstructionText(),
          },
        ],
      },
    };
    dataChannel.send(JSON.stringify(languageMessage));
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
      setStatus("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setupAudioVisualization(stream);

      setStatus("Fetching ephemeral token...");
      const ephemeralToken = await getEphemeralToken();

      setStatus("Establishing connection...");
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
      const model = "gpt-4o-realtime-preview-2024-12-17";
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
      setStatus("Session established successfully!");
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
    analyserRef.current = null;

    ephemeralUserMessageIdRef.current = null;

    setCurrentVolume(0);
    setIsSessionActive(false);
    setStatus("Session stopped");
    setMsgs([]);
    setConversation([]);
  }

  /**
   * Toggle start/stop from a single button
   */
  function handleStartStopClick() {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
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
      // router.push("/completed");
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
    audioIndicatorRef,
    startSession,
    stopSession,
    handleStartStopClick,
    registerFunction,
    msgs,
    currentVolume,
    conversation,
    sendTextMessage,
  };
}
