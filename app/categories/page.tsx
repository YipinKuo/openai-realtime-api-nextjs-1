import React from "react";
import { headers } from "next/headers";
import Link from "next/link";

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
      <h1 className="text-3xl font-bold mb-8 text-center">選擇主題類別</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
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
            {cat.Description && <div className="text-muted-foreground mb-2">{cat.Description}</div>}
            {/* Add more fields as needed */}
          </Link>
        ))}
      </div>
    </main>
  );
} 