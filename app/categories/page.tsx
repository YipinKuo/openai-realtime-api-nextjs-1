import React from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Category {
  id: string;
  [key: string]: any;
}

async function getCategories(): Promise<Category[]> {
  const h = await headers();
  const host = h.get("host");
  const protocol = process.env.VERCEL ? "https" : "http";
  const url = `${protocol}://${host}/api/options?type=categories`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch categories");
  const data = await res.json();
  return data.categories;
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  console.log(categories);

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首頁
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-8 text-center">選擇主題類別</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {/* Custom topic item - spans 2 columns */}
        <Link
          href="/custom"
          className="rounded-xl border-2 border-dashed border-primary p-6 shadow-md bg-background hover:shadow-lg transition flex flex-col items-start cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary col-span-1 sm:col-span-2"
        >
          <div className="flex items-center mb-2">
            <span className="text-3xl mr-3">1️⃣</span>
            <span className="text-xl font-semibold text-primary">自訂主題</span>
          </div>
          <div className="text-muted-foreground mb-2">輸入你想練習的任何主題</div>
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/category/${cat.id}`}
            className="rounded-xl border p-6 shadow-md bg-background hover:shadow-lg transition flex flex-col items-start cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex items-center mb-2">
              {cat.Emoji && <span className="text-3xl mr-3">{cat.Emoji}</span>}
              <span className="text-xl font-semibold">{cat.Name || cat.name}</span>
            </div>
            {cat.Description && (
              <div className="text-muted-foreground mb-2 whitespace-pre-line">
                {cat.Description}
              </div>
            )}
            {/* Add more fields as needed */}
          </Link>
        ))}
      </div>
    </main>
  );
} 