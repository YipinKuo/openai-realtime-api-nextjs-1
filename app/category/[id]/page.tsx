import React from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Topic {
  id: string;
  [key: string]: any;
}

interface Category {
  id: string;
  [key: string]: any;
}

async function getCategoryAndTopics(categoryId: string): Promise<{category: Category | null, topics: Topic[]}> {
  const h = await headers();
  const host = h.get("host");
  const protocol = process.env.VERCEL ? "https" : "http";
  const url = `${protocol}://${host}/api/options`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch data");
  const data = await res.json();
  console.log(data);
  const category = (data.categories || []).find((cat: Category) => cat.id === categoryId) || null;
  const topics = (data.topics || []).filter((topic: Topic) => {
    // Airtable may use 'Category' or 'CategoryId' or similar for the relation
    return topic.Category === categoryId || topic.CategoryId === categoryId || (Array.isArray(topic.Category) && topic.Category.includes(categoryId));
  });
  return { category, topics };
}

export default async function CategoryPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { category, topics } = await getCategoryAndTopics(id);

  if (!category) return notFound();

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
      <h1 className="text-3xl font-bold mb-8 text-center">
        {category.Emoji && <span className="text-3xl mr-3">{category.Emoji}</span>}
        {category.Name || category.name}
      </h1>
      {category.Description && (
        <div className="text-muted-foreground mb-8 text-center whitespace-pre-line">
          {category.Description}
        </div>
      )}
      <h2 className="text-2xl font-semibold mb-4">主題列表</h2>
      <div className="grid grid-cols-1 gap-6">
        {topics.length === 0 && <div className="text-muted-foreground">此類別下暫無主題。</div>}
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/subtopics/${topic.id}`}
            className="rounded-lg border p-4 bg-background shadow-sm flex items-start cursor-pointer hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex flex-col w-full">
              <div className="flex items-center mb-1">
                {topic.Emoji && <span className="text-2xl mr-2">{topic.Emoji}</span>}
                <span className="text-lg font-medium">{topic.Name || topic.name}</span>
              </div>
              {topic.Description && (
                <div className="text-muted-foreground mt-1">{topic.Description}</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
} 