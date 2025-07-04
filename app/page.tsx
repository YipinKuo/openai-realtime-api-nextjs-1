"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import ThreeDotsWave from "@/components/ui/three-dots-wave"

const AVATARS = [
  {
    key: "jin",
    name: "金莉莉",
    src: "/avatars/teacher-jin.png",
  },
  {
    key: "zhan",
    name: "金戰",
    src: "/avatars/teacher-zhan.png",
  },
]

const AVATAR_STORAGE_KEY = "selectedAvatar"

const AvatarSelector = () => {
  const router = useRouter()

  const handleSelect = (key: string) => {
    localStorage.setItem(AVATAR_STORAGE_KEY, key)
    router.push("/categories")
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="flex gap-12 mb-6">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.key}
            onClick={() => handleSelect(avatar.key)}
            className="flex flex-col items-center focus:outline-none group rounded-full transition-all"
            aria-label={`選擇 ${avatar.name}`}
          >
            <Avatar className="w-40 h-40 md:w-56 md:h-56 shadow-lg border-4 border-white group-hover:scale-105 transition-transform">
              <AvatarImage src={avatar.src} alt={avatar.name} />
              <AvatarFallback className="text-4xl">{avatar.name[0]}</AvatarFallback>
            </Avatar>
            <span className="mt-4 text-2xl font-bold text-center">{avatar.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const App = () => (
  <main className="min-h-screen flex items-center justify-center">
    <AvatarSelector />
  </main>
)

export default App;