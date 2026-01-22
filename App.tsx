
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, GraduationCap, Paperclip, Mic, X, FileText, Globe, Plus, Download, Trash2, History, ShieldAlert, UserCog, Clock, Reply as ReplyIcon, Sparkles, Bot, Lock, Search, Image as ImageIcon } from 'lucide-react';
import { initializeChat, sendMessageStream, resetChat, getChatHistory } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { QuickPrompts } from './components/QuickPrompts';
import { ConfirmationModal } from './components/ConfirmationModal';
import { HistoryModal } from './components/HistoryModal';
import { AdminAgentManager } from './components/AdminAgentManager';
import { StudentLookupModal } from './components/StudentLookupModal';
import { Message, Language, Attachment, Subject, DeliveryInfo, ReplyInfo, GroundingMetadata, Student, AdminAgent } from './types';
import { GenerateContentResponse, Content, Part } from '@google/genai';
import { getStudentDatabase } from './data/studentDb';

// --- Web Speech API Type Definitions ---
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}
// ---------------------------------------

const DEFAULT_ADMIN_NAMES = [
  "~ishan", 
  "~vihanga", 
  "~charuka", 
  "~praveen", 
  "ayesha", 
  "~geeth", 
  "~lavan", 
  "~prageeth"
];

// Convert simple names to AdminAgent objects for init
const INITIAL_AGENTS: AdminAgent[] = DEFAULT_ADMIN_NAMES.map((name, i) => ({
    id: `default_${i}`,
    name: name,
    intro: ''
}));

const LOCAL_STORAGE_KEY = 'edux_app_state_v1';
const USER_EMAIL_KEY = 'edux_user_email';
const SUPER_ADMIN_EMAIL = '26002ishan@gmail.com';

interface StoredState {
  ai: { messages: Message[], subject: Subject };
  admin: { messages: Message[], adminName: string };
  mode: 'AI' | 'ADMIN';
  language: Language;
  currentUser?: Student | null;
  adminAgents?: AdminAgent[]; // Persist added agents
}

const App: React.FC = () => {
  // Mode State
  const [appMode, setAppMode] = useState<'AI' | 'ADMIN'>('AI');
  const [currentAdminName, setCurrentAdminName] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  
  // Admin Agents State
  const [adminAgents, setAdminAgents] = useState<AdminAgent[]>(INITIAL_AGENTS);
  const [showAgentManager, setShowAgentManager] = useState(false);
  const [showStudentLookup, setShowStudentLookup] = useState(false);
  
  // Derived Admin Status
  const isSuperAdmin = currentUser?.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // Use ref to track mode inside async operations
  const appModeRef = useRef<'AI' | 'ADMIN'>('AI');

  // Chat Data Stores
  const [messages, setMessages] = useState<Message[]>([]);
  // Ref to access latest messages in closures (like timeouts)
  const messagesRef = useRef<Message[]>([]);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  // Storage for switching - DEFAULT SUBJECT CHANGED TO 'ET'
  const aiSession = useRef<{ messages: Message[], subject: Subject, history: Content[] }>({ messages: [], subject: 'ET', history: [] });
  const adminSession = useRef<{ messages: Message[], history: Content[] }>({ messages: [], history: [] });

  // Admin Queue Refs
  const lastScheduledReplyTime = useRef<number>(0);
  const activeTypingCount = useRef<number>(0);
  
  // Batching Refs
  const pendingAdminMessages = useRef<string[]>([]);
  const pendingAdminAttachments = useRef<Attachment[]>([]);
  const adminBatchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUserMessageIds = useRef<Set<string>>(new Set());
  
  // Admin Reply Logic Refs
  const lastUserMessageForAdminReplyRef = useRef<Message | null>(null);
  
  // Admin Timer State
  const [replyEta, setReplyEta] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // UI State
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Controls the visual "bubble"
  // DEFAULT LANGUAGE SET TO SINHALA as requested for replies
  const [language, setLanguage] = useState<Language>(Language.SINHALA);
  // DEFAULT SUBJECT CHANGED TO 'ET'
  const [subject, setSubject] = useState<Subject>('ET');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Modal State
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Popups
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState(false); // New popover state

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const subjectMenuRef = useRef<HTMLDivElement>(null);
  const historyMenuRef = useRef<HTMLDivElement>(null);

  // Track last message ID for auto-scroll
  const lastMessageIdRef = useRef<string | null>(null);

  // Update appModeRef
  useEffect(() => {
    appModeRef.current = appMode;
  }, [appMode]);

  // Helper to convert Messages to Content[] for Gemini
  const convertMessagesToHistory = (msgs: Message[]): Content[] => {
    return msgs
      .filter(m => !m.isSystem && !m.isError)
      .map(m => ({
        role: m.role,
        parts: m.attachments 
          ? [...m.attachments.map(a => ({ inlineData: { mimeType: a.mimeType, data: a.content } })), { text: m.content }] 
          : [{ text: m.content }]
      }));
  };

  // --- Scroll Logic ---
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];

    // If it is a new message (id changed), scroll to the top of it
    if (lastMsg.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMsg.id;
        
        // Small timeout to allow DOM to render the new message bubble
        setTimeout(() => {
            const element = document.getElementById(`message-${lastMsg.id}`);
            if (element) {
                // Scroll the element's top into view with a bit of margin (handled by scroll-mt css class)
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }
  }, [messages]);

  // --- Local Storage Loading (Hydration) ---
  useEffect(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedEmail = localStorage.getItem(USER_EMAIL_KEY);
    
    // Attempt to login user via saved email
    let activeUser: Student | null = null;
    if (savedEmail) {
        const db = getStudentDatabase();
        const user = db.find(s => s.email.toLowerCase() === savedEmail.toLowerCase());
        if (user) {
            activeUser = user;
            setCurrentUser(user);
        }
    }

    if (savedState) {
      try {
        const parsed: StoredState = JSON.parse(savedState);
        
        // Restore Language
        setLanguage(parsed.language);

        // Restore Session Refs
        aiSession.current = {
           messages: parsed.ai.messages,
           subject: parsed.ai.subject || 'ET', // Fallback to ET
           history: convertMessagesToHistory(parsed.ai.messages)
        };
        
        adminSession.current = {
           messages: parsed.admin.messages,
           history: convertMessagesToHistory(parsed.admin.messages)
        };

        // Restore Admin Data
        if (parsed.admin.adminName) setCurrentAdminName(parsed.admin.adminName);
        if (parsed.adminAgents) setAdminAgents(parsed.adminAgents);
        
        // Use activeUser from dedicated email storage if available, otherwise fall back to state object
        const resolvedUser = activeUser || parsed.currentUser;
        if (resolvedUser && !activeUser) setCurrentUser(resolvedUser);

        // Set Active Mode Data
        // IMPORTANT: Only restore ADMIN mode if logged in
        if (parsed.mode === 'ADMIN' && resolvedUser) {
          setAppMode('ADMIN');
          setMessages(parsed.admin.messages);
          setSubject('Website Admin');
          
          // Find agent details for current admin name
          const agent = parsed.adminAgents?.find(a => a.name === parsed.admin.adminName) 
                     || INITIAL_AGENTS.find(a => a.name === parsed.admin.adminName)
                     || { intro: '' };
                     
          initializeChat(parsed.language, 'Website Admin', adminSession.current.history, undefined, parsed.admin.adminName, resolvedUser, null, agent.intro);
        } else {
          setAppMode('AI');
          setMessages(parsed.ai.messages);
          setSubject(parsed.ai.subject || 'ET'); // Fallback to ET
          initializeChat(parsed.language, parsed.ai.subject || 'ET', aiSession.current.history);
        }

      } catch (e) {
        console.error("Failed to load saved state", e);
        // Fallback init
        initializeChat(language, subject);
      }
    } else {
      // First load init
      initializeChat(language, subject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Local Storage Saving (Debounced) ---
  useEffect(() => {
    const saveState = () => {
      // Ensure refs are up to date with current state before saving
      let currentAiMessages = aiSession.current.messages;
      let currentAiSubject = aiSession.current.subject;
      let currentAdminMessages = adminSession.current.messages;
      let currentAdminNameVal = currentAdminName;

      if (appMode === 'AI') {
         currentAiMessages = messages;
         currentAiSubject = subject;
      } else {
         currentAdminMessages = messages;
      }

      const stateToSave: StoredState = {
        ai: {
          messages: currentAiMessages,
          subject: currentAiSubject
        },
        admin: {
          messages: currentAdminMessages,
          adminName: currentAdminNameVal
        },
        mode: appMode,
        language: language,
        currentUser: currentUser,
        adminAgents: adminAgents // Persist custom agents
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    };

    // Debounce the save operation to avoid blocking the main thread during typing/streaming
    const timeoutId = setTimeout(saveState, 1000);
    return () => clearTimeout(timeoutId);

  }, [messages, appMode, language, subject, currentAdminName, currentUser, adminAgents]);


  // Timer Effect
  useEffect(() => {
    if (!replyEta) {
        setTimeRemaining('');
        return;
    }

    const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, replyEta - now);
        
        if (diff === 0) {
            setTimeRemaining('');
            return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.ceil((diff % 60000) / 1000);
        
        if (minutes > 0) {
            setTimeRemaining(`${minutes}m ${seconds}s`);
        } else {
            setTimeRemaining(`${seconds}s`);
        }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [replyEta]);

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
      if (subjectMenuRef.current && !subjectMenuRef.current.contains(event.target as Node)) {
        setShowSubjectMenu(false);
      }
      if (historyMenuRef.current && !historyMenuRef.current.contains(event.target as Node)) {
        setShowHistoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputText]);

  // Mode Switching Logic
  const handleModeSwitch = () => {
      if (appMode === 'AI') {
          if (!currentUser) {
            alert("Please login first to access Support.");
            return;
          }
          switchToAdminMode();
      } else {
          switchToAIMode();
      }
      setShowHistoryMenu(false); // Close menu after switch
  };

  const handleLogin = (email: string) => {
    const db = getStudentDatabase();
    const user = db.find(s => s.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
        setCurrentUser(user);
        // Persist email immediately
        localStorage.setItem(USER_EMAIL_KEY, user.email);
    } else {
        alert("Email not found in student database.");
        setCurrentUser(null);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    // Remove persistent email
    localStorage.removeItem(USER_EMAIL_KEY);
    setShowAgentManager(false);
    setShowStudentLookup(false);
    
    if (appMode === 'ADMIN') {
      switchToAIMode();
    }
  };

  // Agent Management Handlers
  const handleAddAgent = (newAgent: AdminAgent) => {
      setAdminAgents(prev => [...prev, newAgent]);
  };

  const handleEditAgent = (updatedAgent: AdminAgent) => {
      setAdminAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
      // If editing current active admin, update chat
      if (appMode === 'ADMIN' && currentAdminName === updatedAgent.name) {
          initializeChat(language, 'Website Admin', adminSession.current.history, undefined, updatedAgent.name, currentUser, null, updatedAgent.intro);
      }
  };

  const handleRemoveAgent = (id: string) => {
      setAdminAgents(prev => prev.filter(a => a.id !== id));
      // If removed current admin, switch to default or random
      const removedAgent = adminAgents.find(a => a.id === id);
      if (appMode === 'ADMIN' && removedAgent && currentAdminName === removedAgent.name) {
          const remaining = adminAgents.filter(a => a.id !== id);
          if (remaining.length > 0) {
             const next = remaining[0];
             setCurrentAdminName(next.name);
             initializeChat(language, 'Website Admin', adminSession.current.history, undefined, next.name, currentUser, null, next.intro);
          } else {
             switchToAIMode(); // No admins left, fallback
          }
      }
  };

  const switchToAdminMode = () => {
      // Save AI State
      aiSession.current = {
        messages: messages,
        subject: subject,
        history: convertMessagesToHistory(messages)
      };

      // Randomly select agent if not set
      let agentName = currentAdminName;
      let agent = adminAgents.find(a => a.name === agentName);

      if (!agentName || !agent) {
         agent = adminAgents[Math.floor(Math.random() * adminAgents.length)];
         agentName = agent.name;
         setCurrentAdminName(agentName);
      }
      
      // Reset Queue
      lastScheduledReplyTime.current = 0;
      activeTypingCount.current = 0;
      setReplyEta(null);
      // Reset Buffer
      pendingAdminMessages.current = [];
      pendingAdminAttachments.current = [];
      pendingUserMessageIds.current.clear();
      if (adminBatchTimeout.current) clearTimeout(adminBatchTimeout.current);

      // Setup Admin State
      setAppMode('ADMIN');
      setMessages(adminSession.current.messages);
      setSubject('Website Admin'); // Internal Subject
      setInputText('');
      setAttachments([]);
      setReplyingTo(null);
      
      // Init Chat for Admin
      resetChat(language, 'Website Admin', adminSession.current.history, agentName, currentUser, null, agent.intro);
      setShowHistoryMenu(false);
  };

  const switchToAIMode = () => {
    // Save Admin State
    adminSession.current = {
      messages: messages,
      history: convertMessagesToHistory(messages)
    };
    
    // Clear Admin Buffer
    pendingAdminMessages.current = [];
    pendingAdminAttachments.current = [];
    pendingUserMessageIds.current.clear();
    if (adminBatchTimeout.current) clearTimeout(adminBatchTimeout.current);

    // Restore AI State
    setAppMode('AI');
    setMessages(aiSession.current.messages);
    setSubject(aiSession.current.subject);
    setInputText('');
    setAttachments([]);
    setReplyEta(null);
    setReplyingTo(null);
    setShowStudentLookup(false);

    // Restore Chat for AI
    resetChat(language, aiSession.current.subject, aiSession.current.history);
    setShowHistoryMenu(false);
  };

  const handleLanguageChange = (newLang: Language) => {
    setShowLanguageMenu(false);
    if (newLang === language) return;
    setLanguage(newLang);
    
    let adminIntro: string | undefined = undefined;
    if (appMode === 'ADMIN') {
        const agent = adminAgents.find(a => a.name === currentAdminName);
        if (agent) adminIntro = agent.intro;
    }

    // Re-init current session
    initializeChat(newLang, subject, undefined, undefined, appMode === 'ADMIN' ? currentAdminName : undefined, currentUser, null, adminIntro);
    
    setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: newLang === Language.SINHALA ? "භාෂාව සිංහලට මාරු කරන ලදී." : "Language switched to English.",
        timestamp: Date.now(),
        isSystem: true,
        mode: appMode
    }]);
  };

  const handleSubjectChange = (newSubject: Subject) => {
    setShowSubjectMenu(false);
    if (newSubject === subject) return;

    // Logic: Force English if switching to General
    let targetLang = language;
    if (newSubject === 'General') {
        targetLang = Language.ENGLISH;
        setLanguage(Language.ENGLISH);
    }

    setSubject(newSubject);
    
    // Update ref immediately so calls during this cycle use correct subject
    aiSession.current.subject = newSubject;
    
    const systemMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: targetLang === Language.SINHALA 
            ? `අවධානය ${newSubject} වෙත වෙනස් කරන ලදී.`
            : `Focus switched to ${newSubject}.`,
        timestamp: Date.now(),
        isSystem: true,
        mode: 'AI'
    };
    setMessages(prev => [...prev, systemMsg]);
    
    // Force re-initialization with new subject and language
    initializeChat(targetLang, newSubject, undefined, undefined, undefined, currentUser);
  };

  // Callback wrapper for stability
  const handleReplyToMessage = useCallback((msg: Message) => {
    setReplyingTo(msg);
    if (textAreaRef.current) {
        textAreaRef.current.focus();
    }
  }, []);

  // --- Message Delete Handler ---
  const handleDeleteMessage = useCallback((messageId: string) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      // Also clean up local session refs if needed
      if (appMode === 'AI') {
          aiSession.current.messages = aiSession.current.messages.filter(m => m.id !== messageId);
      } else {
          adminSession.current.messages = adminSession.current.messages.filter(m => m.id !== messageId);
      }
  }, [appMode]);

  // --- Verify Student Logic (New) ---
  const handleVerifyStudent = useCallback(async (studentId: string, name: string) => {
      if (appMode !== 'ADMIN') {
          alert("Switch to Support mode to verify.");
          return;
      }

      // Check for recent images in user messages
      const recentImageMessage = [...messagesRef.current]
          .reverse()
          .find(m => m.role === 'user' && m.attachments?.some(a => a.type === 'image'));

      if (!recentImageMessage) {
          // Send system prompt to ask for image
          const prompt = `System: The user wants to verify ID for ${name} (${studentId}) but has not uploaded an image yet. Ask them to upload the NIC.`;
          handleSendMessage(prompt, []); // Using handleSendMessage here essentially mocks a user input to trigger the AI response, but we might want a cleaner way.
          
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              content: "Malli, verification ekata kalin NIC eke photo ekak upload karanna.",
              timestamp: Date.now(),
              mode: 'ADMIN',
              adminName: currentAdminName
          }]);
          return;
      }

      // Trigger verification prompt - REFINED
      const verificationPrompt = `[SYSTEM_ACTION]: Perform Strict Identity Verification.
Target Student: ${name} (${studentId}).
Task: Analyze the recently uploaded ID image. Compare the Name and ID number on the card VISUALLY against the Target Student details.
If they match exactly (or have matching initials), confirm verification.
If there is a mismatch (different person, wrong ID number), issue a strict WARNING.`;

      handleSendMessage(verificationPrompt);

  }, [appMode, currentAdminName]); // Dependencies

  // --- Voice Input ---
  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser not supported for voice.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === Language.SINHALA ? 'si-LK' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setInputText(prev => (prev ? prev + ' ' + t : t));
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  // --- File/Image Handling Logic (Common) ---
  const processFile = (file: File) => {
    // Only allow images for drop/paste primarily, but button allows others
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAttachments(prev => [...prev, {
          id: Date.now().toString() + Math.random(),
          type: file.type.startsWith('image/') ? 'image' : 'file',
          mimeType: file.type,
          content: (event.target.result as string).split(',')[1],
          name: file.name
        }]);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- File Input ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    Array.from(files).forEach(processFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Paste Handler ---
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      Array.from(e.clipboardData.files).forEach(processFile);
    }
  };

  // --- Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  };

  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  // --- Clear Chat ---
  const handleClearChatRequest = () => {
    if (messages.length === 0) return;
    setShowClearConfirm(true);
  };
  
  const confirmClearChat = () => {
     setMessages([]);
     setAttachments([]);
     // Reset specific session
     if (appMode === 'ADMIN') {
        adminSession.current = { messages: [], history: [] };
     } else {
        aiSession.current.history = [];
     }
     
     // Look up current admin intro
     let adminIntro: string | undefined = undefined;
     if (appMode === 'ADMIN') {
         const agent = adminAgents.find(a => a.name === currentAdminName);
         if (agent) adminIntro = agent.intro;
     }

     resetChat(language, subject, [], appMode === 'ADMIN' ? currentAdminName : undefined, currentUser, null, adminIntro);
     setShowClearConfirm(false);
     setShowHistoryMenu(false);
     setReplyingTo(null);
  };

  // --- Export Chat ---
  const handleExportRequest = () => {
    if (messages.length > 0) {
        setShowExportModal(true);
    }
  };

  const handleExportOption = (format: string) => {
    const content = messages.map(m => {
        const role = m.role === 'user' ? 'User' : (m.mode === 'ADMIN' ? (m.adminName || 'Support') : 'Edu_X');
        const time = new Date(m.timestamp).toLocaleString();
        return `[${time}] ${role}:\n${m.content}\n`;
    }).join('\n' + '-'.repeat(40) + '\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edux-chat-history.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  // --- Admin Logic Execution (Separated) ---
  const triggerAdminReplyLogic = async (text: string, attachments: Attachment[], batchSize: number) => {
      const now = Date.now();
      const isQueueActive = lastScheduledReplyTime.current > now;
      let baseTime = isQueueActive ? lastScheduledReplyTime.current : now;
      let delay = 1000;
      const scheduledTime = baseTime + delay;
      lastScheduledReplyTime.current = scheduledTime;
      setReplyEta(scheduledTime);
      const timeUntilReply = scheduledTime - now;
      const typingStartTime = scheduledTime - 900;
      const timeUntilTyping = Math.max(0, typingStartTime - now);

      setTimeout(() => {
          if (appModeRef.current === 'ADMIN') {
              activeTypingCount.current += 1;
              setIsLoading(true);
              setMessages(prev => prev.map(msg => 
                msg.role === 'user' && (!msg.deliveryInfo || pendingUserMessageIds.current.has(msg.id))
                  ? { ...msg, deliveryInfo: { deliveredAt: Date.now() - 1000, seenAt: Date.now() } }
                  : msg
              ));
          }
      }, timeUntilTyping);

      setTimeout(async () => {
          const adminNameForReply = currentAdminName; 
          
          // Fetch current intro for this admin
          const agent = adminAgents.find(a => a.name === adminNameForReply);
          const currentIntro = agent?.intro;

          const targetUserMsg = lastUserMessageForAdminReplyRef.current;
          let messagesToSend: string[] = [];

          try {
            const currentMessagesState = messagesRef.current;
            const historyMessages = currentMessagesState.filter(m => !pendingUserMessageIds.current.has(m.id));
            const fullHistory = convertMessagesToHistory(historyMessages);

            const stream = await sendMessageStream(
                text, language, 'Website Admin', attachments, adminNameForReply, fullHistory, currentUser, null
            );
            
            let fullResponseText = '';
            for await (const chunk of stream) {
               if (chunk.text) fullResponseText += chunk.text;
            }
            
            const parts = fullResponseText.split(/\n\n+/); 
            if (parts.length >= 2) {
                messagesToSend.push(parts[0]);
                messagesToSend.push(parts.slice(1).join('\n\n'));
            } else if (fullResponseText.length > 80 && (fullResponseText.includes('. ') || fullResponseText.includes('? '))) {
                const splitMatch = fullResponseText.match(/^(.+[.!?])\s+(.+)$/s);
                if (splitMatch) {
                    messagesToSend.push(splitMatch[1]);
                    messagesToSend.push(splitMatch[2]);
                } else {
                    messagesToSend.push(fullResponseText);
                }
            } else {
                messagesToSend.push(fullResponseText);
            }

            let replyInfo: ReplyInfo | undefined = undefined;
            if (targetUserMsg && batchSize > 1) {
                replyInfo = {
                    id: targetUserMsg.id,
                    content: targetUserMsg.content,
                    senderName: 'You',
                    isImage: !!(targetUserMsg.attachments && targetUserMsg.attachments.some(a => a.type === 'image'))
                };
            }

            const addAdminMessage = (content: string, index: number) => {
                 const msg: Message = {
                   id: (Date.now() + Math.random()).toString(),
                   role: 'model',
                   content: content,
                   timestamp: Date.now() + (index * 500), 
                   mode: 'ADMIN',
                   adminName: adminNameForReply,
                   deliveryInfo: { deliveredAt: Date.now(), seenAt: Date.now() },
                   replyTo: index === 0 ? replyInfo : undefined 
                 };

                 if (appModeRef.current === 'ADMIN') {
                    setMessages(prev => [...prev, msg]);
                 } else {
                    adminSession.current.messages.push(msg);
                 }
            };

            if (messagesToSend.length > 0) {
                 addAdminMessage(messagesToSend[0], 0);
                 if (messagesToSend.length > 1) {
                     setTimeout(() => addAdminMessage(messagesToSend[1], 1), 600); 
                 }
            }

          } catch (error: any) {
            let errorContent = "⚠️ Connection lost with agent. [Contact via WhatsApp](https://wa.me/+947702890900)";
            if (error.message === "API_KEY_EXPIRED" || error.message?.includes("API key expired")) {
                errorContent = "⚠️ **System Error**: API Key Expired. Please contact the administrator. [Contact via WhatsApp](https://wa.me/+947702890900)";
            }
            const errorMsg: Message = {
                id: Date.now().toString(), role: 'model', content: errorContent, timestamp: Date.now(),
                isError: true, mode: 'ADMIN', adminName: adminNameForReply
            };
            if (appModeRef.current === 'ADMIN') {
                setMessages(prev => [...prev, errorMsg]);
            } else {
                adminSession.current.messages.push(errorMsg);
            }
          } finally {
              const completionDelay = messagesToSend && messagesToSend.length > 1 ? 800 : 0;
              setTimeout(() => {
                  activeTypingCount.current = Math.max(0, activeTypingCount.current - 1);
                  if (activeTypingCount.current === 0 && appModeRef.current === 'ADMIN') {
                      setIsLoading(false);
                  }
                  if (Date.now() >= lastScheduledReplyTime.current - 1000) {
                      setReplyEta(null);
                      lastUserMessageForAdminReplyRef.current = null;
                      pendingUserMessageIds.current.clear();
                  }
              }, completionDelay);
          }
      }, timeUntilReply);
  };

  const processAdminBatch = () => {
      const batchSize = pendingAdminMessages.current.length + pendingAdminAttachments.current.length;
      if (batchSize === 0) return;
      const batchText = pendingAdminMessages.current.join('\n\n');
      const batchAttachments = [...pendingAdminAttachments.current];
      const msgCount = pendingAdminMessages.current.length;
      pendingAdminMessages.current = [];
      pendingAdminAttachments.current = [];
      triggerAdminReplyLogic(batchText, batchAttachments, msgCount);
  };

  const handleSendMessage = async (text: string = inputText, attachmentsOverride: Attachment[] | undefined = undefined) => {
    const effectiveAttachments = attachmentsOverride || attachments;
    const effectiveText = text.trim();

    if ((!effectiveText && effectiveAttachments.length === 0)) return;
    if (appMode === 'AI' && isLoading) return; 

    let replyInfo: ReplyInfo | undefined = undefined;
    if (replyingTo) {
        replyInfo = {
            id: replyingTo.id,
            content: replyingTo.content,
            senderName: replyingTo.role === 'user' ? 'You' : (replyingTo.adminName?.replace('~', '') || 'Edu_X'),
            isImage: !!(replyingTo.attachments && replyingTo.attachments.some(a => a.type === 'image'))
        };
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: effectiveText,
      timestamp: Date.now(),
      attachments: effectiveAttachments.length > 0 ? effectiveAttachments : undefined,
      mode: appMode,
      replyTo: replyInfo,
      // For AI mode, mark as delivered instantly. 
      // Mark as seen when AI starts streaming (or instantly for simplicity since response is fast)
      deliveryInfo: { 
          deliveredAt: Date.now(), 
          seenAt: appMode === 'AI' ? Date.now() : undefined 
      }
    };

    setMessages(prev => [...prev, userMessage]);
    
    if (!attachmentsOverride) {
      setInputText('');
      setAttachments([]);
      setReplyingTo(null);
    }

    if (appMode === 'ADMIN') {
       const cleanText = effectiveText.toLowerCase().replace(/[^a-z]/g, '');
       const isFiller = /^(m+|h+m+|m+h+)$/.test(cleanText);
       if (isFiller && effectiveAttachments.length === 0) return;

       lastUserMessageForAdminReplyRef.current = userMessage;
       pendingUserMessageIds.current.add(userMessage.id);
       if (effectiveText) pendingAdminMessages.current.push(effectiveText);
       if (effectiveAttachments.length > 0) pendingAdminAttachments.current.push(...effectiveAttachments);
       if (adminBatchTimeout.current) clearTimeout(adminBatchTimeout.current);
       adminBatchTimeout.current = setTimeout(() => { processAdminBatch(); }, 2000);
       return;
    }

    setIsLoading(true);
    const botMessageId = (Date.now() + 1).toString();
    let messageAdded = false;

    // Get the current full history to ensure context (excluding the message we just added)
    // Note: 'messages' here refers to the state before the update above, which is exactly what we want
    // because convertMessagesToHistory creates history array, and sendMessageStream takes the NEW message as argument.
    const currentHistory = convertMessagesToHistory(messages);

    try {
      const streamResponse = await sendMessageStream(
          effectiveText, 
          language, 
          subject, 
          effectiveAttachments, 
          undefined, 
          currentHistory, // Explicitly pass full history
          currentUser // Explicitly pass current user
      );
      
      let fullContent = '';
      const generatedImages: string[] = [];
      let groundingMetadata: GroundingMetadata | undefined;
      
      for await (const chunk of streamResponse) {
        const c = chunk as GenerateContentResponse;
        if (c.text) fullContent += c.text;
        
        // Accumulate Grounding Metadata if present (from any chunk)
        if (c.candidates && c.candidates[0].groundingMetadata) {
             groundingMetadata = c.candidates[0].groundingMetadata as GroundingMetadata;
        }
        
        if (c.candidates && c.candidates[0].content && c.candidates[0].content.parts) {
          for (const part of c.candidates[0].content.parts) {
             if (part.inlineData) {
               generatedImages.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
             }
          }
        }

        if (!messageAdded) {
          setMessages(prev => [...prev, {
            id: botMessageId, role: 'model', content: fullContent,
            generatedImages: generatedImages.length > 0 ? generatedImages : undefined,
            groundingMetadata: groundingMetadata,
            timestamp: Date.now(), mode: 'AI'
          }]);
          messageAdded = true;
        } else {
          setMessages(prev => prev.map(msg => msg.id === botMessageId ? { 
              ...msg, 
              content: fullContent, 
              generatedImages: generatedImages.length > 0 ? generatedImages : msg.generatedImages,
              groundingMetadata: groundingMetadata || msg.groundingMetadata
          } : msg));
        }
      }
    } catch (error: any) {
      console.error(error);
      let errorMessage = "⚠️ **High Traffic Alert**: The AI service is currently overwhelmed (Quota Exceeded). Please wait a moment and try again.";
      if (error.message === "API_KEY_EXPIRED" || error.message?.includes("API key expired")) {
          errorMessage = "⚠️ **System Error**: API Key Expired. Please update your API key in the configuration.";
      }
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'model', content: errorMessage, timestamp: Date.now(), isError: true, mode: 'AI'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Callback wrapper for stability - uses ref to avoid regenerating function on state change
  const handleRegenerate = useCallback((messageId: string) => {
    // We cannot check isLoading from state in useCallback without adding it to deps, 
    // which breaks stability. We assume basic checks are done in UI or use a ref for loading if strictness is needed.
    // However, the main goal is to prevent MessageBubble re-renders during typing/streaming (where isLoading is constant or changing predictably).
    
    // Access latest messages via ref
    const currentMsgs = messagesRef.current;
    
    const msgIndex = currentMsgs.findIndex(m => m.id === messageId);
    if (msgIndex === -1 || currentMsgs[msgIndex].role !== 'model') return;
    const userMsgIndex = msgIndex - 1;
    if (userMsgIndex < 0) return;
    const userMessage = currentMsgs[userMsgIndex];
    const newHistory = currentMsgs.slice(0, userMsgIndex);
    
    setMessages(newHistory);
    
    // Logic from original handleRegenerate, adapted to use current vars
    const historyForRegen = convertMessagesToHistory(newHistory);
    setIsLoading(true);
    setMessages([...newHistory, userMessage]);
    
    (async () => {
        try {
            const streamResponse = await sendMessageStream(
                userMessage.content, 
                language, 
                subject, 
                userMessage.attachments, 
                undefined, 
                historyForRegen
            );
             
            let fullContent = '';
            const generatedImages: string[] = [];
            let groundingMetadata: GroundingMetadata | undefined;
            const botMessageId = (Date.now() + 1).toString();
            let messageAdded = false;

            for await (const chunk of streamResponse) {
                const c = chunk as GenerateContentResponse;
                if (c.text) fullContent += c.text;
                if (c.candidates && c.candidates[0].groundingMetadata) groundingMetadata = c.candidates[0].groundingMetadata as GroundingMetadata;
                if (c.candidates && c.candidates[0].content && c.candidates[0].content.parts) {
                    for (const part of c.candidates[0].content.parts) {
                        if (part.inlineData) generatedImages.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    }
                }

                if (!messageAdded) {
                    setMessages(prev => [...prev, {
                        id: botMessageId, role: 'model', content: fullContent,
                        generatedImages: generatedImages.length > 0 ? generatedImages : undefined,
                        groundingMetadata: groundingMetadata,
                        timestamp: Date.now(), mode: 'AI'
                    }]);
                    messageAdded = true;
                } else {
                    setMessages(prev => prev.map(msg => msg.id === botMessageId ? { 
                        ...msg, content: fullContent, generatedImages: generatedImages.length > 0 ? generatedImages : msg.generatedImages,
                        groundingMetadata: groundingMetadata || msg.groundingMetadata
                    } : msg));
                }
            }
        } catch (e) {
            console.error(e);
            setIsLoading(false);
        } finally {
            setIsLoading(false);
        }
    })();
  }, [language, subject]); // Dependencies minimal

  return (
    <div className="relative h-screen overflow-hidden bg-zinc-50 flex flex-col"
         onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
         onDrop={handleDrop}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Optimized animations with will-change to promote to GPU */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-zinc-200/40 rounded-full blur-3xl animate-pulse will-change-transform" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-200/40 rounded-full blur-3xl animate-pulse delay-1000 will-change-transform" />
        {appMode === 'ADMIN' && (
           <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-emerald-100/30 rounded-full blur-3xl transition-opacity duration-1000 will-change-transform" />
        )}
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-in fade-in duration-200">
           <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3">
              <div className="p-4 bg-blue-50 rounded-full text-blue-600 animate-bounce">
                 <ImageIcon size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">Drop Image Here</h3>
           </div>
        </div>
      )}

      <ConfirmationModal isOpen={showClearConfirm} title="Clear Chat?" message="This will delete your local conversation history." confirmLabel="Clear" onConfirm={confirmClearChat} onCancel={() => setShowClearConfirm(false)} />
      <ConfirmationModal isOpen={showExportModal} title="Export Chat" message="Choose a format to save your conversation." type="export" confirmLabel="" onConfirm={() => {}} onCancel={() => setShowExportModal(false)} onOptionSelect={handleExportOption} />
      <StudentLookupModal isOpen={showStudentLookup} onClose={() => setShowStudentLookup(false)} />
      
      {/* Super Admin Nav Bar */}
      {isSuperAdmin && (
            <div className="bg-zinc-900 text-white px-4 py-2 flex items-center justify-between shadow-md z-40 flex-shrink-0 border-b border-zinc-800 sticky top-0">
                <div className="flex items-center gap-2">
                   <ShieldAlert size={16} className="text-emerald-500" />
                   <span className="text-xs font-bold tracking-wider">SUPER ADMIN</span>
                </div>
                <button 
                  onClick={() => setShowAgentManager(true)}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 border border-zinc-700 hover:border-zinc-500"
                >
                   <UserCog size={14} />
                   Manage Agents
                </button>
            </div>
      )}

      <AdminAgentManager 
          isOpen={showAgentManager}
          onClose={() => setShowAgentManager(false)}
          agents={adminAgents}
          onAddAgent={handleAddAgent}
          onEditAgent={handleEditAgent}
          onRemoveAgent={handleRemoveAgent}
      />

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 pb-48 scroll-smooth pt-4 md:pt-12 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-in fade-in zoom-in-95 duration-700">
               <div className="mb-10 px-4 relative">
                  <div className="absolute inset-0 bg-zinc-200/30 blur-[60px] rounded-full opacity-50 pointer-events-none"></div>
                  <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-slate-700 to-zinc-900 drop-shadow-sm">
                    {appMode === 'ADMIN' ? "Help Desk" : "Edu_X"}
                  </h1>
                  
                  <div className="text-xl md:text-3xl font-light text-zinc-500 max-w-2xl mx-auto leading-relaxed">
                    {appMode === 'ADMIN' 
                        ? (
                            <div className="flex flex-col items-center gap-4">
                                <span className="font-heading">Connected with <span className="text-emerald-600 font-semibold">{currentAdminName.replace('~', '')}</span></span>
                                <div className="flex items-center gap-2 bg-emerald-50/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm">
                                    <span className="relative flex h-2.5 w-2.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-sm font-semibold text-emerald-700 tracking-wide uppercase text-[11px]">Online</span>
                                </div>
                            </div>
                          )
                        : "Your AI companion for academic excellence."
                    }
                  </div>
               </div>
               
               {appMode === 'AI' && (
                   <div className="flex flex-wrap justify-center gap-2.5 mb-10 max-w-3xl px-6">
                      {(['General', 'SFT', 'ICT', 'ET', 'Agriculture'] as Subject[]).map(sub => (
                        <button
                          key={sub}
                          onClick={() => handleSubjectChange(sub)}
                          className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 transform hover:-translate-y-1 ${
                            subject === sub 
                              ? 'bg-zinc-800 text-white shadow-lg shadow-zinc-300' 
                              : 'bg-white/60 backdrop-blur-sm text-zinc-600 border border-white/50 hover:bg-white hover:shadow-md'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                   </div>
               )}
               {appMode === 'AI' && <QuickPrompts language={language} onSelect={(p) => setInputText(p)} />}
            </div>
          ) : (
            <div className="max-w-[850px] mx-auto pt-2">
              {messages.map((msg, index) => (
                <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    previousMessage={index > 0 ? messages[index - 1] : undefined}
                    nextMessage={index < messages.length - 1 ? messages[index + 1] : undefined}
                    isStreaming={isLoading && index === messages.length - 1 && msg.role === 'model' && appMode === 'AI'} 
                    onRegenerate={appMode === 'AI' ? handleRegenerate : undefined}
                    onReply={handleReplyToMessage}
                    onDelete={handleDeleteMessage}
                    onVerifyStudent={appMode === 'ADMIN' ? handleVerifyStudent : undefined}
                />
              ))}
              
              {isLoading && appMode === 'ADMIN' && (
                  <div className="flex w-full gap-4 md:gap-6 mb-6 flex-row group animate-pulse">
                     <div className="flex-shrink-0 mt-auto mb-1">
                        <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                            <UserCog size={18} className="text-emerald-600" />
                        </div>
                     </div>
                     <div className="bg-white border border-zinc-100 shadow-sm px-5 py-3.5 rounded-[24px] rounded-tl-[4px]">
                        <div className="flex items-center gap-1.5 h-6">
                            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                     </div>
                  </div>
              )}
              {isLoading && appMode === 'AI' && messages[messages.length - 1].role === 'user' && (
                <MessageBubble key="thinking" message={{ id: 'thinking', role: 'model', content: '', timestamp: Date.now() }} isStreaming={true} />
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 w-full pt-20 pb-6 px-4 pointer-events-none bg-gradient-to-t from-zinc-50 via-zinc-50/90 to-transparent">
          <div className="max-w-[850px] mx-auto relative pointer-events-auto">
             
             {appMode === 'ADMIN' && replyEta && timeRemaining && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-emerald-100 text-emerald-700 px-4 py-2 rounded-full shadow-lg shadow-emerald-500/10 animate-in slide-in-from-bottom-2 duration-300">
                    <Clock size={16} className="animate-pulse text-emerald-500" />
                    <span className="text-xs font-semibold tracking-wide font-heading">REPLY IN {timeRemaining}</span>
                </div>
             )}

             {attachments.length > 0 && (
              <div className="flex gap-3 mb-4 pl-1 overflow-x-auto pb-2">
                {attachments.map(att => (
                  <div key={att.id} className="relative group shrink-0 animate-in zoom-in-90 duration-300">
                    <div className="w-20 h-20 rounded-2xl border-2 border-white bg-white shadow-md overflow-hidden relative">
                       {att.type === 'image' ? <img src={`data:${att.mimeType};base64,${att.content}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-zinc-50"><FileText className="text-zinc-400" /></div>}
                       <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                    <button onClick={() => removeAttachment(att.id)} className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}

             <div className={`
                 bg-white/80 backdrop-blur-xl border border-white/50 
                 focus-within:ring-4 focus-within:ring-zinc-500/10 focus-within:border-zinc-200/50 
                 rounded-[32px] flex flex-col shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] 
                 transition-all duration-300
                 ${replyEta ? 'ring-2 ring-emerald-500/20 border-emerald-100' : ''}
                 ${isDragging ? 'ring-4 ring-blue-500/30 border-blue-400 bg-blue-50/50' : ''}
             `}>
                
                {replyingTo && (
                  <div className="flex items-center justify-between bg-zinc-50/50 px-5 py-3 border-b border-zinc-100/50 mx-1 mt-1 rounded-t-[28px] animate-in slide-in-from-bottom-2">
                     <div className="flex flex-col flex-1 min-w-0 pr-4 pl-3 border-l-[3px] border-zinc-500">
                         <div className="text-xs font-bold text-zinc-700 truncate mb-0.5">
                            Replying to {replyingTo.role === 'user' ? 'You' : (replyingTo.adminName?.replace('~', '') || 'Edu_X')}
                         </div>
                         <div className="text-xs text-zinc-600 truncate opacity-90 font-medium">
                            {replyingTo.content || 'Attachment'}
                         </div>
                     </div>
                     <button 
                        onClick={() => setReplyingTo(null)} 
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-white rounded-full transition-all"
                     >
                        <X size={16}/>
                     </button>
                  </div>
                )}

                <textarea
                  ref={textAreaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                  onPaste={handlePaste}
                  placeholder={isListening ? "Listening..." : (appMode === 'ADMIN' ? (isLoading ? `${currentAdminName} is typing...` : `Message ${currentAdminName}...`) : `Ask anything or say 'generate image'...`)}
                  className={`w-full max-h-[160px] min-h-[56px] py-4 px-6 bg-transparent border-none outline-none resize-none text-zinc-800 placeholder:text-zinc-400/80 text-[16px] leading-relaxed ${replyingTo ? 'pt-3' : ''}`}
                  rows={1}
                />
                
                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                   <div className="flex items-center gap-2">
                      <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/50 rounded-xl transition-all"><Paperclip size={20} /></button>
                      
                      <div className="relative" ref={languageMenuRef}>
                        <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${language === Language.SINHALA ? 'bg-zinc-100 text-zinc-800 font-medium' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                           <Globe size={20} />
                           {language === Language.SINHALA && <span className="text-xs">SI</span>}
                        </button>
                        <div className={`absolute bottom-full mb-3 left-0 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-1.5 w-36 z-50 origin-bottom-left transition-all ${showLanguageMenu ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
                             <button onClick={() => handleLanguageChange(Language.ENGLISH)} className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors ${language === Language.ENGLISH ? 'bg-zinc-100 text-zinc-800 font-medium' : 'hover:bg-zinc-50 text-zinc-700'}`}>English</button>
                             <button onClick={() => handleLanguageChange(Language.SINHALA)} className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors ${language === Language.SINHALA ? 'bg-zinc-100 text-zinc-800 font-medium' : 'hover:bg-zinc-50 text-zinc-700'}`}>Sinhala</button>
                        </div>
                      </div>

                       {appMode === 'AI' && (
                           <div className="relative" ref={subjectMenuRef}>
                             <button onClick={() => setShowSubjectMenu(!showSubjectMenu)} className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/50 transition-all"><GraduationCap size={20} /></button>
                             <div className={`absolute bottom-full mb-3 left-0 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-1.5 w-52 z-50 origin-bottom-left transition-all ${showSubjectMenu ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
                                  <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Focus Mode</div>
                                  {(['General', 'SFT', 'ICT', 'ET', 'Agriculture'] as Subject[]).map(s => (
                                    <button key={s} onClick={() => handleSubjectChange(s)} className={`w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 rounded-xl flex justify-between items-center transition-all ${subject === s ? 'bg-zinc-100 text-zinc-800 font-medium' : 'text-zinc-700'}`}>
                                      <span>{s}</span>
                                      {subject === s && <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 shadow-sm shadow-zinc-300"></div>}
                                    </button>
                                  ))}
                             </div>
                           </div>
                       )}

                       {/* History / Menu Popover Trigger */}
                       <div className="relative" ref={historyMenuRef}>
                           <button onClick={() => setShowHistoryMenu(!showHistoryMenu)} className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/50 transition-all">
                                <History size={20} />
                           </button>
                           <HistoryModal 
                                isOpen={showHistoryMenu}
                                onClose={() => {}}
                                onNewChat={confirmClearChat}
                                onClearChat={confirmClearChat}
                                onExportChat={handleExportRequest}
                                messages={messages}
                                isLoggedIn={!!currentUser}
                                currentUser={currentUser}
                                onLogin={handleLogin}
                                onLogout={handleLogout}
                                isSuperAdmin={isSuperAdmin}
                            />
                       </div>

                       {/* Admin Mode Toggle */}
                       <button
                           onClick={handleModeSwitch}
                           className={`p-2.5 rounded-xl transition-all ${appMode === 'ADMIN' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/50'} ${(!currentUser && appMode === 'AI') ? 'opacity-50 cursor-not-allowed' : ''}`}
                           title={appMode === 'ADMIN' ? 'Switch to AI' : 'Switch to Support (Requires Login)'}
                       >
                           {appMode === 'ADMIN' ? <Bot size={20} /> : <UserCog size={20} />}
                       </button>

                       {/* Student Lookup Trigger (Admin Only) */}
                       {appMode === 'ADMIN' && (
                          <button
                             onClick={() => setShowStudentLookup(true)}
                             className="p-2.5 rounded-xl text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                             title="Lookup Student"
                          >
                             <Search size={20} />
                          </button>
                       )}

                   </div>

                   <div className="flex items-center gap-2">
                       {inputText.length > 0 || attachments.length > 0 ? (
                          <button 
                            onClick={() => handleSendMessage()} 
                            disabled={appMode === 'AI' && isLoading} 
                            className="p-3 bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all shadow-md shadow-zinc-300 disabled:opacity-50 disabled:scale-100"
                          >
                             <Send size={20} strokeWidth={2} className="ml-0.5" />
                          </button>
                       ) : (
                          <button 
                            onClick={toggleVoiceInput} 
                            className={`p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                          >
                            <Mic size={20} strokeWidth={2} />
                          </button>
                       )}
                   </div>
                </div>
             </div>
             <p className="text-center text-[11px] font-medium text-zinc-400 mt-4 opacity-60 tracking-wide">
                {appMode === 'ADMIN' ? 'Support responses may be delayed.' : 'Edu_X can make mistakes. Verify important info.'}
             </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
