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

export default async function TopicLevelPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const topic = await getTopic(id);

  if (!topic) return notFound();

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
      <ClientLevelSelector topic={topic} />
    </div>
  );
} 