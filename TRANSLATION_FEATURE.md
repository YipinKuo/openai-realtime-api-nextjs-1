# Translation Feature

This feature automatically translates conversation messages to Chinese (Traditional) in the transcriber component.

## How it works

1. **Translation API**: A new API endpoint at `/api/translate` uses OpenAI's GPT-4o-mini model to translate text to Traditional Chinese.

2. **Translation Hook**: The `useTranslation` hook manages translation requests with caching to avoid repeated API calls for the same text.

3. **UI Integration**: The `Transcriber` component now shows both the original message and its Chinese translation below it.

## Features

- **Automatic Translation**: Messages are automatically translated when they become final (not during real-time transcription)
- **Caching**: Translations are cached to avoid repeated API calls
- **Loading States**: Shows "翻譯中..." (Translating...) while translation is in progress
- **Error Handling**: Gracefully handles translation failures
- **Responsive Design**: Translations are displayed in a clean, readable format

## API Endpoint

### POST /api/translate

**Request:**
```json
{
  "text": "Hello, how are you?"
}
```

**Response:**
```json
{
  "translation": "你好，你好嗎？"
}
```

## Usage

The translation feature is automatically enabled in the transcriber component. When a conversation message becomes final, it will:

1. Show the original message
2. Display a loading indicator ("翻譯中...")
3. Show the Chinese translation below the original text

## Configuration

The translation uses OpenAI's API with the following settings:
- Model: `gpt-4o-mini`
- Temperature: 0.3 (for consistent translations)
- Max tokens: 1000
- System prompt: Professional translator focused on Traditional Chinese

## Dependencies

- OpenAI API key (required)
- React hooks for state management
- Framer Motion for animations

## Files Modified

1. `app/api/translate/route.ts` - Translation API endpoint
2. `hooks/use-translation.ts` - Translation hook with caching
3. `components/ui/transcriber.tsx` - Updated to show translations

## Environment Variables

Make sure your `.env` file contains:
```
OPENAI_API_KEY=your-openai-api-key
``` 