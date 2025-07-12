import React from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Subtopic {
  id: string;
  [key: string]: any;
}

async function getSubtopicsForTopic(topicId: string): Promise<Subtopic[]> {
  const h = await headers();
  const host = h.get("host");
  const protocol = process.env.VERCEL ? "https" : "http";
  const url = `${protocol}://${host}/api/options`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch data");
  const data = await res.json();
  // Filter subtopics by topicId
  const subtopics = (data.subtopics || []).filter((sub: Subtopic) => {
    return (
      sub.Topic === topicId ||
      sub.TopicId === topicId ||
      (Array.isArray(sub.Topic) && sub.Topic.includes(topicId))
    );
  });
  return subtopics;
}

export default async function SubtopicSelectionPage({ params }: { params: { topicId: string } }) {
  const { topicId } = params;
  const subtopics = await getSubtopicsForTopic(topicId);

  if (!subtopics || subtopics.length === 0) return notFound();

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-6">
        <Link
          href="/categories"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回類別列表
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-8 text-center">選擇子主題</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {subtopics.map((subtopic) => (
          <Link
            key={subtopic.id}
            href={`/topic/${topicId}`}
            className="rounded-lg border p-4 bg-background shadow-sm flex items-start cursor-pointer hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex flex-col w-full">
              <div className="flex items-center mb-1">
                {subtopic.Emoji && <span className="text-2xl mr-2">{subtopic.Emoji}</span>}
                <span className="text-lg font-medium">{subtopic.Name || subtopic.name}</span>
              </div>
              {subtopic.Description && (
                <div className="text-muted-foreground mt-1">{subtopic.Description}</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
} 