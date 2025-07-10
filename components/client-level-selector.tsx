"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import ThreeDotsWave from "@/components/ui/three-dots-wave";

const LEVELS = [
  {
    key: "beginner",
    title: "初級",
    desc: "基礎對話，簡單句型，充分引導",
  },
  {
    key: "intermediate",
    title: "中級",
    desc: "日常對話，自然表達，適度挑戰",
  },
  {
    key: "advanced",
    title: "高級",
    desc: "複雜情境，專業詞彙，深度討論",
  },
];

interface Topic {
  id: string;
  Name?: string;
  name?: string;
  Description?: string;
  Emoji?: string;
}

interface ClientLevelSelectorProps {
  topic: Topic;
}

// New type for parsed topic
interface ParsedTopic {
  topic: string;
  parties: string[];
  raw: string; // original string for lookup
}

export function ClientLevelSelector({ topic }: ClientLevelSelectorProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedConversationTopic, setSelectedConversationTopic] = useState<ParsedTopic | null>(null);
  const [selectedConversationParty, setSelectedConversationParty] = useState<string>("");
  const [conversationTopics, setConversationTopics] = useState<ParsedTopic[]>([]);
  const [allLevelTopics, setAllLevelTopics] = useState<{
    beginner: ParsedTopic[];
    intermediate: ParsedTopic[];
    advanced: ParsedTopic[];
  }>({ beginner: [], intermediate: [], advanced: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper: Parse a raw string into ParsedTopic[]
  const parseTopicsWithParties = (raw: string): ParsedTopic[] => {
    // Match all topic[party1, party2] or topic[party]
    const regex = /([^,\[]+)\[([^\]]+)\]/g;
    const result: ParsedTopic[] = [];
    let match;
    while ((match = regex.exec(raw)) !== null) {
      const topicName = match[1].trim();
      const parties = match[2].split(',').map(p => p.trim());
      result.push({ topic: topicName, parties, raw: match[0] });
    }
    return result;
  };

  useEffect(() => {
    const fetchSubtopicOptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/options');
        const data = await response.json();
        // Find the subtopic for this topic
        const subtopic = (data.subtopics || []).find((st: any) => {
          const match = st.Topic === topic.id || st.TopicId === topic.id || (Array.isArray(st.Topic) && st.Topic.includes(topic.id));
          return match;
        });
        if (!subtopic) {
          setConversationTopics([]);
          setAllLevelTopics({ beginner: [], intermediate: [], advanced: [] });
          setError("找不到相關子主題，請聯絡管理員。");
          return;
        }
        // Pre-load all level-specific conversation topics
        const starterTopicsRawObj = subtopic["Starter Conversation Topics"] || "";
        const intermediateTopicsRawObj = subtopic["Intermediate Conversation Topics"] || "";
        const advancedTopicsRawObj = subtopic["Advanced Conversation Topics"] || "";
        const starterTopicsRaw = typeof starterTopicsRawObj === "string" ? starterTopicsRawObj : starterTopicsRawObj?.value || "";
        const intermediateTopicsRaw = typeof intermediateTopicsRawObj === "string" ? intermediateTopicsRawObj : intermediateTopicsRawObj?.value || "";
        const advancedTopicsRaw = typeof advancedTopicsRawObj === "string" ? advancedTopicsRawObj : advancedTopicsRawObj?.value || "";
        // Parse topics for each level
        const starterTopicsArr = parseTopicsWithParties(starterTopicsRaw);
        const intermediateTopicsArr = parseTopicsWithParties(intermediateTopicsRaw);
        const advancedTopicsArr = parseTopicsWithParties(advancedTopicsRaw);
        setAllLevelTopics({
          beginner: starterTopicsArr,
          intermediate: intermediateTopicsArr,
          advanced: advancedTopicsArr
        });
        setConversationTopics([]);
      } catch (err) {
        setError("載入選項時發生錯誤");
        setConversationTopics([]);
        setAllLevelTopics({ beginner: [], intermediate: [], advanced: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchSubtopicOptions();
  }, [topic.id]);

  const handleLevelSelect = (level: string) => {
    setSelectedLevel(level);
    setStep(2);
    // Switch to pre-loaded topics for the selected level
    const topicsForLevel = allLevelTopics[level as keyof typeof allLevelTopics] || [];
    setConversationTopics(topicsForLevel);
    setSelectedConversationTopic(null);
    setSelectedConversationParty("");
    setError(null);
    if (topicsForLevel.length === 0) {
      const levelNames = {
        beginner: "初級",
        intermediate: "中級", 
        advanced: "高級"
      };
      setError(`找不到${levelNames[level as keyof typeof levelNames]}對話主題，請聯絡管理員。`);
    }
  };

  const handleConversationTopicSelect = (parsedTopic: ParsedTopic) => {
    setSelectedConversationTopic(parsedTopic);
    setSelectedConversationParty("");
  };

  const handleConversationPartySelect = (party: string) => {
    setSelectedConversationParty(party);
  };

  const handleProceed = () => {
    if (step === 2 && selectedConversationTopic) {
      setStep(3);
    } else if (step === 3 && selectedConversationTopic && selectedConversationParty) {
      const params = new URLSearchParams({
        topicId: topic.id,
        level: selectedLevel,
        conversationTopic: selectedConversationTopic.topic,
        conversationParty: selectedConversationParty
      });
      router.push(`/live?${params.toString()}`);
    }
  };

  const canProceed = () => {
    if (step === 2) return !!selectedConversationTopic;
    if (step === 3) return !!selectedConversationParty;
    return false;
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto py-16 px-4">
        <div className="flex items-center justify-center">
          <ThreeDotsWave />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto py-16 px-4">
        <div className="text-center text-red-500">{error}</div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto py-16 px-4">
      {/* Topic Header */}
      <div className="mb-10 text-center">
        {topic.Emoji && <span className="text-4xl mr-2 align-middle">{topic.Emoji}</span>}
        <span className="text-3xl font-bold align-middle">{topic.Name || topic.name}</span>
        {topic.Description && <div className="text-muted-foreground mt-2 text-lg">{topic.Description}</div>}
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{selectedLevel ? <Check className="w-4 h-4" /> : '1'}</div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{selectedConversationTopic ? <Check className="w-4 h-4" /> : '2'}</div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{selectedConversationParty ? <Check className="w-4 h-4" /> : '3'}</div>
        </div>
      </div>

      {/* Step 1: Level Selection */}
      {step === 1 && (
        <div>
          <h1 className="text-3xl font-bold mb-12 text-center">選擇練習難度</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {LEVELS.map((level) => (
              <button
                key={level.key}
                className="rounded-2xl border-2 border-transparent p-10 shadow-lg bg-background hover:shadow-2xl hover:border-primary focus:border-primary transition cursor-pointer text-center focus:outline-none focus:ring-2 focus:ring-primary min-h-[220px] flex flex-col items-center justify-center"
                onClick={() => handleLevelSelect(level.key)}
                type="button"
              >
                <div className="text-3xl font-extrabold mb-4">{level.title}</div>
                <div className="text-lg text-muted-foreground font-medium">{level.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Conversation Topic Selection */}
      {step === 2 && (
        <div>
          <h1 className="text-3xl font-bold mb-12 text-center">
            {(topic.Name || topic.name) === "應試口說｜考場模擬" || (topic.Name || topic.name) === "日常會話｜表達能力" ? "備考必練主題" : "選擇對話主題"}
          </h1>
          {error ? (
            <div className="text-center text-red-500 py-16">{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {conversationTopics.map((parsedTopic) => (
                  <Card 
                    key={parsedTopic.raw}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedConversationTopic?.raw === parsedTopic.raw
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : ''
                    }`}
                    onClick={() => handleConversationTopicSelect(parsedTopic)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div>{parsedTopic.topic}</div>
                        {selectedConversationTopic?.raw === parsedTopic.raw && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-between mt-12">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回
                </Button>
                <div className="flex items-center gap-4">
                  {selectedConversationTopic && (
                    <Badge variant="secondary">
                      {selectedConversationTopic.topic}
                    </Badge>
                  )}
                  <Button 
                    onClick={handleProceed} 
                    disabled={!canProceed()}
                  >
                    下一步
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Conversation Party Selection */}
      {step === 3 && selectedConversationTopic && (
        <div>
          <h1 className="text-3xl font-bold mb-12 text-center">選擇對話角色</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedConversationTopic.parties.map((party) => (
              <Card 
                key={party}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedConversationParty === party
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : ''
                }`}
                onClick={() => handleConversationPartySelect(party)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {party}
                    {selectedConversationParty === party && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-between mt-12">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div className="flex items-center gap-4">
              {selectedConversationParty && (
                <Badge variant="secondary">
                  {selectedConversationParty}
                </Badge>
              )}
              <Button 
                onClick={handleProceed} 
                disabled={!canProceed()}
                className="bg-green-600 hover:bg-green-700"
              >
                開始對話
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 