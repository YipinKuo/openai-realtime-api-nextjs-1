"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { CheckCircle, Home, Grid3X3 } from "lucide-react"

const CompletedPage: React.FC = () => {
  const router = useRouter()

  const handleGoHome = () => {
    router.push("/")
  }

  const handleGoCategories = () => {
    router.push("/categories")
  }

  return (
    <main className="h-full">
      <motion.div 
        className="container flex flex-col items-center justify-center mx-auto max-w-3xl my-20 p-12 border rounded-lg shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="mx-auto mb-6"
          >
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-4">恭喜完成！</h1>
          <p className="text-lg text-muted-foreground mb-2">
            你已經完成了英語練習！
          </p>
          <p className="text-sm text-muted-foreground">
            繼續保持學習的熱情，你的英語能力一定會越來越進步。
          </p>
        </motion.div>
        
        <motion.div 
          className="w-full max-w-md bg-card text-card-foreground rounded-xl border shadow-sm p-6 space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={handleGoHome}
              className="w-full"
              size="lg"
            >
              <Home className="w-5 h-5 mr-2" />
              返回首頁重新開始
            </Button>
            <Button
              onClick={handleGoCategories}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Grid3X3 className="w-5 h-5 mr-2" />
              瀏覽所有主題
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </main>
  )
}

export default CompletedPage 