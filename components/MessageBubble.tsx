import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, StudentCardData } from '../types';
import { Copy, Check, FileText, Sparkles, ThumbsUp, ThumbsDown, RefreshCw, CheckCheck, Reply, Image as ImageIcon, UserCog, ExternalLink, ShieldCheck, ShieldAlert, BadgeCheck, IdCard, Youtube, CheckCircle, XCircle, Trash2, Globe } from 'lucide-react';
import ReactPlayer from 'react-player/youtube';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface MessageBubbleProps {
  message: Message;
  previousMessage?: Message;
  nextMessage?: Message;
  isStreaming?: boolean;
  onRegenerate?: (id: string) => void;
  onReply?: (message: Message) => void;
  onVerifyStudent?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}

interface McqData {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

// Optimized Regex for YouTube ID extraction
const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
// Regex to clean link from text presentation
const youtubeLinkRegex = /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s]+/;
const latexBlockRegex = /\\\[([\s\S]*?)\\\]/g;
const latexInlineRegex = /\\\(([\s\S]*?)\\\)/g;

const preprocessContent = (content: string) => {
  if (!content) return '';
  
  // 1. Handle LaTeX
  let processed = content
    .replace(latexBlockRegex, '$$$$$1$$$$')
    .replace(latexInlineRegex, '$$$1$$');

  // 2. Auto-link raw URLs (Simple heuristic to wrap http/https links in markdown if they aren't already)
  // We use a regex that looks for http/https not preceded by `](` or `="` or `href="`
  // This helps make raw links clickable in Admin mode
  processed = processed.replace(/(?<!\]\()(?<!href=")(https?:\/\/[^\s]+)/g, '[$1]($1)');

  return processed;
};

const getYoutubeId = (text: string) => {
  const match = text.match(youtubeRegex);
  return match ? match[1] : null;
};

// --- Sub-Components ---

const McqView = ({ data }: { data: McqData }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const isCorrect = selected === data.correct_answer;

  return (
    <div className="my-4 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm max-w-lg w-full">
      <h3 className="font-heading font-semibold text-lg text-zinc-800 mb-4 leading-snug">{data.question}</h3>
      <div className="space-y-2.5">
        {data.options.map((option) => {
            let stateClass = "border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 bg-white";
            if (showResult) {
                if (option === data.correct_answer) stateClass = "bg-emerald-50 border-emerald-200 text-emerald-800 ring-1 ring-emerald-500/50";
                else if (option === selected) stateClass = "bg-red-50 border-red-200 text-red-800 ring-1 ring-red-500/50";
                else stateClass = "opacity-50 border-zinc-100 bg-zinc-50";
            } else if (selected === option) {
                stateClass = "bg-indigo-50 border-indigo-200 text-indigo-800 ring-1 ring-indigo-500/50";
            }

            return (
                <button
                    key={option}
                    onClick={() => !showResult && setSelected(option)}
                    disabled={showResult}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all text-sm font-medium flex justify-between items-center ${stateClass}`}
                >
                    <span className="flex-1 mr-2">{option}</span>
                    {showResult && option === data.correct_answer && <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />}
                    {showResult && option === selected && option !== data.correct_answer && <XCircle size={18} className="text-red-500 flex-shrink-0" />}
                </button>
            )
        })}
      </div>
      
      {!showResult ? (
          <button 
            onClick={() => setShowResult(true)}
            disabled={!selected}
            className="mt-5 w-full py-3 bg-zinc-900 text-white rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
          >
            Check Answer
          </button>
      ) : (
          <div className={`mt-5 p-4 rounded-xl text-sm border ${isCorrect ? 'bg-emerald-50 text-emerald-900 border-emerald-100' : 'bg-red-50 text-red-900 border-red-100'} animate-in slide-in-from-top-2`}>
             <div className="font-bold mb-1.5 flex items-center gap-2 text-base">
                {isCorrect ? 'Correct! 🎉' : 'Incorrect'}
             </div>
             <p className="opacity-90 leading-relaxed text-zinc-700">{data.explanation}</p>
          </div>
      )}
    </div>
  );
};

const StudentCardView = ({ data, onVerify }: { data: StudentCardData, onVerify?: (id: string, name: string) => void }) => {
    return (
        <div className="mt-4 w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden animate-in slide-in-from-left-2 duration-500 font-sans group/card cursor-help">
            {/* Header with status color */}
            <div className={`h-2 w-full ${
                data.payment === 'Paid' ? 'bg-emerald-500' : 
                data.payment === 'Pending' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900 leading-tight">{data.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                               {data.id}
                            </span>
                            {data.verified === 'TRUE' && (
                                 <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                    <ShieldCheck size={10} /> ID VERIFIED
                                 </span>
                            )}
                        </div>
                    </div>
                    {data.tracking && (
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Tracking</div>
                            <div className="text-xs font-mono font-bold text-zinc-700 tracking-wide">{data.tracking}</div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`p-3 rounded-xl border ${
                        data.payment === 'Paid' ? 'bg-emerald-50 border-emerald-100' : 
                        data.payment === 'Pending' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
                    }`}>
                        <div className="text-[10px] font-bold uppercase opacity-60 mb-0.5 flex items-center gap-1">
                            Payment Status
                        </div>
                        <div className={`text-sm font-bold ${
                             data.payment === 'Paid' ? 'text-emerald-700' : 
                             data.payment === 'Pending' ? 'text-amber-700' : 'text-red-700'
                        }`}>
                            {data.payment}
                        </div>
                    </div>

                     <div className="p-3 rounded-xl border border-zinc-100 bg-zinc-50">
                        <div className="text-[10px] font-bold uppercase text-zinc-400 mb-0.5">Last Marks</div>
                        <div className="text-sm font-bold text-zinc-800">
                            {data.last_paper_marks || 'N/A'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                         <div className={`w-2 h-2 rounded-full ${data.email_verified === 'TRUE' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                         {data.email_verified === 'TRUE' ? 'Email Verified' : 'Email Unverified'}
                    </div>
                    
                    {onVerify && data.verified !== 'TRUE' && (
                        <button 
                            onClick={() => onVerify(data.id, data.name)}
                            className="flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
                        >
                            <IdCard size={12} />
                            Verify NIC
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const VideoEmbed = ({ videoId }: { videoId: string }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
        <a 
          href={`https://www.youtube.com/watch?v=${videoId}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block w-full p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-white hover:border-zinc-300 hover:shadow-sm transition-all flex items-center gap-4 my-4 group cursor-pointer"
        >
           <div className="p-3 bg-red-50 text-red-600 rounded-full group-hover:bg-red-100 transition-colors shrink-0">
             <Youtube size={24} />
           </div>
           <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-zinc-900 truncate">Watch on YouTube</span>
              <span className="text-xs text-zinc-500">Video playback unavailable in preview</span>
           </div>
           <ExternalLink size={16} className="ml-auto text-zinc-400 group-hover:text-zinc-600" />
        </a>
    );
  }

  return (
    <div className="my-5 rounded-xl overflow-hidden shadow-xl border border-zinc-900/10 bg-black w-full max-w-2xl mx-auto ring-1 ring-black/5 group/player relative">
       <div className="player-wrapper w-full aspect-video relative">
          <ReactPlayer 
            url={`https://www.youtube.com/watch?v=${videoId}`} 
            className="react-player absolute top-0 left-0"
            width="100%"
            height="100%"
            controls={true}
            onError={() => setError(true)}
            config={{ 
              youtube: { 
                playerVars: { showinfo: 0, modestbranding: 1, rel: 0, origin: window.location.origin } 
              } 
            }}
          />
       </div>
    </div>
  );
};

// --- Main Component ---

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ message, previousMessage, nextMessage, isStreaming, onRegenerate, onReply, onVerifyStudent, onDelete }) => {
  const isUser = message.role === 'user';
  const isAdmin = message.mode === 'ADMIN';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Parse message content into segments (Text, MCQ, StudentCard)
  const blocks = useMemo(() => {
    const rawSections = message.content.split('[Double Line Break]');
    const parsedBlocks: any[] = [];

    rawSections.forEach((section, idx) => {
        const blockRegex = /:::(MCQ_BLOCK|STUDENT_CARD)\s*({[\s\S]*?})\s*:::/g;
        let lastIndex = 0;
        let match;

        while ((match = blockRegex.exec(section)) !== null) {
            const textPart = section.substring(lastIndex, match.index).trim();
            if (textPart) {
                parsedBlocks.push({ type: 'text', content: textPart });
            }

            const blockType = match[1];
            const jsonStr = match[2];
            
            try {
                const data = JSON.parse(jsonStr);
                if (blockType === 'MCQ_BLOCK') {
                    parsedBlocks.push({ type: 'mcq', data });
                } else if (blockType === 'STUDENT_CARD') {
                    parsedBlocks.push({ type: 'student_card', data });
                }
            } catch (e) {
                console.error("Block Parse Error", e);
                parsedBlocks.push({ type: 'text', content: match[0] });
            }

            lastIndex = blockRegex.lastIndex;
        }

        const remainingText = section.substring(lastIndex).trim();
        if (remainingText) {
            parsedBlocks.push({ type: 'text', content: remainingText });
        }

        if (idx < rawSections.length - 1) {
            parsedBlocks.push({ type: 'break' });
        }
    });

    return parsedBlocks;
  }, [message.content]);

  // Clean content for clipboard copy
  const plainTextContent = useMemo(() => {
      return message.content.replace(/:::(MCQ_BLOCK|STUDENT_CARD)[\s\S]*?:::/g, '').trim();
  }, [message.content]);

  const isSequence = previousMessage && 
                     previousMessage.role === message.role && 
                     !message.isSystem && 
                     !previousMessage.isSystem &&
                     previousMessage.mode === message.mode;

  const isLastInSequence = !nextMessage || 
                           nextMessage.role !== message.role || 
                           nextMessage.isSystem || 
                           (nextMessage.mode !== message.mode);

  const handleCopy = () => {
    navigator.clipboard.writeText(plainTextContent || message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(prev => prev === type ? null : type);
  };

  const handleRegenerateClick = () => {
    setIsRegenerating(true);
    setTimeout(() => setIsRegenerating(false), 700);
    if (onRegenerate) onRegenerate(message.id);
  };

  const markdownComponents = useMemo(() => ({
    code({node, inline, className, children, ...props}: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          {...props}
          style={oneDark}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: '1em 0', borderRadius: '1rem', fontSize: '0.9em', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code {...props} className={`${className} bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded font-medium text-sm border border-zinc-200`}>
          {children}
        </code>
      );
    },
    a: ({node, ...props}: any) => {
        const href = props.href || '';
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(href);
        if (isImage) {
            return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="block relative group my-2">
                    <img 
                        src={href} 
                        alt="Linked Content" 
                        className="rounded-xl max-h-[300px] border border-zinc-200 object-cover hover:opacity-95 transition-opacity" 
                        loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 rounded-xl transition-opacity">
                        <ExternalLink className="text-white" size={24} />
                    </div>
                </a>
            );
        }
        
        // Link Preview Card for standard links (Fixes length issues and makes it clickable/previewable)
        // Check if the link is "long" (likely to break layout) or stands alone
        const isLong = href.length > 40;
        
        if (isLong) {
            let hostname = '';
            try { hostname = new URL(href).hostname; } catch(e) { hostname = 'Link'; }

            return (
               <div className="my-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-100 transition-colors group/link max-w-full overflow-hidden">
                    <a {...props} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 no-underline">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                           <Globe size={18} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                           <span className="text-sm font-semibold text-zinc-900 truncate">{hostname}</span>
                           <span className="text-xs text-zinc-500 truncate block">{href}</span>
                        </div>
                        <ExternalLink size={16} className="text-zinc-400 group-hover/link:text-blue-500 shrink-0" />
                    </a>
                </div>
            );
        }

        return (
            <a 
                {...props} 
                className="inline-flex items-center gap-1.5 bg-zinc-100/50 hover:bg-zinc-100 px-2 py-0.5 rounded-lg text-blue-600 hover:text-blue-800 transition-colors break-all group/link font-medium no-underline border border-transparent hover:border-zinc-200" 
                target="_blank" 
                rel="noopener noreferrer"
            >
                <span className="underline decoration-blue-300 underline-offset-2 break-all">{props.children}</span>
                <ExternalLink size={12} className="inline-block opacity-70 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
            </a>
        );
    },
    strong: ({node, ...props}: any) => <strong {...props} className="font-bold text-zinc-900" />,
    p: ({node, ...props}: any) => <p {...props} className={`mb-2 ${isUser ? (isAdmin ? 'text-white' : 'text-zinc-900') : 'text-zinc-800'}`} />,
    li: ({node, ...props}: any) => <li {...props} className={isUser ? (isAdmin ? 'text-white' : 'text-zinc-900') : 'text-zinc-800'} />,
    ul: ({node, ...props}: any) => <ul {...props} className="list-disc pl-5 space-y-1 mb-3" />,
    ol: ({node, ...props}: any) => <ol {...props} className="list-decimal pl-5 space-y-1 mb-3" />,
    img: ({node, ...props}: any) => (
       <div className="my-3 rounded-xl overflow-hidden border border-zinc-100 shadow-sm">
          <img {...props} className="w-full h-auto object-cover max-h-[400px]" alt={props.alt || 'Generated Content'} loading="lazy" />
       </div>
    ),
  }), [isUser, isAdmin]);

  if (message.isSystem) {
    return (
      <div id={`message-${message.id}`} className="flex w-full justify-center my-8 animate-message-entry scroll-mt-32">
        <div className="text-xs font-medium text-zinc-500 bg-zinc-100/80 px-4 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const isThinking = isStreaming && !message.content;
  const hasReply = !!message.replyTo;

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const timeDisplay = formatTime(message.timestamp);
  
  let statusIcon = null;
  if (isUser) {
      if (message.deliveryInfo && message.deliveryInfo.seenAt) {
          // Seen Tick - Blue in Admin mode (like WhatsApp), Green in AI mode
          statusIcon = <CheckCheck size={12} className={isAdmin ? "text-blue-400" : "text-emerald-500"} strokeWidth={2.5} />;
      } else if (message.deliveryInfo || isAdmin) {
          // Delivered Tick - White/Grey in Admin Mode
          statusIcon = <CheckCheck size={12} className={isAdmin ? "text-white/60" : "text-zinc-400"} strokeWidth={2} />;
      } else {
          // Sent Tick
          statusIcon = <Check size={12} className={isAdmin ? "text-white/60" : "text-zinc-400"} strokeWidth={2} />;
      }
  }

  const marginClass = isLastInSequence ? 'mb-8' : 'mb-1';

  return (
    <div id={`message-${message.id}`} className={`flex w-full gap-4 md:gap-5 ${marginClass} animate-message-entry ${isUser ? 'flex-row-reverse items-end' : 'flex-row items-start'} scroll-mt-32 group`}>
      
      {!isUser && (
        <div className="flex-shrink-0 mt-0.5">
           <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isAdmin ? 'bg-zinc-100 border border-zinc-200' : 'bg-transparent'} ${isSequence ? 'invisible' : ''}`}>
             {isAdmin ? (
                <div className="text-zinc-600 flex flex-col items-center justify-center">
                   <UserCog size={18} strokeWidth={2} />
                </div>
             ) : (
                <div className="w-24 h-24 flex items-center justify-center -ml-8 -mt-8">
                    <DotLottieReact
                      src="https://lottie.host/84dd338b-4174-4ea3-b981-32929360108e/FG2iiG72ol.lottie"
                      loop={isThinking}
                      autoplay={true}
                    />
                </div>
             )}
           </div>
        </div>
      )}

      <div className={`flex flex-col max-w-[85%] md:max-w-[78%] lg:max-w-[82%] min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
        
        {!isUser && isAdmin && message.adminName && !isSequence && (
           <span className="text-[11px] text-zinc-500 ml-1 mb-1 font-semibold tracking-wide uppercase">
             {message.adminName.replace('~', '')}
           </span>
        )}

        {hasReply && message.replyTo && !isSequence && (
            <div className={`mb-1 relative rounded-xl p-3 text-xs border-l-[3px] cursor-pointer opacity-90 hover:opacity-100 transition-all shadow-sm ${
                isUser 
                ? (isAdmin 
                    ? 'bg-zinc-700/50 border-zinc-400 text-zinc-100 self-end mr-1 backdrop-blur-sm' 
                    : 'bg-zinc-50 border-zinc-300 text-zinc-600 self-end mr-1')
                : 'bg-zinc-50/80 border-zinc-300 text-zinc-700 self-start ml-0 backdrop-blur-sm'
            } min-w-[140px] max-w-full`}>
                <div className={`font-bold mb-0.5 ${isUser && isAdmin ? 'text-zinc-50' : 'text-zinc-800'}`}>
                    {message.replyTo.senderName}
                </div>
                <div className="flex items-center gap-1.5 truncate opacity-80">
                    {message.replyTo.isImage && <ImageIcon size={12} />}
                    <span className="truncate">{message.replyTo.content || 'Photo'}</span>
                </div>
            </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className={`flex flex-wrap gap-2 mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {message.attachments.map((att) => (
              <div key={att.id} className="relative group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-transform hover:scale-[1.01]">
                {att.type === 'image' ? (
                  <img 
                    src={`data:${att.mimeType};base64,${att.content}`} 
                    alt="Uploaded content" 
                    className="h-48 w-auto object-cover block"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 pr-4 min-w-[160px]">
                    <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
                      <FileText size={20} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xs font-semibold text-zinc-800 truncate max-w-[140px]">
                         {att.name}
                       </span>
                       <span className="text-[10px] text-zinc-400">Attached File</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className={`flex items-end gap-2 w-full ${isUser ? 'flex-row justify-end' : 'flex-row'}`}>
            <div className={`relative leading-relaxed transition-all duration-200 ${
              isUser 
                ? (isAdmin 
                    ? 'bg-zinc-800 text-white px-4 py-2.5 rounded-[20px] rounded-tr-md shadow-sm text-[15px]' 
                    : 'bg-white border border-zinc-200 text-zinc-900 px-4 py-2.5 rounded-[20px] rounded-tr-md shadow-sm text-[15px]')
                : (isAdmin 
                    ? 'bg-white border border-zinc-200 px-5 py-4 rounded-[24px] rounded-tl-[4px] text-zinc-800 shadow-sm text-[16px]'
                    : 'bg-transparent px-0 py-0 text-zinc-800 text-[16px]')
            }`}>
              {isThinking ? (
                <div className="flex items-center gap-1.5 h-6 px-1">
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                // UNIFIED CONTENT RENDERER FOR BOTH USER AND MODEL
                blocks.map((block, index) => {
                   if (block.type === 'text') {
                       const trimmedSection = block.content.trim();
                       if (!trimmedSection) return null;

                       const videoId = getYoutubeId(trimmedSection);

                       if (videoId) {
                          return (
                             <React.Fragment key={index}>
                                <VideoEmbed videoId={videoId} />
                                {trimmedSection.length > 80 && !trimmedSection.startsWith('https') && (
                                   <div className={`prose prose-slate max-w-none font-sans text-sm mt-2 ${isUser && isAdmin ? 'text-zinc-200' : 'text-zinc-600'}`}>
                                      <ReactMarkdown components={markdownComponents}>{trimmedSection.replace(youtubeLinkRegex, '')}</ReactMarkdown>
                                   </div>
                                )}
                             </React.Fragment>
                          );
                       }

                       return (
                         <div key={index} className={`prose max-w-none prose-p:leading-8 prose-p:my-1 prose-li:my-1 prose-pre:my-3 prose-headings:font-semibold font-sans ${isUser ? (isAdmin ? 'prose-invert' : 'prose-slate') : 'prose-slate'}`}>
                            <ReactMarkdown 
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={markdownComponents}
                            >
                              {preprocessContent(trimmedSection)}
                            </ReactMarkdown>
                         </div>
                       );
                   }
                   
                   if (block.type === 'mcq') {
                       return <McqView key={index} data={block.data} />;
                   }

                   if (block.type === 'student_card') {
                       return <StudentCardView key={index} data={block.data} onVerify={onVerifyStudent} />;
                   }

                   if (block.type === 'break') {
                       return <div key={index} className="w-full h-6" aria-hidden="true" />;
                   }
                   
                   return null;
                })
              )}
            </div>

            {isUser && !isThinking && (
              <div className="flex flex-col items-end gap-1">
                 {/* Status & Time */}
                 <div className={`flex flex-col items-end justify-end mb-1 select-none flex-shrink-0 ${isAdmin ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    <span className="opacity-90">{statusIcon}</span>
                    <span className="text-[9px] font-medium opacity-80 mt-0.5">{timeDisplay}</span>
                 </div>
                 
                 {/* User Actions (Visible on Hover) */}
                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={handleCopy} 
                        className="p-1 text-zinc-300 hover:text-zinc-500 transition-colors" 
                        title="Copy"
                    >
                        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                    {onDelete && (
                        <button 
                            onClick={() => onDelete(message.id)} 
                            className="p-1 text-zinc-300 hover:text-red-500 transition-colors" 
                            title="Delete"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                 </div>
              </div>
            )}

            {!isUser && isAdmin && !isThinking && (
              <div className="flex flex-col items-start justify-end mb-1 select-none flex-shrink-0 text-zinc-400 ml-1">
                  <span className="opacity-90"><CheckCheck size={12} className="text-blue-500" strokeWidth={2.5} /></span>
                  <span className="text-[9px] font-medium opacity-80 mt-0.5">{timeDisplay}</span>
              </div>
            )}

            {!isUser && !isStreaming && !isThinking && (
               <div className="flex items-center gap-0.5 mb-1 pl-1 select-none flex-shrink-0">
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all active:scale-95"
                    title="Copy"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} strokeWidth={2} />}
                  </button>
                  
                  {onReply && (
                    <button 
                      onClick={() => onReply(message)}
                      className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all active:scale-95"
                      title="Reply"
                    >
                      <Reply size={14} strokeWidth={2} />
                    </button>
                  )}
                  
                  {!isAdmin && (
                     <>
                      <button 
                          onClick={() => handleFeedback('up')} 
                          className={`p-1.5 rounded-full transition-all active:scale-95 ${feedback === 'up' ? 'text-zinc-800 bg-zinc-100' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
                      >
                        <ThumbsUp size={14} strokeWidth={2} />
                      </button>
                      <button 
                          onClick={() => handleFeedback('down')} 
                          className={`p-1.5 rounded-full transition-all active:scale-95 ${feedback === 'down' ? 'text-red-500 bg-red-50' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
                      >
                        <ThumbsDown size={14} strokeWidth={2} />
                      </button>
                      {onRegenerate && (
                        <button 
                          onClick={handleRegenerateClick} 
                          className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all active:scale-95"
                          title="Regenerate"
                        >
                          <RefreshCw size={14} strokeWidth={2} className={isRegenerating ? 'animate-spin' : ''} />
                        </button>
                      )}
                     </>
                  )}
               </div>
            )}
        </div>

        {message.generatedImages && message.generatedImages.length > 0 && (
           <div className="flex gap-3 mt-3 overflow-x-auto pb-2">
              {message.generatedImages.map((img, i) => (
                  <img key={i} src={img} alt="Generated" className="h-64 rounded-2xl shadow-md border border-zinc-100 hover:scale-[1.01] transition-transform block" loading="lazy" />
              ))}
           </div>
        )}
        
        {isUser && onReply && isLastInSequence && (
          <div className="flex items-center gap-1 mt-1 mr-2 flex-row-reverse opacity-0 hover:opacity-100 transition-opacity duration-200">
             <button 
                onClick={() => onReply(message)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all active:scale-90"
                title="Reply"
              >
                <Reply size={14} />
              </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const MessageBubble = React.memo(MessageBubbleComponent);