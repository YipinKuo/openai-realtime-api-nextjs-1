import React from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ClientLevelSelector } from "@/components/client-level-selector";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

async function getTopic(topicId: string) {
  const h = await headers();
  const host = h.get("host");
  const protocol = process.env.VERCEL ? "https" : "http";
  const url = `${protocol}://${host}/api/options?type=topic&topicId=${topicId}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch data");
  const data = await res.json();
  return data.topic || null;
}

async function getSubtopic(subtopicId: string) {
  const h = await headers();
  const host = h.get("host");
  const protocol = process.env.VERCEL ? "https" : "http";
  const url = `${protocol}://${host}/api/options`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch data");
  const data = await res.json();
  const subtopic = (data.subtopics || []).find((sub: any) => sub.id === subtopicId);
  return subtopic || null;
}

export default async function TopicLevelPage({ params, searchParams }: { params: { id: string }, searchParams?: { subtopicId?: string } }) {
  const { id } = params;
  const subtopicId = searchParams?.subtopicId;
  const topic = await getTopic(id);
  let subtopic = null;
  if (subtopicId) {
    subtopic = await getSubtopic(subtopicId);
  }

  if (!topic) return notFound();

  // Parse Custom Menu if present
  let customMenuOptions = undefined;
  if (subtopic && subtopic['Custom Menu']) {
    // Parse into sections and options
    const lines = subtopic['Custom Menu'].split('\n');
    let currentSection: string = "";
    let sections: { section: string, options: string[] }[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) {
        currentSection = trimmed.replace(/^#+/, '').trim();
        sections.push({ section: currentSection, options: [] });
      } else if (currentSection && sections.length > 0) {
        sections[sections.length - 1].options.push(trimmed);
      }
    }
    customMenuOptions = sections;
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-6">
        <Link
          href="/categories"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回類別列表
        </Link>
      </div>
      {subtopic ? (
        <>
          <div className="text-muted-foreground text-center text-sm mb-2">
            {topic.Emoji && <span className="text-xl mr-2 align-middle">{topic.Emoji}</span>}
            {topic.Name || topic.name}
          </div>
          <h1 className="text-3xl font-bold mb-4 text-center">
            {subtopic.Emoji && <span className="text-3xl mr-3">{subtopic.Emoji}</span>}
            {subtopic.Name || subtopic.name}
          </h1>
          {subtopic.Description && (
            <div className="text-muted-foreground mb-8 text-center whitespace-pre-line">
              {subtopic.Description}
            </div>
          )}
        </>
      ) : (
        <h1 className="text-3xl font-bold mb-8 text-center">
          {topic.Emoji && <span className="text-3xl mr-3">{topic.Emoji}</span>}
          {topic.Name || topic.name}
        </h1>
      )}
      {!subtopic && topic.Description && (
        <div className="text-muted-foreground mb-8 text-center whitespace-pre-line">
          {topic.Description}
        </div>
      )}
      <ClientLevelSelector
        topic={topic}
        hideParties={subtopic?.['Hide Parties']}
        subtopic={subtopic ? { id: subtopic.id, name: subtopic.Name || subtopic.name, description: subtopic.Description } : undefined}
        {...(customMenuOptions ? { customMenuOptions } : {})}
      />
    </div>
  );
} 