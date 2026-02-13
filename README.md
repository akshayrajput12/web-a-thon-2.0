# HireSense AI

**AI-Powered Personalized Learning Path Generator**  
*Team ID: 11013*

HireSense AI is an end-to-end AI-powered career intelligence and interview preparation platform designed to help students, developers, and job seekers prepare, practice, and get hired effectively.

The platform combines **Resume Analysis**, **AI Mock Interviews**, **AI Avatar Interviewers**, **Live Coding Assessments**, **Selection Probability Prediction**, **Job Scraping**, and an **AI Job Recommendation Feed** into a single ecosystem.

---

## 💡 Idea Overview

The goal is to create a single ecosystem where a candidate can:
*   Analyze their resume for ATS optimization.
*   Practice real interview scenarios with AI.
*   Take coding rounds with real-time evaluation.
*   Get evaluated by AI Avatars.
*   Discover jobs personalized to their profile.
*   Track hiring probability.

This transforms traditional job preparation into a data-driven, AI-guided journey.

---

## 🚩 Problem Statement

Current job seekers face multiple fragmented challenges:
*   **No personalized interview preparation**: Generic advice instead of tailored feedback.
*   **Lack of real-time feedback**: Candidates don't know where they failed.
*   **Limited coding practice**: Sandbox environments often lack role-specific context.
*   **Generic job recommendations**: Job feeds don't account for actual skill fit.
*   **Poor Resume ATS optimization**: Good candidates get filtered out by bots.
*   **No hiring probability insights**: Users apply blindly without knowing their chances.

**HireSense AI solves these problems by integrating all career preparation tools into one intelligent platform.**

---

## 🚀 Our Approach

Our approach is **AI-first, modular, and scalable**.

1.  **Resume Intelligence**: Resume is parsed and analyzed using AI to extract skills, experience, ATS score, and gaps.
2.  **Interview Simulation**: AI generates HR + Technical + Behavioral questions tailored to the candidate’s resume and job role.
3.  **Avatar Interaction**: A realistic AI avatar conducts interviews via voice and video simulation.
4.  **Live Coding Assessment**: Role-based coding problems are generated and evaluated using real test cases.
5.  **Selection Prediction**: AI predicts hiring probability using combined performance metrics.
6.  **AI Job Feed**: Jobs are scraped and ranked based on candidate fit score and skills match.

---

## ✨ Core Features

*   **Resume ATS Analyzer**: Detailed feedback on formatting, keywords, and content.
*   **AI Question Generator**: Dynamic questions based on your specific profile.
*   **Mock Interview Practice**: Realistic simulation of interview environments.
*   **AI Avatar Interviewer**: Interactive avatar that speaks and listens.
*   **Voice Interaction**: Speech-to-text and text-to-speech integration.
*   **Live Coding Round**: Integrated Monaco editor with multi-language support.
*   **Auto Test Case Evaluation**: Instant feedback on your code's correctness and efficiency.
*   **Final Hiring Prediction**: Data-driven insights on your readiness.
*   **Job Scraper Integration**: Real-time job listings from multiple sources.
*   **AI Job Recommendation Feed**: Smart matching for relevant opportunities.
*   **Personalized Reports Dashboard**: Track your progress over time.

---

## 🛠️ Tech Stack

### Frontend
*   **React JS**: Core UI framework.
*   **Tailwind CSS**: Utility-first styling.
*   **Framer Motion**: Advanced animations and micro-interactions.

### Backend & Database
*   **Supabase**: PostgreSQL database, Authentication, and Storage.
*   **Node.js Edge Functions**: Serverless compute for API integrations.

### AI & API Integrations
*   **LLM Engine**: **Gemini Pro API** (Core intelligence).
*   **Speech Processing**:
    *   **Deepgram** (Speech-to-Text).
    *   **ElevenLabs** (Text-to-Speech).
*   **Avatar Interviewer**: D-ID API / HeyGen API.
*   **Coding Engine**: **Judge0** Code Execution API.
*   **Job Data APIs**: RemoteOK, Remotive, Arbeitnow APIs.

### Infrastructure
*   **Hosting**: Vercel / Netlify.
*   **Storage**: Supabase Buckets.

### Key Libraries
*   **Resume Parsing**: `pdfjs-dist`, `mammoth.js`.
*   **UI Components**: `lucide-react`, `shadcn/ui`, `radix-ui`.
*   **Coding Editor**: `monaco-editor`.
*   **Charts**: `recharts`.
*   **Utilities**: `axios`, `date-fns`, `zod`.

---

## � System Flow

`User Signup` → `Profile Creation` → `Resume Upload` → **AI Resume Analysis** →

**Interview Question Generation** → **AI Avatar Interview** → `Voice/Text Answers` → **AI Evaluation** →

**Live Coding Test** → `Code Execution via Judge0` → **AI Code Review** →

**Selection Probability Calculation** →

`Job Scraping APIs` → **AI Job Matching** → **LinkedIn-Style Job Feed** →

**Final Reports Dashboard**

---

## 🔮 Future Enhancements

*   **AI Resume Builder**: Create resumes from scratch using AI.
*   **Company-specific Interview Packs**: Prep for Google, Amazon, etc.
*   **Peer Mock Interviews**: Connect with other users for practice.
*   **AI Career Mentor Chatbot**: 24/7 career advice.
*   **LinkedIn Profile Import**: One-click profile setup.
*   **Auto Job Apply Bot**: Automate the application process.
*   **Salary Predictor**: AI-driven salary estimation provided by market data.
*   **Skill Learning Roadmap Generator**: Customized curriculum to close skill gaps.
*   **Mobile App Version**: Learn on the go.
*   **Recruiter Hiring Dashboard**: For companies to find top talent.

---

## ⚙️ Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/akshayrajput12/web-a-thon-2.0.git
    cd career-compass-ai
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file based on your configuration:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
    VITE_GEMINI_API_KEY=your_gemini_key
    VITE_JUDGE0_API_KEY=your_rapidapi_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 📈 Scalability & Vision

HireSense AI can evolve into a full hiring ecosystem connecting Candidates, Universities, Startups, and Recruiters.

**Future SaaS Monetization:**
*   Premium Interview Packs
*   Unlimited Coding Tests
*   Advanced Avatar Interviews
*   Resume Rewrite Services
*   Hiring Analytics for Companies

---

**Conclusion:** HireSense AI aims to revolutionize career preparation by combining artificial intelligence, immersive interview simulation, and personalized job discovery into one unified platform.
