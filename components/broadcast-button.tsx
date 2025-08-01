import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "@/components/translations-context";
import { useState } from "react";

interface BroadcastButtonProps {
  isSessionActive: boolean
  onClick: () => Promise<void>
  variant?: 'default' | 'floating'
}

export function BroadcastButton({ isSessionActive, onClick, variant = 'default' }: BroadcastButtonProps) {
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return; // Prevent multiple clicks while loading
    
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      // Reset loading state after a short delay to ensure state updates have propagated
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  if (variant === 'floating') {
    return (
      <Button
        variant={isSessionActive ? "destructive" : "default"}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 motion-preset-shake shadow-lg border"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isSessionActive && (
          <Badge variant="secondary" className="animate-pulse bg-red-100 text-red-700 text-xs">
            {t('broadcast.live')}
          </Badge>
        )}
        {isLoading 
          ? (isSessionActive ? t('broadcast.ending') : t('broadcast.starting'))
          : (isSessionActive ? t('broadcast.end') : t('broadcast.start'))
        }
      </Button>
    );
  }

  return (
    <Button
      variant={isSessionActive ? "destructive" : "default"}
      className="w-full max-w-[400px] py-6 text-lg font-medium flex items-center justify-center gap-2 motion-preset-shake"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isSessionActive && (
        <Badge variant="secondary" className="animate-pulse bg-red-100 text-red-700">
          {t('broadcast.live')}
        </Badge>
      )}
      {isLoading 
        ? (isSessionActive ? t('broadcast.ending') : t('broadcast.starting'))
        : (isSessionActive ? t('broadcast.end') : t('broadcast.start'))
      }
    </Button>
  )
} 