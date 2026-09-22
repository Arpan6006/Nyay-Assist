import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import { Scale, Send, MessageSquareText, ShieldAlert, Plus, Trash2, History, MessageSquare, Mic } from "lucide-react"
import { FormattedMessage, SourcesSection } from "../components/FormattedMessage"
import { VoiceFIRModal } from "../components/VoiceFIRModal"

type Message = {
  role: "user" | "assistant"
  content: string
  citations?: any[]
}

type ChatSession = {
  session_id: string
  title: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [useStructuredIntake, setUseStructuredIntake] = useState(true)
  const [isVoiceFIROpen, setIsVoiceFIROpen] = useState(false)
  
  // Chat history state
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const token = localStorage.getItem("token")
  
  const [intake, setIntake] = useState({
    incident: "",
    location: "",
    actions_taken: "",
    authority_response: "",
    next_steps: ""
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch session history for user
  const fetchSessions = async () => {
    const currentToken = localStorage.getItem("token")
    try {
      const res = await fetch("/api/chat/sessions", {
        headers: currentToken ? { "Authorization": `Bearer ${currentToken}` } : {}
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch (e) {
      console.error("Failed to load chat history:", e)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [token])

  // Load an existing session
  const loadSession = async (id: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/chat/sessions/${id}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const data = await res.json()
        setSessionId(data.session_id)
        setMessages(data.messages || [])
        setUseStructuredIntake(false)
      }
    } catch (e) {
      console.error("Failed to load session:", e)
    } finally {
      setIsLoading(false)
    }
  }

  // Confirm and delete a session via custom in-UI popup
  const confirmDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/chat/sessions/${id}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.session_id !== id))
        if (sessionId === id) {
          startNewChat()
        }
      }
    } catch (e) {
      console.error("Failed to delete session:", e)
    } finally {
      setSessionToDelete(null)
    }
  }

  // Start fresh chat
  const startNewChat = () => {
    setSessionId(null)
    setMessages([])
    setUseStructuredIntake(true)
    setIntake({
      incident: "",
      location: "",
      actions_taken: "",
      authority_response: "",
      next_steps: ""
    })
  }

  const sendPostRequest = async (payload: any) => {
    setIsLoading(true)
    
    // Optimistic UI for user message
    const userDisplayMsg = payload.message || `[Structured Intake]\nIncident: ${payload.structured_intake?.incident}`
    setMessages(prev => [...prev, { role: "user", content: userDisplayMsg }])
    
    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let errorDetail = "Failed to communicate with server"
        try {
          const errData = await response.json()
          errorDetail = errData.detail || errorDetail
        } catch {
          errorDetail = `Server returned status ${response.status}`
        }
        throw new Error(errorDetail)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder("utf-8")
      let assistantMsg = ""

      if (reader) {
        setMessages(prev => [...prev, { role: "assistant", content: "" }])
        let buffer = ""
        
        const processLine = (rawLine: string) => {
          const line = rawLine.trim()
          if (!line.startsWith('data: ')) return
          const dataStr = line.slice(6).trim()
          if (!dataStr) return
          try {
            const data = JSON.parse(dataStr)
            if (data.error) {
              setMessages(prev => {
                if (prev.length === 0) return prev
                const newMsgs = [...prev]
                newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: `Error: ${data.error}` }
                return newMsgs
              })
            }
            if (data.chunk) {
              assistantMsg += data.chunk
              setMessages(prev => {
                if (prev.length === 0) return prev
                const newMsgs = [...prev]
                newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: assistantMsg }
                return newMsgs
              })
            }
            if (data.session_id) {
              setSessionId(data.session_id)
              const initialTitle = data.title || payload.structured_intake?.incident?.slice(0, 35) || payload.message?.slice(0, 35) || "Legal Inquiry"
              setSessions(prev => {
                if (prev.some(s => s.session_id === data.session_id)) return prev
                return [{ session_id: data.session_id, title: initialTitle }, ...prev]
              })
            }
            if (data.done) {
              if (data.citations) {
                setMessages(prev => {
                  if (prev.length === 0) return prev
                  const newMsgs = [...prev]
                  newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], citations: data.citations }
                  return newMsgs
                })
              }
              fetchSessions()
            }
          } catch (e) {
            // ignore incomplete JSON chunks
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (buffer.trim()) {
              processLine(buffer)
            }
            break
          }
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ""
          
          for (const line of lines) {
            processLine(line)
          }
        }
      }
    } catch (err: any) {
      console.error(err)
      const errMsg = err?.message || "Error communicating with the AI. Please try again."
      setMessages(prev => [...prev, { role: "assistant", content: errMsg }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setUseStructuredIntake(false)
    sendPostRequest({
      session_id: sessionId,
      structured_intake: intake
    })
  }

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return
    
    const msg = inputMessage
    setInputMessage("")
    
    sendPostRequest({
      session_id: sessionId,
      message: msg
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10.5rem)] min-h-[520px]">
      {/* Top Header */}
      <div className="mb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-accent" />
            Legal Chat Assistant
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Consult the BNS, BNSS, and BSA databases with statutory citations.
          </p>
        </div>

        {/* Voice FIR Drafter, Sidebar Toggle & New Chat Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVoiceFIROpen(true)}
            className="flex items-center gap-1.5 text-xs bg-secondary/15 hover:bg-secondary/25 text-primary border-secondary/40 shadow-xs font-semibold cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-secondary" />
            <span>Voice FIR Drafter</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="flex items-center gap-1.5 text-xs"
          >
            <History className="w-3.5 h-3.5" />
            <span>{isSidebarOpen ? "Hide History" : "Chat History"}</span>
          </Button>
          <Button
            size="sm"
            onClick={startNewChat}
            className="flex items-center gap-1.5 text-xs shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </Button>
        </div>
      </div>

      {/* Main Container with Sidebar + Chat Area */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        
        {/* Left Sidebar for Chat History */}
        {isSidebarOpen && (
          <div className="w-64 sm:w-72 flex-shrink-0 flex flex-col bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 rounded-2xl p-3.5 shadow-md shadow-neutral-900/5 dark:shadow-black/20 overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-primary" />
                Chat History
              </span>
              <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {sessions.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <p>No previous conversations.</p>
                  <p className="mt-1 opacity-75">Start a chat to see it saved here.</p>
                </div>
              ) : (
                sessions.map((s) => (
                  sessionToDelete === s.session_id ? (
                    <div
                      key={s.session_id}
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-xs shadow-sm animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="flex items-center gap-1.5 text-destructive font-medium">
                        <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Delete this chat history?</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSessionToDelete(null)
                          }}
                          className="px-2 py-1 text-[11px] rounded hover:bg-background/80 text-muted-foreground transition-colors font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => confirmDelete(s.session_id, e)}
                          className="px-2.5 py-1 text-[11px] rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium shadow-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={s.session_id}
                      onClick={() => loadSession(s.session_id)}
                      className={`group flex items-center justify-between p-2.5 rounded-lg text-xs font-sans cursor-pointer transition-all border ${
                        sessionId === s.session_id
                          ? "bg-primary/10 border-primary/30 text-primary font-medium shadow-xs"
                          : "border-transparent hover:bg-muted/70 text-foreground/85"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-1">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                        <span className="truncate">{s.title || "Legal Inquiry"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSessionToDelete(s.session_id)
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded transition-opacity flex-shrink-0"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Area / Intake Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {messages.length === 0 && useStructuredIntake ? (
            <Card className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-card shadow-lg shadow-neutral-900/5 dark:shadow-black/20 border border-neutral-200/80 dark:border-border/80 rounded-2xl w-full h-full">
              <CardHeader className="py-3.5 px-5 sm:px-6 border-b border-neutral-100 dark:border-border/60 flex-shrink-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold font-serif text-primary">Initial Case Intake</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Provide incident details to contextualize your legal query under BNS, BNSS, and BSA.</p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Scale className="w-3.5 h-3.5 text-secondary" />
                  <span>Indian Legal Corpus</span>
                </span>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Voice FIR Feature Callout Banner */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-secondary/10 border border-secondary/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary flex-shrink-0 shadow-xs">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-primary flex items-center gap-2">
                        <span>Prefer to speak? Draft an official Police FIR</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">BNSS Sec. 173</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">Speak your incident in plain words to generate a print-ready FIR complaint letter.</p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={() => setIsVoiceFIROpen(true)}
                    className="h-8 text-xs bg-amber-400 hover:bg-amber-500 text-black flex-shrink-0 shadow-xs font-bold gap-1.5 px-3 rounded-xl border border-amber-500/30"
                  >
                    <Mic className="w-3.5 h-3.5 text-black" />
                    <span className="text-black">Voice FIR Drafter</span>
                  </Button>
                </div>

                <form id="caseIntakeForm" onSubmit={handleIntakeSubmit} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-primary uppercase tracking-wider">
                      What is the nature of the incident? <span className="text-destructive">*</span>
                    </Label>
                    <Input 
                      value={intake.incident} 
                      onChange={e => setIntake({...intake, incident: e.target.value})} 
                      placeholder="e.g. Someone stole my bike / Cheating & cyber fraud in Noida / Assault near market" 
                      required 
                      className="h-9 text-xs sm:text-sm font-sans text-black bg-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Location of incident <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        value={intake.location} 
                        onChange={e => setIntake({...intake, location: e.target.value})} 
                        placeholder="e.g. New Delhi, public road / Sector 18 Noida" 
                        required 
                        className="h-9 text-xs sm:text-sm font-sans text-black bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Actions taken so far <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        value={intake.actions_taken} 
                        onChange={e => setIntake({...intake, actions_taken: e.target.value})} 
                        placeholder="e.g. Filed online cyber complaint / None yet" 
                        required 
                        className="h-9 text-xs sm:text-sm font-sans text-black bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Police or authority response <span className="text-destructive">*</span>
                      </Label>
                      <textarea 
                        value={intake.authority_response} 
                        onChange={e => setIntake({...intake, authority_response: e.target.value})} 
                        placeholder="e.g. Refused to register FIR / Delay in inquiry / Police asked for compromise" 
                        required 
                        rows={3}
                        className="flex w-full rounded-xl border border-neutral-200/80 dark:border-border/80 bg-white dark:bg-card p-2.5 text-xs sm:text-sm font-sans text-black placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-xs resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary uppercase tracking-wider">
                        What do you want to do next? <span className="text-destructive">*</span>
                      </Label>
                      <textarea 
                        value={intake.next_steps} 
                        onChange={e => setIntake({...intake, next_steps: e.target.value})} 
                        placeholder="e.g. Know applicable BNS sections, bail terms, police escalation remedies & next steps" 
                        required 
                        rows={3}
                        className="flex w-full rounded-xl border border-neutral-200/80 dark:border-border/80 bg-white dark:bg-card p-2.5 text-xs sm:text-sm font-sans text-black placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-xs resize-none"
                      />
                    </div>
                  </div>
                </form>
              </CardContent>

              <CardFooter className="p-3.5 sm:p-4 bg-neutral-50/80 dark:bg-card/80 border-t border-neutral-200/80 dark:border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  <span className="text-black">AI evaluates statutory provisions under BNS 2023 & BNSS 2023</span>
                </span>

                <Button 
                  type="submit" 
                  form="caseIntakeForm"
                  className="w-full sm:w-auto h-10 px-6 font-semibold text-xs sm:text-sm shadow-md bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  <span className="text-white">Start Legal Analysis</span>
                  <Send className="w-3.5 h-3.5 text-white" />
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-card shadow-lg shadow-neutral-900/5 dark:shadow-black/20 border border-neutral-200/80 dark:border-border/80 rounded-2xl">
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`w-fit max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 shadow-sm break-words overflow-hidden ${
                        msg.role === 'user' 
                          ? 'bg-amber-100 text-black border border-amber-300 ml-auto' 
                          : 'bg-muted/70 text-black border border-border/60 mr-auto'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 font-bold text-xs tracking-wider uppercase opacity-90 text-black">
                        {msg.role === 'user' ? <MessageSquareText className="w-4 h-4 flex-shrink-0 text-black" /> : <Scale className="w-4 h-4 text-black flex-shrink-0" />}
                        <span className="text-black">{msg.role === 'user' ? 'You' : 'NyayAssist AI'}</span>
                      </div>
                      
                      {msg.role === 'user' ? (
                        <div className="text-sm font-sans leading-relaxed break-words whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      ) : (
                        <FormattedMessage content={msg.content} />
                      )}
                      
                      {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                        <SourcesSection citations={msg.citations} />
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground max-w-[80%] rounded-2xl p-4 flex items-center gap-2 border border-border/60">
                      <span className="animate-pulse text-sm">Consulting the Indian legal corpus...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
              <CardFooter className="p-3.5 bg-neutral-50/80 dark:bg-card/80 border-t border-neutral-200/80 dark:border-border/60">
                <form onSubmit={handleMessageSubmit} className="flex w-full items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsVoiceFIROpen(true)}
                    title="Open Voice-Assisted FIR & Complaint Drafter"
                    className="h-9 w-9 flex-shrink-0 border-secondary/40 text-secondary hover:bg-secondary/10 shadow-xs"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Input 
                    value={inputMessage} 
                    onChange={e => setInputMessage(e.target.value)} 
                    placeholder="Ask a follow-up question, or click mic to draft an FIR..." 
                    disabled={isLoading}
                    className="flex-1 font-sans text-sm bg-white dark:bg-card shadow-xs focus-visible:ring-1"
                  />
                  <Button type="submit" disabled={isLoading || !inputMessage.trim()} size="icon" className="shadow-sm">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {/* Voice FIR Drafter Modal */}
      <VoiceFIRModal 
        isOpen={isVoiceFIROpen} 
        onClose={() => setIsVoiceFIROpen(false)}
        onSendToChat={(firSummaryText) => {
          setUseStructuredIntake(false)
          sendPostRequest({
            session_id: sessionId,
            message: firSummaryText
          })
        }}
      />
    </div>
  )
}
