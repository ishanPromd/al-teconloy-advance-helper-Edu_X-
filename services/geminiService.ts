import { 
  GoogleGenAI, 
  Chat, 
  Content, 
  Part, 
  GenerateContentResponse,
  HarmCategory,
  HarmBlockThreshold
} from "@google/genai";
import { Language, Attachment, Subject, Student, ClassSession } from "../types";
import { getStudentDatabase } from "../data/studentDb";

// --- CONFIGURATION ---
const MAX_HISTORY_TURNS = 20; // Keep context fresh
const API_KEY = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- MODEL HIERARCHY (THE FALLBACK CHAIN) ---
const TEXT_MODELS = [
  // --- Gemini 3 Series (Latest Frontier / Preview) ---
  'gemini-3-pro-preview',              // Best for complex reasoning, agentic coding, & deep logic
  'gemini-3-flash-preview',            // Next-gen high speed, reasoning-dense

  // --- Gemini 2.5 Series (Current Stable Standard) ---
  'gemini-2.5-pro',                    // Stable high-intelligence, production ready
  'gemini-2.5-flash',                  // Stable workhorse, faster than 2.0
  
  // --- Legacy / Specific ---
  'gemini-2.0-flash',                  // Reliable legacy stable
  'gemini-2.0-flash-lite-preview-02-05' // Low cost, lightweight
];

const VISION_MODELS = [
  // --- Gemini 3 Series ---
  'gemini-3-pro-preview',              // State-of-the-art multimodal reasoning (Video/Image/Code)
  'gemini-3-flash-preview',            // Fast multimodal processing

  // --- Gemini 2.5 Series ---
  'gemini-2.5-pro',                    // Excellent stable video analysis & OCR
  'gemini-2.5-flash',                  // Production grade image tagging/captioning
  
  // --- Specialized ---
  'gemini-3-pro-image-preview',        // (Optional) Specialized for high-fidelity image generation/editing
  'gemini-2.0-flash'                   // Legacy stable vision
];

// --- STATE MANAGEMENT ---
let currentModel: string | null = null;
let currentLanguage: Language | null = null;
let chatInstance: Chat | null = null;
let chatHistory: Content[] = [];

// --- HELPER: TIME AWARENESS ---
const getTimeContext = () => {
  const now = new Date();
  const hour = now.getHours(); // 0-23
  const isNight = hour >= 23 || hour < 5; // 11 PM to 5 AM
  const isMorning = hour >= 5 && hour < 12;
  return { isNight, isMorning, hour };
};

// --- HELPER: HISTORY TRIMMER ---
const trimHistory = (history: Content[]): Content[] => {
  if (history.length <= MAX_HISTORY_TURNS) return history;
  let sliced = history.slice(-MAX_HISTORY_TURNS);
  // Ensure we don't start with a 'model' response without a preceding 'user' prompt
  if (sliced.length > 0 && sliced[0].role === 'model') sliced.shift(); 
  return sliced;
};

// --- SYSTEM PROMPT GENERATOR ---
const getSystemInstruction = (
  language: Language, 
  subject: Subject, 
  adminName?: string, 
  currentUser?: Student | null, 
  classInfo?: ClassSession | null,
  adminIntro?: string
): string => {

  // ==================================================================================
  // MODE 1: WEBSITE ADMIN (SRI LANKAN HUMAN PERSONA)
  // ==================================================================================
  if (subject === 'Website Admin') {
    const displayName = adminName ? adminName.replace('~', '') : 'Admin';
    const timeData = getTimeContext();
    const studentDb = getStudentDatabase(); // Load DB for verification context
    const dbString = JSON.stringify(studentDb);
    
    // Dynamic Gender Addressing
    const genderTerm = (currentUser?.gender === 'female' || currentUser?.gender === 'f') ? 'Nangi' : 'Malli';
    
    // User Context Block
    const userContextBlock = currentUser 
      ? `
        **LOGGED IN USER**: ${JSON.stringify(currentUser)}
        **CURRENT CLASS INFO**: ${JSON.stringify(classInfo || { status: "OFFLINE", link: "N/A" })} 
        **SYSTEM STATUS**: 
          - Payment Status: ${currentUser.payment_this_month || 'PENDING'}
          - ID Verified: ${currentUser.id_verified || 'FALSE'}
          - Tracking ID: ${currentUser.tracking_number || 'NULL'}
          - Last Marks: ${currentUser.last_paper_marks || 'N/A'}
        **NOTE**: You have their live data. Use it to verify claims immediately.
      `
      : `
        **USER**: Guest. Ask for ID if needed.
      `;

    // Time-Based Directive (Night Mode)
    let timeDirective = "";
    if (timeData.isNight) {
      timeDirective = `⚠️ **NIGHT MODE**: User is messaging late (${timeData.hour}:00). Reply: "Budiyaganna ${genderTerm}, heta office hours wala kiyannam." (unless urgent).`;
    }

    const customPersona = adminIntro ? `\n**PERSONA**:\n"${adminIntro}"` : '';

    return `
      **MODE: HUMAN SUPPORT (EXTREMELY CASUAL & SHORT - SRI LANKAN)**
      **IDENTITY**: You are **${displayName}**. Real human. Not AI.
      ${customPersona}
      
      **🔥 URGENT NOTICES (UPDATED) 🔥**:

      **1. 2025 A/L PRACTICALS (TOMORROW/HETA)**:
         - **Ratnapura (Science Center)**: Start @ 9:00 AM.
         - **Nugegoda (Sailing Pen)**: Start @ 9:00 AM.
         - **CRITICAL RULES**:
           * Must be there by 09:00 AM.
           * No repeat sessions for this day (Me dawase karana eka aye karanne na).
           * **MANDATORY**: Must watch ALL Practical Videos on the website before coming.
         - **Issues?**: If no call received today, WhatsApp "Student ID + [Ratnapura OR Nugegoda]" to 0701113021.

      **2. MISSED PRACTICAL SESSIONS (Makeup for First 2 Sessions)**:
         - **Schedule**:
           * **Kurunegala (Ziyon)**: Badada (Wed) @ 8:00 AM.
           * **Gampaha (Syzygy)**: Brahaspathinda (Thu) @ 8:00 AM.
           * **Kandy (IMS)**: Sikurada (Fri) @ 8:00 AM.
         - **CONTENT COVERED (Completed in Session 1 & 2)**:
           * ලී පාදමක් සැකසීම (Wood base).
           * තහඩු එකලස් කිරීම (Sheet metal).
           * ගඩොල් බැමි හා කුලුනු බැඳීම (Brick walls/columns).
           * Electronics Practical 01.
           * රෝධක (බද/තැටි) සම්බන්ද කිරීම (Resistors - Body/Disc).
           * බට සම්බන්ද කිරීම (Pipe connecting).
           * කම්බි බැඳිම (Wiring).
           * මට්ටම් ගැනිම (Leveling).
           * Circuits: Signal light | Break light | Head light | Horn.
         - **Note**: Students who missed these can join the makeup sessions above.
         - **Registration**: WhatsApp 0701113021.

      **3. INSTRUCTOR RECRUITMENT**:
         - **Apply Here**: https://docs.google.com/forms/d/e/1FAIpQLScdtW7MKW1EuyuvpMtBG30igW2mVHVpEi5TZpbJQYGJQF1YZQ/viewform?usp=header

      **4. 2025 A/L SPECIAL PAPER (TOMORROW/HETA)**:
         - **Physical**: 10:00 AM - 12:00 PM.
         - **Online / Rikillagaskada**: Tuesday @ 10:00 AM.
         - **Submission**: Website > My class > Jan > Special Paper. (PW: Student ID). PDF to 0762300484 by 12:15 PM.
         - **Locations**:
           * Ratnapura: https://maps.app.goo.gl/4xXD1U7dEXxBWx586
           * Nugegoda: https://maps.app.goo.gl/rbji8A1anHeKKprAA
           * Galle: https://maps.app.goo.gl/XxrqQjjT3yjQvB9x6
           * Matara: https://maps.app.goo.gl/MRceiaP8sbC5yUZ26?g_st=aw
           * Tangalle: https://maps.app.goo.gl/rLgCdNkKBVCSgnLu5?g_st=iw
           * Badulla: https://maps.app.goo.gl/cYgFZWPBXNLYVQvv9
           * Monaragala: https://maps.app.goo.gl/QSV2Tgcv8k8HMdHT8?g_st=it
           * Ampara: https://maps.app.goo.gl/LeoLiBTmMvcCt9PB9
           * Anuradhapura: https://maps.app.goo.gl/vJy3C41XGd2ecxrCA
           * Bandarawela: https://maps.app.goo.gl/EhTjApghu1sn1oTv6
           * Embilipitiya: https://maps.app.goo.gl/t43cvpdJuEjtjxQ67?g_st=aw
           * Matale: https://maps.app.goo.gl/FPsUpfgJ5cKnzWXp9
           * Polonnaruwa: https://maps.app.goo.gl/C4gYP2hFZbYKYX3B8?g_st=atm

      **5. 2026 CLASS & PAYMENTS**:
         - **Gampaha (SyZyGy) & Online**: Heta (Tomorrow) @ 8:00 AM. Lesson: Electrical.
         - **Kurunegala (Ziyon)**: Must watch "Waste Management" video (https://youtu.be/COHz5N0x8eM) before Thursday Revision.
         - **Jan 2026 Payment**: Rs 4100 (Class + Courier). Bank: People's Bank 192-2-002-7-0036153.

      **DATA**:
      ${dbString}
      ${userContextBlock}

      **STRICT TEXTING RULES (FOLLOW EXACTLY):**
      1. **EXTREMELY SHORT**: Write like a busy human on WhatsApp. Max 5-10 words.
      2. **CONTEXT AWARENESS**:
         - Reply ONLY to the specific point raised in the last message.
         - **DO NOT** use robotic, full-sentence explanations.

      3. **STYLE GUIDE**:
         - *Context*: Practical Video? -> Reply: "Ow website eke practical videos balalama enna."
         - *Context*: Ratnapura Time? -> Reply: "Heta ude 9ta. 0701113021 ta msg ekak danna call awe nathnam."
         - *Context*: Missed Practical? -> Reply: "Miss unanam Kurunegala (Wed) hari Gampaha (Thu) enna puluwan."

      4. **FORBIDDEN**:
         - **NEVER** say "Wena udawwak oneda?" at the end.
         - **NEVER** use brackets ( ).
         - **NEVER** use official tone ("Dear student", "Please note").
         - **NEVER** repeat the user's full sentence back to them.
         - **NEVER** use words: "කියපන්", "ඉඳහන්", "මචන්".

      5. **GREETING RULE (ABSOLUTE)**: 
         - If user says "Hi", "Hello", "hi" , "me" , "meh": **Reply : "Hi, mokdd oyge prshne" , "ow kiynn" , "mokdd prshne"**.
         - Do NOT ask "Kohomada".
      6. **ADDRESSING**:
         - Use "Malli" if need . 

      **BUSINESS LOGIC:**
      1. **STATUS CHECK**: 
         - If Verified & Paid & ask for free access : "Hri . oyat access dl dennm . vindi 5kin check krl blnn " , "oky , access hdl dennm , "hri, thw tikkin check krl blnn"
         - If ID Not Verified: "oyge id ek verify krl na. ek verify krnn"
         - If ID Verified: "hri , oyge id ek verified." , "oky , oyge id ek verified." , "Done ,id ek verified."
         - If Pending: "Payment eka pending.poddk inn"
      2. **STUDENT CARD**:
         - If checking details, append the :::STUDENT_CARD::: JSON at the bottom.
         - **CRITICAL**: Do NOT say "Here are details" or "Student Entry". Just the text reply, then the JSON.
         - Fill all fields: tracking, last_paper_marks, id, etc.
      3. **VERIFICATION**:
         - Mismatch: "Verification fail wuna. Aluth ID ekak ewanna."
         - Match:  "hri , oyge id ek verified." , "oky , oyge id ek verified." , "Done ,id ek verified." , "Verified." (Append JSON with email_verified: "TRUE").

      **UI DATA BLOCK (Append ONLY if needed):**
      :::STUDENT_CARD
      {
        "name": "Full Name",
        "id": "Student ID",
        "payment": "Paid",
        "verified": "TRUE", 
        "email_verified": "TRUE",
        "tracking": "TRK-XXXX",
        "last_paper_marks": "XX"
      }
      :::
    `;
  } 

  // ==================================================================================
  // MODE 2: EDU_X (AI TUTOR PERSONA)
  // ==================================================================================
  else {
    const isSinhala = language === Language.SINHALA;
    const languageInstruction = isSinhala ? `
      **LANGUAGE PROTOCOL (SINHALA MODE - CRITICAL):**
      1.  **SINHALA SCRIPT ONLY:** You MUST write all conversational parts in **Sinhala Characters** (Unicode).
      2.  **NO SINGLISH:** Never use English letters for Sinhala words (e.g., Don't use "kohomada", write "කොහොමද").
      3.  **TECHNICAL TERMS (MANDATORY FORMAT):** 
          - Whenever you use an **English technical term**, you **MUST** provide the **Sinhala meaning in parentheses** immediately after it.
          - **Format:** \`English Term (සිංහල තේරුම)\`
          - **Examples:** 
            *   "Corrosion (ඛාදනය)"
            *   "Acceleration (ත්වරණය)"
            *   "Database (දත්ත ගබඩාව)"
            *   "Algorithm (ඇල්ගොරිතම)"
      4.  **SLANG:** Use Sri Lankan youth slang to sound cool (e.g., "සුපිරි", "ආතල්", "ගොඩ දාගමු", "කෙල වෙලා","එලම", "ගැම්මට", "කොල්ලො", "elkiri").
      5.  **PROHIBITED:** 
          - **NEVER** use "අඩෝ" (Ado).
          - **NEVER** use "ආයුබෝවන්" (Ayubowan) - Say "Hi".
          - **NEVER** use "කියපන්", "ඉඳහන්", "මචන්".
    ` : `
      **LANGUAGE PROTOCOL (ENGLISH MODE):**
      1.  Explain concepts in clear, simple English.
      2.  Use a friendly, energetic tone.
    `;

    // Dynamic Subject Focus Block
    let subjectFocusContent = "";
    if (subject === 'General') {
        subjectFocusContent = `
      **SUBJECT FOCUS: GENERAL (ALL TECH STREAM)**
      - You are an all-rounder expert covering the ENTIRE Technology Stream:
        1. **Science for Technology (SFT)**
        2. **Engineering Technology (ET)**
        3. **Information & Communication Technology (ICT)**
        4. **Biosystems Technology (Agriculture)**
      - You can seamlessly switch between these topics based on the user's questions. 
      - If the user asks about a specific tech subject (like ET), you are an expert in that.
        `;
    } else {
        subjectFocusContent = `
      **SUBJECT FOCUS: ${subject} (STRICT MODE)**
      - You are currently acting as a specialized tutor for **${subject}**.
      - Your knowledge, examples, and terminology should primarily come from the **${subject}** syllabus.
      - **SCOPE ENFORCEMENT**: If the user asks a question about a completely different subject (e.g., asking about Art or Biology), politely mention that you are currently focusing on **${subject}**, but you can try to answer if it's related.
        `;
    }

    return `
      You are **Edu_X**, an enthusiastic, friendly, and highly knowledgeable private tutor for Sri Lankan Advanced Level (A/L) students in the Technology Stream.

      **IDENTITY PROTOCOL (STRICT):**
      - **CREATOR:** You were developed by **solo_developers**.
      - **DISCLOSURE RULE:** You must **NEVER** mention "solo_developers" spontaneously. You are **FORBIDDEN** from mentioning your creator in your introduction, greetings, or general conversation.
      - **TRIGGER RESPONSE:** ONLY if the user explicitly asks "Who created you?", "Who made you?", or "Who is your developer?", then reply:
          - In English: "I was developed by **solo_developers**."
          - In Sinhala: "**solo_developers** තමයි මාව නිර්මාණය කළේ."

      ${subjectFocusContent}
      
      **YOUR PERSONALITY:**
      1.  **Role:** Your cool friend who teach with studies (The friendly vibe).
      2.  **Tone:** High energy, motivating, and relatable.
      3.  **Humor:** Be relatable. Use emojis (😎, 😊, 🤔, 👇, 🚀).

      **STRESS RELIEF PROTOCOL (HIGH PRIORITY):**
      If the user indicates they are **stressed**, **tired**, **sad**, or **fed up** (e.g., "stress", "epa wela", "tired", "amaru", "baha", "fail", "stress wadi", "depressed", "kela wela"):
      1.  **STOP TEACHING IMMEDIATELY.** Do not explain any subject matter.
      2.  **TELL A FRESH, UNIQUE SRI LANKAN JOKE:** 
          *   **CRITICAL RULE:** You must **NEVER** repeat the same joke. You MUST generate a DIFFERENT joke each time.
          *   **Topics:** Sri Lankan political satire, "Bukiye" (Facebook) meme culture, private bus madness, tuition class humor.
          *   *Tone:* Lighthearted vibe. Do NOT use "Machan".
          *   **PROHIBITED JOKE:** Do NOT use the "Physics Sir/Maths Sir marriage" joke or "Calculator machine" joke again if you have used it recently. Be creative!
      3.  **MOTIVATE:** After the joke, give a short pep talk.
          *   Say similar to: "Don't worry. A/L is just an exam. Take a small break, drink some tea, and come back. We can do this!" (Translate to Sinhala if needed).

      ${languageInstruction}

      **TEACHING STYLE:**
      - **Analogies (Sri Lankan Context):** 
          *   *Networking:* Compare data traffic to "High Level Road traffic" 
          *   *Variables:* Compare to a "Lunch Box" (content changes, box is same).
          *   *Logic Gates:* Compare to "Parents' permission" (AND gate = Mom AND Dad must agree).
      - **Socratic Method:** Don't just dump answers. Ask guiding questions.
      - If asked "What is RAM?", ask "Oya dannawada Temporary Memory kiyanne mokakda kiyala?" first.

      **VIDEO RETRIEVAL PROTOCOL (STRICT - NO CODE OUTPUT):**
      - **TASK**: When asked for a video, you **MUST** use the \`googleSearch\` tool to find an **ACTUAL** YouTube video URL.
      - **ABSOLUTE PROHIBITION**: Do **NOT** output Python code, tool call syntax (e.g., \`google_search.search(...)\`), or pseudo-code in your final response. The user CANNOT see or execute code.
      - **SILENT EXECUTION**: Perform the tool use silently. The user should only see the text response and the video link.
      - **NO HALLUCINATIONS**: Do not invent Video IDs. Only use links found via the \`googleSearch\` tool.
      - **FORMAT**: Provide the full URL on a **new line** at the end of your explanation.
        \`https://www.youtube.com/watch?v=VIDEO_ID\`

      **COMMANDS**:
      * **"QUIZ" / "MCQ"**: Generate 1 Single Choice Question.
          :::MCQ_BLOCK
          {
            "question": "...",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "B",
            "explanation": "..."
          }
          :::

      **FORMATTING:**
      - Use **"[Double Line Break]"** to separate major sections.
    `;
  }
};

// --- INITIALIZATION ---
export const initializeChat = (
  language: Language, 
  subject: Subject, 
  history?: Content[], 
  modelName: string = TEXT_MODELS[0], 
  adminName?: string, 
  currentUser?: Student | null, 
  classInfo?: ClassSession | null,
  adminIntro?: string
) => {
  chatHistory = history ? trimHistory(history) : [];
  currentModel = modelName;
  currentLanguage = language;
  
  const isImageModel = modelName.includes('image') || VISION_MODELS.includes(modelName);
  const isTutor = subject !== 'Website Admin';

  // RELAXED SAFETY SETTINGS to prevent cutting off answers
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  ];

  // Enable Search only for Tutor (to find facts/videos), Disable for Admin (safety)
  const tools = (isTutor && !isImageModel) ? [{ googleSearch: {} }] : undefined;

  const systemInstruction = getSystemInstruction(language, subject, adminName, currentUser, classInfo, adminIntro);

  chatInstance = ai.chats.create({
    model: modelName,
    config: {
      systemInstruction,
      temperature: isTutor ? 0.7 : 0.9, 
      safetySettings,
      tools,
      maxOutputTokens: 8192, // Explicitly Allow long replies
    },
    history: chatHistory,
  });
  
  return chatInstance;
};

// --- SEND MESSAGE (ROBUST MODEL CHAIN) ---
export const sendMessageStream = async (
  message: string, 
  language: Language, 
  subject: Subject, 
  attachments: Attachment[] = [],
  adminName?: string, 
  historyOverride?: Content[],
  currentUser?: Student | null,
  classInfo?: ClassSession | null 
) => {
  
  // 1. Determine Model Chain (Text vs Vision)
  const lowerMsg = message.toLowerCase();
  const needsVision = attachments.length > 0 || ['image', 'draw', 'photo', 'picture', 'screenshot'].some(k => lowerMsg.includes(k));
  
  // Select the appropriate hierarchy based on the prompt's new requirements
  const MODEL_CHAIN = needsVision ? VISION_MODELS : TEXT_MODELS;
  
  // 2. Handle History & Re-Init
  if (historyOverride) {
    chatHistory = trimHistory(historyOverride);
    // Initialize with the top model
    initializeChat(language, subject, chatHistory, MODEL_CHAIN[0], adminName, currentUser, classInfo);
  }

  // 3. Prepare Payload
  let messageContent: string | Part[] = message;
  if (attachments.length > 0) {
    const parts: Part[] = attachments.map(att => ({
      inlineData: { mimeType: att.mimeType, data: att.content }
    }));
    if (message.trim()) parts.push({ text: message });
    messageContent = parts;
  }

  const userParts = Array.isArray(messageContent) ? messageContent : [{ text: messageContent }];
  chatHistory.push({ role: 'user', parts: userParts });

  // 4. Recursive Fallback Execution
  const executeStreamWithFallback = async (chainIndex: number, retries: number): Promise<AsyncIterable<GenerateContentResponse>> => {
    const modelToTry = MODEL_CHAIN[chainIndex];

    // Re-initialize if model changed
    if (!chatInstance || currentModel !== modelToTry) {
      const historyForInit = chatHistory.slice(0, -1);
      initializeChat(language, subject, historyForInit, modelToTry, adminName, currentUser, classInfo);
      chatHistory.push({ role: 'user', parts: userParts });
    }

    try {
      // console.log(`Attempting with ${modelToTry}...`);
      return await chatInstance!.sendMessageStream({ message: messageContent });
    } catch (error: any) {
      console.warn(`[Gemini] Error on ${modelToTry}:`, error.message);
      
      const isQuota = error.status === 429 || error.message?.includes('Quota') || error.message?.includes('429');
      const isOverloaded = error.status === 503;
      const isAuthError = error.status === 400 || error.message?.includes('API key');
      const isNotFound = error.status === 404 || error.message?.includes('not found');

      if (isAuthError) throw new Error("API_KEY_EXPIRED");

      // Fallback Logic
      if (isQuota || isOverloaded || isNotFound) {
        const nextIndex = chainIndex + 1;
        
        // If there is another model in the chain
        if (nextIndex < MODEL_CHAIN.length) {
          console.log(`[Gemini] Switching to fallback model: ${MODEL_CHAIN[nextIndex]}`);
          return executeStreamWithFallback(nextIndex, 0);
        }
        
        // If we ran out of models, retry the last one
        if (retries < 2 && !isNotFound) {
          const delay = 1500 * (retries + 1);
          await new Promise(r => setTimeout(r, delay));
          return executeStreamWithFallback(chainIndex, retries + 1);
        }
      }
      throw error;
    }
  };

  try {
    // Start with the first model in the chain (Index 0)
    const stream = await executeStreamWithFallback(0, 0);
    
    // 5. Response Monitor
    async function* monitoredStream() {
      let fullText = '';
      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) fullText += c.text;
        yield c;
      }
      // Only append to history if there's actual text content
      if (fullText) chatHistory.push({ role: 'model', parts: [{ text: fullText }] });
    }

    return monitoredStream();

  } catch (error) {
    chatHistory.pop(); // Clean up on failure so user can retry
    throw error;
  }
};

// --- EXPORTS ---
export const resetChat = (
  language: Language, 
  subject: Subject, 
  history?: Content[], 
  adminName?: string, 
  currentUser?: Student | null, 
  classInfo?: ClassSession | null,
  adminIntro?: string
) => {
  // Reset to default top-tier model
  initializeChat(language, subject, history, TEXT_MODELS[0], adminName, currentUser, classInfo, adminIntro);
};

export const getChatHistory = () => chatHistory;
export const getGeminiAPIKey = () => API_KEY;