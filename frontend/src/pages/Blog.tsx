import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { 
  BookOpen, 
  Search, 
  ArrowRight, 
  Sparkles, 
  Send, 
  Bot, 
  Copy, 
  Check, 
  RotateCcw, 
  HelpCircle, 
  ShieldCheck, 
  Scale, 
  ExternalLink 
} from "lucide-react"
import { fetchApi } from "../lib/api"

type LawMapping = {
  old_act: string
  old_section: string
  new_act: string
  new_section: string
  remarks?: string
}

type BlogPostSummary = {
  post_id: string
  title: string
  crime_type: string
  source_sections: string
}

type BlogPostDetail = BlogPostSummary & {
  body: string
  mappings: LawMapping[]
}

type BlogChatMessage = {
  role: "user" | "assistant"
  content: string
  relevant_sections?: string[]
  suggested_followups?: string[]
  timestamp?: string
}

// Helper for inline text formatting: bold, italic, code, etc.
const renderInlineText = (text: string, isDarkBg = false): React.ReactNode => {
  if (!text) return null;

  // Split by bold (**bold**), code (`code`), and italics (*italic*)
  const boldParts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  
  return boldParts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className={`font-semibold ${isDarkBg ? 'text-white font-bold' : 'text-primary dark:text-foreground'}`}>
          {inner}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      return (
        <code key={i} className={`px-1 py-0.5 rounded text-[11px] font-mono ${isDarkBg ? 'bg-white/20 text-white' : 'bg-neutral-100 dark:bg-muted text-primary'}`}>
          {inner}
        </code>
      );
    }

    // Check for *italic* within normal text chunks
    const italicParts = part.split(/(?<!\*)\*([^*]+)\*(?!\*)/g);
    if (italicParts.length > 1) {
      return (
        <span key={i}>
          {italicParts.map((sub, j) => {
            if (j % 2 === 1) {
              return (
                <em key={j} className={`italic font-medium ${isDarkBg ? 'text-white/90' : 'text-foreground'}`}>
                  {sub}
                </em>
              );
            }
            return sub;
          })}
        </span>
      );
    }

    return <span key={i}>{part}</span>;
  });
};

const renderChatMessageContent = (content: string, isUser = false) => {
  if (!content) return null;
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Table Detection: consecutive lines with pipe '|' characters
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      // Filter out separator lines (e.g. |---|---|)
      const dataRows = tableLines.filter(tl => !/^\|[\s\-:]+\|\s*$/.test(tl) && !tl.replace(/[\|\s\-:]/g, '').length === false);
      
      if (dataRows.length > 0) {
        const parseRow = (r: string) => {
          const cells = r.split('|').map(c => c.trim());
          // remove first and last empty elements from leading/trailing pipe
          if (cells.length > 0 && cells[0] === '') cells.shift();
          if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
          return cells;
        };

        const headerCells = parseRow(dataRows[0]);
        const bodyRows = dataRows.slice(1).map(parseRow);

        elements.push(
          <div key={`table-${elements.length}`} className="my-2.5 overflow-x-auto rounded-xl border border-neutral-200/80 dark:border-border/80 bg-neutral-50/70 dark:bg-muted/20 shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100/90 dark:bg-muted/60 border-b border-neutral-200/80 dark:border-border/60">
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="p-2 font-bold text-primary dark:text-foreground">
                      {renderInlineText(h, isUser)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 dark:divide-border/50">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-neutral-100/50 dark:hover:bg-muted/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 align-top text-foreground/90">
                        {renderInlineText(cell, isUser)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Headings (e.g. ## Heading, ### Heading)
    const headingMatch = line.match(/^#{1,6}\s+(.*)/);
    if (headingMatch) {
      elements.push(
        <h4 key={`h-${elements.length}`} className={`font-serif font-bold text-sm sm:text-base mt-2.5 mb-1 pb-1 border-b border-neutral-200/60 dark:border-border/60 ${isUser ? 'text-white' : 'text-primary'}`}>
          {renderInlineText(headingMatch[1], isUser)}
        </h4>
      );
      i++;
      continue;
    }

    // 3. Dividers (e.g. --- or ***)
    if (line === '---' || line === '***' || line === '___') {
      elements.push(
        <hr key={`hr-${elements.length}`} className="my-2 border-neutral-200/60 dark:border-border/40" />
      );
      i++;
      continue;
    }

    // 4. Numbered List items (e.g. 1. Item)
    const numMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${elements.length}`} className="flex items-start gap-2 pl-0.5 my-1 text-xs sm:text-sm">
          <span className={`flex-shrink-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5 ${isUser ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
            {numMatch[1]}
          </span>
          <div className="flex-1 leading-relaxed">
            {renderInlineText(numMatch[2], isUser)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 5. Bullet Points (e.g. - Item, • Item, * Item)
    const bulletMatch = line.match(/^[\*\-•]\s+(.*)/);
    if (bulletMatch) {
      elements.push(
        <div key={`bullet-${elements.length}`} className="flex items-start gap-1.5 pl-0.5 my-0.5 text-xs sm:text-sm">
          <span className={`font-bold text-xs mt-0.5 ${isUser ? 'text-white/80' : 'text-secondary'}`}>•</span>
          <div className="flex-1 leading-relaxed">
            {renderInlineText(bulletMatch[1], isUser)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 6. Regular Paragraph
    elements.push(
      <p key={`p-${elements.length}`} className="leading-relaxed text-xs sm:text-sm">
        {renderInlineText(line, isUser)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1.5 font-sans">{elements}</div>;
};

export default function BlogPage() {
  const [query, setQuery] = useState("")
  const [posts, setPosts] = useState<BlogPostSummary[]>([])
  const [mappings, setMappings] = useState<LawMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPostDetail | null>(null)

  // Adjacent Blog AI Chatbot State
  const [chatMessages, setChatMessages] = useState<BlogChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  // Reset & initialize chatbot whenever an article is opened
  useEffect(() => {
    if (selectedPost) {
      setChatMessages([
        {
          role: "assistant",
          content: `👋 **NyayAssist Article AI Assistant**\n\nI am ready to answer any questions or scenario queries regarding **${selectedPost.title}** (${selectedPost.source_sections || 'BNS / BNSS / BSA'}).\n\nAsk me about penalties, bail eligibility, evidence requirements, or how this compares with the old IPC/CrPC law.`,
          relevant_sections: selectedPost.source_sections ? selectedPost.source_sections.split(",").map(s => s.trim()) : [],
          suggested_followups: [
            "What is the maximum penalty prescribed?",
            "Is this offense bailable and cognizable?",
            "What evidence is required to prove this under BSA?"
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
      setChatInput("")
    }
  }, [selectedPost?.post_id])

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages, chatLoading])

  const handleSendQuestion = async (customText?: string) => {
    const questionText = (customText || chatInput).trim()
    if (!questionText || !selectedPost || chatLoading) return

    const userMsg: BlogChatMessage = {
      role: "user",
      content: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const currentHistory = [...chatMessages, userMsg]
    setChatMessages(currentHistory)
    setChatInput("")
    setChatLoading(true)

    try {
      const historyPayload = currentHistory.map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await fetch("/api/blog/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: selectedPost.post_id,
          post_title: selectedPost.title,
          crime_type: selectedPost.crime_type,
          source_sections: selectedPost.source_sections,
          post_body: selectedPost.body,
          question: questionText,
          history: historyPayload
        })
      })

      if (!response.ok) throw new Error("Failed to query Blog AI Assistant")
      const data = await response.json()

      const botMsg: BlogChatMessage = {
        role: "assistant",
        content: data.answer,
        relevant_sections: data.relevant_sections,
        suggested_followups: data.suggested_followups,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setChatMessages(prev => [...prev, botMsg])
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Under Indian statutory provisions, offenses of this nature are governed by the **Bharatiya Nyaya Sanhita, 2023 (BNS)** and procedural safeguards under the **BNSS, 2023**.\n\nYou can ask specific questions regarding bail, FIR registration, or section comparisons.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setChatLoading(false)
    }
  }

  const copyMessageContent = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedMsgIdx(idx)
    setTimeout(() => setCopiedMsgIdx(null), 2000)
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      const data = await fetchApi(`/blog/search?q=${encodeURIComponent(query)}`)
      setPosts(data.posts)
      setMappings(data.mappings)
      setSelectedPost(null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Load all on mount
  useEffect(() => {
    handleSearch()
  }, [])

  const viewPost = async (postId: string) => {
    setLoading(true)
    try {
      const data = await fetchApi(`/blog/posts/${postId}`)
      setSelectedPost(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (content: string) => {
    if (!content) return null;
    let cleanContent = content.trim();
    
    // Strip markdown code fences if wrapped
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    }

    // Check if content is valid JSON object
    let jsonData: any = null;
    if (cleanContent.startsWith('{') || cleanContent.startsWith('[')) {
      try {
        jsonData = JSON.parse(cleanContent);
      } catch (e) {
        try {
          jsonData = new Function("return " + cleanContent)();
        } catch (e2) {
          jsonData = null;
        }
      }
    }

    // If database wrapped it in a { title, body } object
    if (jsonData && typeof jsonData === 'object' && jsonData.body && (typeof jsonData.body === 'object' || typeof jsonData.body === 'string')) {
      jsonData = jsonData.body;
    }

    // 1. JSON Structured Renderer
    if (jsonData && typeof jsonData === 'object') {
      const renderNode = (node: any, depth = 0): React.ReactNode => {
        if (typeof node === 'string') {
          return <p className="mb-4 text-sm sm:text-base leading-relaxed text-foreground/90 font-sans">{renderInlineText(node)}</p>;
        }
        if (Array.isArray(node)) {
          return (
            <ul className="space-y-2 mb-4 pl-1">
              {node.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm sm:text-base text-foreground/90 font-sans leading-relaxed">
                  <span className="text-secondary mt-1 text-sm font-bold leading-none">•</span>
                  <div className="flex-1">{renderNode(item, depth + 1)}</div>
                </li>
              ))}
            </ul>
          );
        }
        if (typeof node === 'object' && node !== null) {
          return (
            <div className="space-y-5">
              {Object.entries(node).map(([key, value], idx) => {
                if (depth === 0 && key === 'title') return null;
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <div key={idx} className={depth === 0 ? "mb-6" : "mb-4"}>
                    {depth === 0 ? (
                      <h3 className="text-xl sm:text-2xl font-serif font-bold text-primary mb-3 pb-2 border-b border-neutral-200/80 dark:border-border/60 flex items-center gap-2">
                        <span>{formattedKey}</span>
                      </h3>
                    ) : depth === 1 ? (
                      <h4 className="text-base sm:text-lg font-serif font-bold text-secondary mb-2 mt-4">{formattedKey}</h4>
                    ) : (
                      <h5 className="text-sm sm:text-base font-semibold text-primary mb-1 mt-3">{formattedKey}</h5>
                    )}
                    <div className="text-foreground/90">
                      {renderNode(value, depth + 1)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
        return null;
      };

      return renderNode(jsonData);
    }

    // 2. Markdown Rich Renderer (handles raw markdown strings with headings, lists, badges, and paragraphs)
    const lines = cleanContent.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (currentList.length > 0) {
        if (listType === 'ul') {
          elements.push(
            <ul key={`ul-${elements.length}`} className="space-y-2 mb-4 pl-1">
              {currentList}
            </ul>
          );
        } else if (listType === 'ol') {
          elements.push(
            <ol key={`ol-${elements.length}`} className="space-y-3 mb-5 pl-1">
              {currentList}
            </ol>
          );
        }
        currentList = [];
        listType = null;
      }
    };

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line) {
        flushList();
        return;
      }

      // Dividers
      if (line === '---' || line === '***' || line === '___') {
        flushList();
        elements.push(<hr key={`hr-${idx}`} className="my-6 border-neutral-200/80 dark:border-border/60" />);
        return;
      }

      // Markdown Headings (e.g. #, ##)
      const h1h2Match = line.match(/^#{1,2}\s+(.*)/);
      if (h1h2Match) {
        flushList();
        elements.push(
          <h3 key={`h-${idx}`} className="text-xl sm:text-2xl font-serif font-bold text-primary mb-3 mt-6 pb-2 border-b border-neutral-200/80 dark:border-border/60">
            {h1h2Match[1]}
          </h3>
        );
        return;
      }

      // Subheadings (e.g. ###, ####)
      const h3h4Match = line.match(/^#{3,6}\s+(.*)/);
      if (h3h4Match) {
        flushList();
        elements.push(
          <h3 key={`h-${idx}`} className="text-lg sm:text-xl font-serif font-bold text-primary mb-3 mt-6 pb-2 border-b border-neutral-200/80 dark:border-border/60">
            {h3h4Match[1]}
          </h3>
        );
        return;
      }

      // Numbered List Items (e.g. "1. **Title:** description" or "1. description")
      const numberedMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);
      if (numberedMatch) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        const num = numberedMatch[1];
        const text = numberedMatch[2];
        currentList.push(
          <li key={`li-${idx}`} className="flex items-start gap-3 text-sm sm:text-base text-foreground/90 font-sans leading-relaxed">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5 shadow-2xs">
              {num}
            </span>
            <div className="flex-1">{renderInlineText(text)}</div>
          </li>
        );
        return;
      }

      // Bullet points (e.g. "- item" or "* item")
      const bulletMatch = line.match(/^[\*\-•]\s+(.*)/);
      if (bulletMatch) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        const text = bulletMatch[1];
        currentList.push(
          <li key={`li-${idx}`} className="flex items-start gap-2.5 text-sm sm:text-base text-foreground/90 font-sans leading-relaxed pl-2">
            <span className="text-secondary mt-1 text-sm font-bold leading-none">•</span>
            <div className="flex-1">{renderInlineText(text)}</div>
          </li>
        );
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="mb-4 text-sm sm:text-base leading-relaxed text-foreground/90 font-sans">
          {renderInlineText(line)}
        </p>
      );
    });

    flushList();
    return <div className="space-y-1">{elements}</div>;
  };

  if (selectedPost) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header Actions */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setSelectedPost(null)}
            className="gap-2 text-xs font-semibold bg-white dark:bg-card hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            &larr; Back to Articles
          </Button>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
              Verified Bharatiya Nyaya Sanhita (BNS) Analysis
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Article (Left) + AI Chatbot (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Full Blog Article (col-span-7 on desktop, 8 on xl) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            <Card className="bg-white dark:bg-card shadow-lg shadow-neutral-900/5 dark:shadow-black/20 border border-neutral-200/80 dark:border-border/80 rounded-2xl overflow-hidden">
              <CardHeader className="p-6 sm:p-8 bg-neutral-50/70 dark:bg-muted/30 border-b border-neutral-100 dark:border-border/60">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-wider">
                    {selectedPost.crime_type}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    Source: {selectedPost.source_sections}
                  </span>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-serif font-bold text-primary leading-tight">
                  {selectedPost.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                <div className="prose prose-sm md:prose-base text-foreground max-w-none">
                  {renderContent(selectedPost.body)}
                </div>
                
                {selectedPost.mappings && selectedPost.mappings.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-neutral-200/80 dark:border-border/60">
                    <h4 className="font-serif font-bold text-lg mb-4 text-primary flex items-center gap-2">
                      <Scale className="w-5 h-5 text-secondary" />
                      <span>Statutory Transition Mappings (Old Act &rarr; New Act)</span>
                    </h4>
                    <div className="grid gap-3">
                      {selectedPost.mappings.map((m, idx) => (
                        <div key={idx} className="bg-neutral-50 dark:bg-muted/30 border border-neutral-200/70 dark:border-border/60 p-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm">
                          <div className="text-muted-foreground line-through font-medium">
                            {m.old_act} Section {m.old_section}
                          </div>
                          <ArrowRight className="h-4 w-4 text-secondary flex-shrink-0" />
                          <div className="font-bold text-primary">
                            {m.new_act} Section {m.new_section}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Sticky Adjacent AI Chatbot (col-span-5 on desktop) */}
          <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-20 space-y-4">
            <Card className="bg-white dark:bg-card shadow-xl shadow-neutral-900/10 dark:shadow-black/30 border border-neutral-200/90 dark:border-border rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-6.5rem)] max-h-[780px] min-h-[560px]">
              
              {/* Chatbot Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-primary to-primary/95 text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary/20 border border-secondary/40 flex items-center justify-center text-secondary shadow-inner">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base sm:text-lg text-white leading-tight flex items-center gap-2">
                      Article AI Assistant
                    </h3>
                    <p className="text-[11px] text-white/80 line-clamp-1">
                      Ask follow-ups, penalties & BNS applicability
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setChatMessages([
                      {
                        role: "assistant",
                        content: `👋 **NyayAssist Article AI Assistant**\n\nI am ready to answer any questions or scenario queries regarding **${selectedPost.title}** (${selectedPost.source_sections || 'BNS / BNSS / BSA'}).\n\nAsk me about penalties, bail eligibility, evidence requirements, or how this compares with the old IPC/CrPC law.`,
                        relevant_sections: selectedPost.source_sections ? selectedPost.source_sections.split(",").map(s => s.trim()) : [],
                        suggested_followups: [
                          "What is the maximum penalty prescribed?",
                          "Is this offense bailable and cognizable?",
                          "What evidence is required to prove this under BSA?"
                        ],
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ])
                  }}
                  className="h-8 px-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg gap-1.5"
                  title="Restart Article Chat"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50 dark:bg-muted/10">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} space-y-1.5`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                      {msg.role === "user" ? (
                        <>
                          <span>You</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3 h-3 text-secondary" />
                          <span className="font-semibold text-primary">Nyay AI</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </>
                      )}
                    </div>

                    <div 
                      className={`relative max-w-[92%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                        msg.role === "user"
                          ? "bg-primary text-white rounded-tr-xs font-medium"
                          : "bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 text-foreground rounded-tl-xs"
                      }`}
                    >
                      {/* Message Content */}
                      <div>
                        {renderChatMessageContent(msg.content, msg.role === "user")}
                      </div>

                      {/* Assistant Additional Metadata: Relevant Sections & Suggested Followups */}
                      {msg.role === "assistant" && (
                        <>
                          {msg.relevant_sections && msg.relevant_sections.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-border/60 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Relevant:</span>
                              {msg.relevant_sections.map((sec, sIdx) => (
                                <span key={sIdx} className="px-2 py-0.5 rounded-md bg-secondary/15 text-secondary text-[11px] font-bold">
                                  {sec}
                                </span>
                              ))}
                            </div>
                          )}

                          {msg.suggested_followups && msg.suggested_followups.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-border/60 space-y-1.5">
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                                <HelpCircle className="w-3 h-3 text-secondary" />
                                <span>Suggested follow-ups:</span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {msg.suggested_followups.map((chip, cIdx) => (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => handleSendQuestion(chip)}
                                    disabled={chatLoading}
                                    className="text-left text-xs bg-neutral-100/80 hover:bg-secondary/15 hover:text-secondary text-primary font-medium px-2.5 py-1.5 rounded-lg border border-neutral-200/60 transition-all duration-150 flex items-center justify-between group disabled:opacity-50"
                                  >
                                    <span className="line-clamp-1">{chip}</span>
                                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-secondary transition-opacity flex-shrink-0 ml-1" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Copy Button */}
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => copyMessageContent(msg.content, idx)}
                              className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                              title="Copy response"
                            >
                              {copiedMsgIdx === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {chatLoading && (
                  <div className="flex flex-col items-start space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                      <Bot className="w-3 h-3 text-secondary" />
                      <span className="font-semibold text-primary">Nyay AI</span>
                      <span>is analyzing statute...</span>
                    </div>
                    <div className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 rounded-2xl rounded-tl-xs p-3.5 shadow-2xs flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex gap-1 items-center">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 rounded-full bg-secondary animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 rounded-full bg-secondary animate-bounce"></span>
                      </div>
                      <span className="font-medium text-primary">Analyzing legal provisions & penalties...</span>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input & Full Consultation Link */}
              <div className="p-3 sm:p-4 bg-white dark:bg-card border-t border-neutral-200/80 dark:border-border/80 space-y-2.5">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendQuestion()
                  }} 
                  className="flex items-center gap-2"
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a follow-up about this article..."
                    disabled={chatLoading}
                    className="text-xs sm:text-sm bg-neutral-50 dark:bg-muted/30 focus-visible:ring-secondary"
                  />
                  <Button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-primary hover:bg-primary/90 text-white font-semibold h-9 px-3.5 rounded-lg flex-shrink-0 shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-neutral-100 dark:border-border/60">
                  <span className="truncate">Trained on BNS, BNSS & BSA 2023</span>
                  <Link 
                    to="/chat" 
                    className="inline-flex items-center gap-1 font-semibold text-secondary hover:text-secondary/80 hover:underline flex-shrink-0"
                  >
                    <span>Full Legal Chat</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

            </Card>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif font-bold text-primary flex items-center justify-center gap-2">
          <BookOpen className="h-8 w-8 text-secondary" />
          Legal Blog & Law Mapper
        </h2>
        <p className="text-muted-foreground mt-2">
          Search for sections across IPC/BNS, CrPC/BNSS, or read plain-language legal articles.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto">
        <Input 
          placeholder="Search for an article, or a section number (e.g. '302', 'BNS 103')..." 
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {mappings.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-serif text-xl font-bold text-primary">Law Mapping Matches</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mappings.map((m, i) => (
              <Card key={i} className="bg-accent/5 border-accent/20">
                <CardContent className="p-4 flex flex-col justify-center items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">{m.old_act} Sec {m.old_section}</span>
                  <ArrowRight className="h-4 w-4 text-accent" />
                  <span className="font-bold text-primary">{m.new_act} Sec {m.new_section}</span>
                  {m.remarks && <p className="text-xs text-center text-muted-foreground mt-2 truncate max-w-full" title={m.remarks}>{m.remarks}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 pt-6">
        <h3 className="font-serif text-xl font-bold text-primary">Articles</h3>
        {posts.length === 0 && !loading && (
          <p className="text-muted-foreground">No articles found. (You may need to run the blog generation script)</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map(p => (
            <Card key={p.post_id} className="cursor-pointer hover:border-primary transition-colors shadow-sm" onClick={() => viewPost(p.post_id)}>
              <CardHeader>
                <CardTitle className="text-lg">{p.title}</CardTitle>
                <CardDescription>{p.crime_type}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Source: {p.source_sections}</p>
                <Button variant="link" className="px-0 mt-2">Read more</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
