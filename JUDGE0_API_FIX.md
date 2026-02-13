# Judge0 API - 403 Error Fix Guide

## 🐛 Issue

**Error Message:**
```
Failed to load resource: the server responded with a status of 403 ()
{"message":"Invalid API key. Go to https://docs.rapidapi.com/docs/keys for more info."}
```

**What This Means:**
The 403 (Forbidden) error indicates that your RapidAPI key for Judge0 is either:
1. Invalid or expired
2. Not subscribed to the Judge0 CE API
3. Rate limit exceeded
4. Not properly configured

---

## 🔧 Quick Fix Steps

### Step 1: Get a New API Key

1. **Go to RapidAPI Judge0 CE:**
   - Visit: https://rapidapi.com/judge0-official/api/judge0-ce

2. **Sign Up / Log In:**
   - Create a RapidAPI account or log in

3. **Subscribe to Judge0 CE:**
   - Click "Subscribe to Test" button
   - Choose a plan:
     - **BASIC (FREE)**: 50 requests/day
     - **PRO**: 500 requests/day
     - **ULTRA**: 5000 requests/day
     - **MEGA**: 50000 requests/day

4. **Get Your API Key:**
   - After subscribing, go to the "Endpoints" tab
   - Look for "X-RapidAPI-Key" in the code snippets
   - Copy your API key

### Step 2: Update Your .env File

Open your `.env` file and update:

```env
VITE_JUDGE0_API_KEY="YOUR_NEW_API_KEY_HERE"
VITE_JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
```

### Step 3: Test Your API Key

Run the test script:

```bash
node test-judge0-api.js
```

**Expected Output (Success):**
```
Testing Judge0 API Key...
Status Code: 200
✅ SUCCESS: Judge0 API key is valid!
```

**Expected Output (Failure):**
```
Status Code: 403
❌ ERROR: API key is invalid or expired
```

### Step 4: Restart Your Development Server

After updating the .env file:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

---

## 🔍 Current Configuration

### Your Current API Key
```
611a646ea9msh052affb0d888dd5p173bf2jsnbe9763eb46ac
```

**Status:** ❌ This key is returning 403 errors

### Files Using Judge0

1. **src/lib/judge0.ts** - Main Judge0 integration
2. **.env** - API key configuration

---

## 🎯 Alternative Solutions

### Option 1: Use RapidAPI (Recommended)

**Pros:**
- Easy setup
- Free tier available (50 requests/day)
- Managed service
- No infrastructure needed

**Cons:**
- Rate limits on free tier
- Requires internet connection

**Setup:**
1. Subscribe at: https://rapidapi.com/judge0-official/api/judge0-ce
2. Get your API key
3. Update `.env` file

### Option 2: Self-Host Judge0

**Pros:**
- Unlimited requests
- No rate limits
- Full control
- No API key needed

**Cons:**
- Requires Docker
- More complex setup
- Need to maintain infrastructure

**Setup:**
```bash
# Using Docker
docker run -p 2358:2358 -d judge0/judge0:latest

# Update .env
VITE_JUDGE0_API_URL="http://localhost:2358"
VITE_JUDGE0_API_KEY=""  # Leave empty for self-hosted
```

### Option 3: Use Judge0 Extra CE (More Languages)

If you need more programming languages:

**RapidAPI:**
- https://rapidapi.com/judge0-official/api/judge0-extra-ce

**Self-Hosted:**
```bash
docker run -p 2358:2358 -d judge0/judge0:1.13.0
```

---

## 📝 Configuration Details

### Current judge0.ts Configuration

The file is already properly configured to work with both RapidAPI and self-hosted:

```typescript
const JUDGE0_API_URL = import.meta.env.VITE_JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = import.meta.env.VITE_JUDGE0_API_KEY || "";

function getHeaders(): Record<string, string> {
  // RapidAPI style headers
  if (JUDGE0_API_URL.includes("rapidapi.com")) {
    return {
      "Content-Type": "application/json",
      "x-rapidapi-key": JUDGE0_API_KEY,
      "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
    };
  }

  // Self-hosted or other providers
  return {
    "Content-Type": "application/json",
    "X-Auth-Token": JUDGE0_API_KEY,
  };
}
```

### Supported Languages

Currently configured languages:
- **C** (GCC 9.2.0) - Language ID: 50
- **C++** (GCC 9.2.0) - Language ID: 54
- **Python** (3.8.1) - Language ID: 71

To add more languages, update the `LANGUAGE_IDS` object in `src/lib/judge0.ts`.

---

## 🧪 Testing Your Setup

### Test 1: API Connection
```bash
node test-judge0-api.js
```

### Test 2: Code Execution (Browser Console)

After starting your dev server, open browser console:

```javascript
import { runTestCases } from './src/lib/judge0';

// Test Python code
const testCases = [
  { input: "5", expected_output: "5", is_hidden: false }
];

const results = await runTestCases(
  'print(input())',
  'python',
  testCases
);

console.log('Test Results:', results);
```

**Expected Output:**
```javascript
[
  {
    input: "5",
    expected_output: "5",
    actual_output: "5",
    passed: true,
    time_ms: "0.012",
    memory_kb: 3456,
    error: null,
    is_hidden: false
  }
]
```

---

## 🚨 Common Issues & Solutions

### Issue 1: 403 Forbidden
**Cause:** Invalid or expired API key  
**Solution:** Get a new API key from RapidAPI

### Issue 2: 429 Too Many Requests
**Cause:** Rate limit exceeded  
**Solution:** 
- Upgrade to a paid plan
- Wait for rate limit to reset
- Use self-hosted Judge0

### Issue 3: 401 Unauthorized
**Cause:** Missing API key  
**Solution:** Add `VITE_JUDGE0_API_KEY` to .env

### Issue 4: Timeout Errors
**Cause:** Code execution taking too long  
**Solution:** 
- Optimize your code
- Increase `cpu_time_limit` in judge0.ts
- Check for infinite loops

### Issue 5: Compilation Errors
**Cause:** Invalid code syntax  
**Solution:** Check the `compile_output` field in results

---

## 📊 Rate Limits by Plan

| Plan | Requests/Day | Requests/Month | Price |
|------|--------------|----------------|-------|
| BASIC | 50 | ~1,500 | FREE |
| PRO | 500 | ~15,000 | $10/mo |
| ULTRA | 5,000 | ~150,000 | $50/mo |
| MEGA | 50,000 | ~1,500,000 | $200/mo |

---

## ✅ Verification Checklist

- [ ] Subscribed to Judge0 CE on RapidAPI
- [ ] Copied new API key
- [ ] Updated `.env` file with new key
- [ ] Restarted development server
- [ ] Ran `test-judge0-api.js` successfully
- [ ] Tested code execution in browser
- [ ] No 403 errors in console

---

## 🎯 Next Steps

1. **Get New API Key:**
   - Go to: https://rapidapi.com/judge0-official/api/judge0-ce
   - Subscribe (free tier available)
   - Copy your API key

2. **Update Configuration:**
   ```env
   VITE_JUDGE0_API_KEY="your_new_key_here"
   ```

3. **Test:**
   ```bash
   node test-judge0-api.js
   ```

4. **Restart Server:**
   ```bash
   npm run dev
   ```

---

## 📚 Additional Resources

- **Judge0 Documentation:** https://ce.judge0.com/
- **RapidAPI Judge0 CE:** https://rapidapi.com/judge0-official/api/judge0-ce
- **Judge0 GitHub:** https://github.com/judge0/judge0
- **Self-Hosting Guide:** https://github.com/judge0/judge0/blob/master/CHANGELOG.md

---

## 💡 Pro Tips

1. **Use Environment Variables:** Never hardcode API keys in your code
2. **Monitor Usage:** Check your RapidAPI dashboard for usage stats
3. **Cache Results:** Consider caching test results to reduce API calls
4. **Error Handling:** Always handle API errors gracefully
5. **Rate Limiting:** Implement client-side rate limiting for better UX

---

## 🎊 Summary

Your Judge0 API key is currently invalid. To fix:

1. ✅ Get a new API key from RapidAPI
2. ✅ Update `.env` file
3. ✅ Restart dev server
4. ✅ Test with `test-judge0-api.js`

Once you have a valid API key, all code execution features will work perfectly! 🚀
