// Quick test script to verify Gemini API configuration
import { callGemini } from './ai';

export async function testGeminiConnection(): Promise<boolean> {
  try {
    console.log('🔄 Testing Gemini API connection...');
    console.log('📍 Endpoint: https://generativelanguage.googleapis.com/v1beta');
    console.log('🤖 Model: gemini-1.5-flash-latest');
    
    const result = await callGemini(
      'You are a helpful assistant.',
      'Say "Hello, API is working!" in JSON format with a field called "message".',
      { temperature: 0.3, maxOutputTokens: 100 }
    );
    
    console.log('✅ Gemini API Response:', result);
    
    // Try to parse the response
    const parsed = JSON.parse(result);
    if (parsed.message) {
      console.log('✅ SUCCESS: Gemini API is working correctly!');
      console.log('📝 Message:', parsed.message);
      return true;
    }
    
    console.log('⚠️ Response received but format unexpected');
    return false;
  } catch (error) {
    console.error('❌ Gemini API test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return false;
  }
}

// Auto-run test if this file is imported in development
if (import.meta.env.DEV) {
  console.log('🧪 Gemini API Test Module Loaded');
  console.log('💡 Run testGeminiConnection() to test the API');
}
