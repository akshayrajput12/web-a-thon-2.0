# Quick Judge0 API Fix

## ❌ Problem
```
403 Forbidden - Invalid API key
```

## ✅ Solution (3 Steps)

### 1. Get New API Key
Visit: https://rapidapi.com/judge0-official/api/judge0-ce
- Sign up / Log in
- Click "Subscribe to Test"
- Choose FREE plan (50 requests/day)
- Copy your API key

### 2. Update .env File
```env
VITE_JUDGE0_API_KEY="YOUR_NEW_KEY_HERE"
```

### 3. Test & Restart
```bash
# Test the key
node test-judge0-api.js

# Restart server
npm run dev
```

---

## 🔍 Your Current Key Status

**Current Key:** `611a646ea9msh052affb0d888dd5p173bf2jsnbe9763eb46ac`

**Status:** ❌ Invalid/Expired (returning 403 errors)

**Action Required:** Get a new API key from RapidAPI

---

## 🎯 Quick Links

- **Get API Key:** https://rapidapi.com/judge0-official/api/judge0-ce
- **Documentation:** https://ce.judge0.com/
- **Full Guide:** See `JUDGE0_API_FIX.md`

---

## 💡 Alternative: Self-Host (No API Key Needed)

```bash
# Using Docker
docker run -p 2358:2358 -d judge0/judge0:latest

# Update .env
VITE_JUDGE0_API_URL="http://localhost:2358"
VITE_JUDGE0_API_KEY=""
```

---

## ✅ After Fixing

You'll be able to:
- ✅ Execute code in C, C++, Python
- ✅ Run test cases automatically
- ✅ Get compilation errors
- ✅ Measure execution time and memory

---

**Need Help?** Check `JUDGE0_API_FIX.md` for detailed instructions.
