# Gemini API Configuration Fix

## Issues Fixed

### 1. Invalid JSON Payload Error (400)
**Error Message:**
```
Generation failed: Gemini API error: 400 - {"error": {"code": 400,"message": "Invalid JSON payload received. Unknown name \"system_instruction\": Cannot find field.\nInvalid JSON payload received. Unknown name \"responseMimeType\" at 'generation_config': Cannot find field."
```

**Root Cause:**
- The code was using `system_instruction` and `responseMimeType` fields which are only available in the v1beta API
- The API endpoint was set to v1, which doesn't support these fields

**Fix:**
- Updated API endpoint from `v1` to `v1beta` in all files
- Modified the request format to combine system and user prompts in the contents array
- Removed `responseMimeType` from generationConfig (not needed for basic JSON responses)

### 2. Model Not Found Error (404)
**Error Message:**
```
Generation failed: Gemini API error: 404 - {"error": {"code": 404,"message": "models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent."
```

**Root Cause:**
- The model name `gemini-1.5-flash` is not available in v1beta
- v1beta requires the `-latest` suffix for model names

**Fix:**
- Updated model name from `gemini-1.5-flash` to `gemini-1.5-flash-latest`
- Updated .env file with the correct model name
- Updated default model in all AI library files

## Files Modified

1. **src/lib/ai.ts**
   - Changed API URL to v1beta
   - Updated model name to `gemini-1.5-flash-latest`
   - Modified `callGemini` function to combine system and user prompts
   - Removed `system_instruction` and `responseMimeType` fields

2. **src/lib/job-ai.ts**
   - Changed API URL to v1beta
   - Updated model name to `gemini-1.5-flash-latest`

3. **.env**
   - Updated `VITE_GEMINI_MODEL` to `gemini-1.5-flash-latest`

4. **src/lib/coding-ai.ts** (uses callGemini from ai.ts)
   - No changes needed, inherits fixes from ai.ts

5. **src/lib/interview-ai.ts** (uses callGemini from ai.ts)
   - No changes needed, inherits fixes from ai.ts

## API Configuration

### Current Configuration
```
API Endpoint: https://generativelanguage.googleapis.com/v1beta
Model: gemini-1.5-flash-latest
Full URL Format: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=YOUR_API_KEY
```

### Correct URL Path Structure
The URL MUST include `/models/` in the path:
- ✅ Correct: `/v1beta/models/{model}:generateContent`
- ❌ Wrong: `/v1beta/{model}:generateContent`

### Request Format
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Combined system and user prompt"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 8192,
    "topP": 0.95,
    "topK": 40
  }
}
```

## Testing

To test the Gemini API connection, you can use the test file:

```typescript
import { testGeminiConnection } from './src/lib/test-gemini';

// Run the test
testGeminiConnection().then(success => {
  if (success) {
    console.log('API is configured correctly!');
  } else {
    console.log('API configuration needs attention');
  }
});
```

## Important Notes

1. **API Key**: Ensure `VITE_GEMINI_API_KEY` is set in your .env file
2. **Model Availability**: The v1beta endpoint supports `gemini-1.5-flash-latest` and `gemini-1.5-pro-latest`
3. **Prompt Combination**: System and user prompts are now combined in a single message
4. **JSON Responses**: The AI will still return JSON responses based on the prompt instructions

## Troubleshooting

If you still encounter issues:

1. **Verify API Key**: Check that your Gemini API key is valid and has the correct permissions
2. **Check Model Name**: Ensure you're using `-latest` suffix for v1beta models
3. **Network Issues**: Verify you can reach `generativelanguage.googleapis.com`
4. **Rate Limits**: Check if you've exceeded API rate limits
5. **Console Logs**: Check browser console for detailed error messages

## References

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Available Models](https://ai.google.dev/models/gemini)
- [API Versioning](https://ai.google.dev/api/rest)
