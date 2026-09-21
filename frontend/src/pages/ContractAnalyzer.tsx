import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { 
  Upload, 
  CheckCircle2, 
  FileSearch, 
  ShieldAlert, 
  AlertTriangle, 
  FileText, 
  Scale, 
  Copy, 
  Check, 
  RotateCcw,
  Sparkles,
  FileCheck,
  X,
  Sliders,
  Mail,
  Download,
  Clock,
  RefreshCw,
  Briefcase
} from "lucide-react"
import { fetchApi } from "../lib/api"

type ContractClause = {
  clause: string
  issue: string
  severity?: "High" | "Medium" | "Low"
  statutory_concept: string
  recommendation?: string
  protective_redline?: string
  redline_rationale?: string
}

type ContractAnalysisResult = {
  summary: string
  document_type?: string
  risk_level?: "High" | "Medium" | "Low"
  risk_score?: number
  is_legal_notice?: boolean
  key_terms: Record<string, string>
  flagged_clauses: ContractClause[]
  immediate_action_items?: string[]
  governing_laws?: string[]
}

export default function ContractAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<ContractAnalysisResult | null>(null)
  const [activeTab, setActiveTab] = useState<"audit" | "reply_notice" | "negotiate">("audit")
  
  // Custom clause redraft state (by index)
  const [customizingIndex, setCustomizingIndex] = useState<number | null>(null)
  const [customInstruction, setCustomInstruction] = useState("")
  const [customStance, setCustomStance] = useState("balanced")
  const [redraftLoading, setRedraftLoading] = useState(false)
  const [clauseRedrafts, setClauseRedrafts] = useState<Record<number, { redraft: string; explanation: string }>>({})
  const [copiedRedlineIdx, setCopiedRedlineIdx] = useState<number | null>(null)

  // Reply notice generator state
  const [clientName, setClientName] = useState("")
  const [oppositeParty, setOppositeParty] = useState("")
  const [advocateName, setAdvocateName] = useState("")
  const [defenseStance, setDefenseStance] = useState("Complete Denial of Allegations & Frivolous Demand")
  const [keyFacts, setKeyFacts] = useState("")
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyError, setReplyError] = useState("")
  const [replyNoticeResult, setReplyNoticeResult] = useState<{
    reply_notice_markdown?: string
    legal_grounds?: string[]
    statutory_citations?: string[]
    recommended_next_steps?: string[]
  } | null>(null)
  const [replyCopied, setReplyCopied] = useState(false)

  // Negotiation email state
  const [emailSenderName, setEmailSenderName] = useState("")
  const [emailRecipientName, setEmailRecipientName] = useState("")
  const [emailTone, setEmailTone] = useState("constructive_professional")
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [negotiationEmail, setNegotiationEmail] = useState<{ subject: string; email_body: string } | null>(null)
  const [emailCopied, setEmailCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAllowedDocument = (f: File) => {
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase()
    return [".pdf", ".docx", ".doc", ".txt", ".rtf", ".md"].includes(ext)
  }

  const formatCleanPlainText = (text: string): string => {
    if (!text) return ""
    let clean = text
    // Strip markdown code fences
    clean = clean.replace(/^```[a-zA-Z]*\n?/gm, "").replace(/\n?```$/gm, "")
    // Strip markdown header hashes ### Header -> Header
    clean = clean.replace(/^#{1,6}\s*(.*)/gm, "$1")
    // Strip bold/italic asterisks & underscores (**bold** -> bold)
    clean = clean.replace(/\*\*(.*?)\*\*/g, "$1")
    clean = clean.replace(/\*(.*?)\*/g, "$1")
    clean = clean.replace(/__(.*?)__/g, "$1")
    clean = clean.replace(/_(.*?)_/g, "$1")
    // Strip horizontal rules
    clean = clean.replace(/^\s*[-*_]{3,}\s*$/gm, "")
    // Clean markdown table lines
    const lines: string[] = []
    for (const line of clean.split("\n")) {
      if (/^\s*\|?\s*[-:]+\s*\|/.test(line)) continue
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const cells = line.trim().slice(1, -1).split("|").map(c => c.trim()).filter(Boolean)
        if (cells.length > 0) {
          lines.push(" • " + cells.join(" : "))
          continue
        }
      }
      lines.push(line)
    }
    clean = lines.join("\n")
    return clean.replace(/\n{3,}/g, "\n\n").trim()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (!isAllowedDocument(selected)) {
        setError("Image uploads are not supported. Please upload a document file (PDF, DOCX, DOC, or TXT).")
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
        return
      }
      setFile(selected)
      setResult(null)
      setReplyNoticeResult(null)
      setNegotiationEmail(null)
      setClauseRedrafts({})
      setError("")
      setReplyError("")
      setEmailError("")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0]
      if (!isAllowedDocument(dropped)) {
        setError("Image uploads are not supported. Please upload a document file (PDF, DOCX, DOC, or TXT).")
        setFile(null)
        return
      }
      setFile(dropped)
      setResult(null)
      setReplyNoticeResult(null)
      setNegotiationEmail(null)
      setClauseRedrafts({})
      setError("")
      setReplyError("")
      setEmailError("")
    }
  }

  const handleAnalyze = async () => {
    if (!file) return
    
    setLoading(true)
    setError("")
    
    try {
      const formData = new FormData()
      formData.append("file", file)
      
      const data = await fetchApi("/contracts/analyze", {
        method: "POST",
        body: formData
      })
      
      setResult(data)
      setActiveTab(data.is_legal_notice ? "reply_notice" : "audit")
      
      // Pre-fill party details if extracted
      if (data.key_terms && data.key_terms["Parties Involved"]) {
        const parties = String(data.key_terms["Parties Involved"])
        setOppositeParty(parties)
        setEmailRecipientName(parties)
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis. Please verify your file format and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCustomRedraft = async (idx: number, clause: ContractClause) => {
    setRedraftLoading(true)
    try {
      const data = await fetchApi("/contracts/redraft-clause", {
        method: "POST",
        body: JSON.stringify({
          original_clause: clause.clause || "",
          issue: clause.issue || "",
          custom_instruction: customInstruction || null,
          stance: customStance || "balanced"
        })
      })
      
      setClauseRedrafts(prev => ({
        ...prev,
        [idx]: {
          redraft: formatCleanPlainText(data.redrafted_clause || ""),
          explanation: formatCleanPlainText(data.explanation || "")
        }
      }))
      setCustomizingIndex(null)
      setCustomInstruction("")
    } catch (err: any) {
      alert("Failed to redraft clause: " + (err.message || "Unknown error"))
    } finally {
      setRedraftLoading(false)
    }
  }

  const handleGenerateReplyNotice = async () => {
    if (!result) return
    setReplyLoading(true)
    setReplyError("")
    try {
      const claims = (result.flagged_clauses || []).map(f => f.issue || f.clause || "")
      const data = await fetchApi("/contracts/generate-reply-notice", {
        method: "POST",
        body: JSON.stringify({
          document_summary: result.summary || "Legal Document",
          notice_claims: claims,
          sender_client_name: clientName.trim() || "Client / Notice Recipient",
          opposite_party_name: oppositeParty.trim() || "Opposite Party / Claimant",
          advocate_name: advocateName.trim() || "Advocate on Record",
          user_defense_stance: defenseStance || "Complete Denial of Allegations",
          key_facts: keyFacts.trim()
        })
      })
      setReplyNoticeResult({
        ...data,
        reply_notice_markdown: formatCleanPlainText(data.reply_notice_markdown || "")
      })
    } catch (err: any) {
      setReplyError(err.message || "Failed to generate reply notice. Please check input parameters.")
    } finally {
      setReplyLoading(false)
    }
  }

  const handleGenerateRenegotiationEmail = async () => {
    if (!result) return
    setEmailLoading(true)
    setEmailError("")
    try {
      const data = await fetchApi("/contracts/generate-renegotiation-email", {
        method: "POST",
        body: JSON.stringify({
          contract_summary: result.summary || "Contract Agreement",
          flagged_clauses: result.flagged_clauses || [],
          sender_name: emailSenderName.trim() || "Concerned Party",
          recipient_name: emailRecipientName.trim() || "Counterparty / Legal Team",
          tone: emailTone || "constructive_professional"
        })
      })
      setNegotiationEmail({
        subject: formatCleanPlainText(data.subject || ""),
        email_body: formatCleanPlainText(data.email_body || "")
      })
    } catch (err: any) {
      setEmailError(err.message || "Failed to generate negotiation email.")
    } finally {
      setEmailLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setReplyNoticeResult(null)
    setNegotiationEmail(null)
    setClauseRedrafts({})
    setError("")
    setReplyError("")
    setEmailError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const copySummary = () => {
    if (!result) return
    const text = `Contract Summary:\n${formatCleanPlainText(result.summary)}\n\nRisk Level: ${result.risk_level || "Medium"} (Score: ${result.risk_score ?? 50}/100)\n\nKey Terms:\n${Object.entries(result.key_terms || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyText = (text: string, cb: () => void) => {
    navigator.clipboard.writeText(formatCleanPlainText(text))
    cb()
  }

  const downloadAsFile = (filename: string, content: string) => {
    const cleanContent = formatCleanPlainText(content)
    const element = document.createElement("a")
    const fileBlob = new Blob([cleanContent], { type: "text/plain;charset=utf-8" })
    element.href = URL.createObjectURL(fileBlob)
    element.download = filename
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-14 font-sans">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Contract Audit & Clause Redlining Suite</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-primary flex items-center justify-center gap-2">
          <FileSearch className="h-8 w-8 text-secondary" />
          Contract Risk & Loophole Auditor
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
          Upload any legal contract, tenancy agreement, employment deed, or received legal notice. AI analyzes hidden liabilities, generates balanced protective redlines, and drafts legal counter-replies.
        </p>
      </div>

      {!result ? (
        <Card className="max-w-2xl mx-auto shadow-lg shadow-neutral-900/5 border-2 border-dashed border-neutral-300 dark:border-border/80 bg-white dark:bg-card rounded-2xl overflow-hidden">
          <CardContent className="p-8 sm:p-10">
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-8 rounded-xl cursor-pointer transition-all border-2 border-dashed ${
                isDragging 
                  ? "border-secondary bg-secondary/10 scale-[1.01]" 
                  : "border-neutral-200 dark:border-border/60 hover:bg-neutral-50/80 dark:hover:bg-muted/40"
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center mb-4 shadow-sm">
                <Upload className="h-8 w-8" />
              </div>
              
              <h3 className="text-base sm:text-lg font-semibold text-primary text-center">
                {file ? file.name : "Drag & drop your contract or legal notice here, or browse"}
              </h3>
              
              <p className="text-xs text-muted-foreground text-center mt-1.5">
                Supported formats: <strong>PDF, DOCX, DOC, TXT</strong> (Agreements, Deeds, Notices)
              </p>

              {file && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium border border-primary/20 shadow-xs animate-in fade-in zoom-in-95 duration-150"
                >
                  <FileText className="w-4 h-4 text-secondary flex-shrink-0" />
                  <span className="truncate max-w-[220px] font-semibold">{file.name}</span>
                  <span className="text-muted-foreground text-[11px]">({formatFileSize(file.size)})</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      setError("")
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                    className="ml-1 p-1 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center cursor-pointer"
                    title="Remove selected file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,application/pdf,.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.txt"
              className="hidden" 
            />
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }} 
                variant="outline"
                className="w-full sm:w-auto"
              >
                {file ? "Choose Another File" : "Select Document"}
              </Button>
              
              {file && (
                <Button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAnalyze()
                  }} 
                  disabled={loading} 
                  className="w-full sm:w-auto gap-2 bg-primary text-white hover:bg-primary/90 shadow-md"
                >
                  <Sparkles className="h-4 w-4 text-secondary" />
                  <span>{loading ? "Auditing Document..." : "Start AI Risk Audit"}</span>
                </Button>
              )}
            </div>

            {loading && (
              <div className="mt-6 p-4 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center gap-3 text-xs text-black font-medium animate-pulse">
                <RefreshCw className="w-4 h-4 text-black animate-spin" />
                <span className="text-black">Extracting clauses, evaluating statutory risks, and drafting protective redlines...</span>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-destructive" />
                  <span>Analysis Failed</span>
                </div>
                <p>{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Top Bar Header & Action Badges */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-card p-5 rounded-2xl border border-neutral-200/80 dark:border-border/80 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 text-black border border-neutral-200 flex items-center justify-center font-bold">
                <FileCheck className="w-6 h-6 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-black">
                    {result.document_type || "Legal Document Analysis"}
                  </h3>
                  {result.is_legal_notice && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                      Legal Notice / Summons
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 font-medium">{file?.name || "Uploaded Document"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copySummary} className="gap-1.5 text-xs text-black">
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                <span className="text-black">{copied ? "Copied" : "Copy Report"}</span>
              </Button>
              <Button size="sm" onClick={reset} variant="ghost" className="gap-1.5 text-xs text-black">
                <RotateCcw className="w-3.5 h-3.5 text-black" />
                <span className="text-black">Upload New</span>
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 dark:border-border pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "audit"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-neutral-100"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-secondary" />
              <span>Clause Redlining & Risk Audit</span>
              {result.flagged_clauses && result.flagged_clauses.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "audit" ? "bg-white/20 text-white" : "bg-destructive/15 text-destructive"
                }`}>
                  {result.flagged_clauses.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reply_notice")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "reply_notice"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-neutral-100"
              }`}
            >
              <Scale className="w-4 h-4 text-secondary" />
              <span>Draft Legal Reply / Counter-Notice</span>
              {result.is_legal_notice && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                  Urgent
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("negotiate")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "negotiate"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-neutral-100"
              }`}
            >
              <Mail className="w-4 h-4 text-secondary" />
              <span>Counterparty Negotiation Drafter</span>
            </button>
          </div>

          {/* TAB 1: CLAUSE AUDIT & REDLINING */}
          {activeTab === "audit" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Executive Summary, Urgent Actions & Redlines */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Executive Summary Card with Risk Meter */}
                <Card className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 shadow-md rounded-2xl overflow-hidden">
                  <CardHeader className="bg-neutral-50/70 dark:bg-muted/30 border-b border-neutral-100 dark:border-border/60 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-base font-serif">
                        <CheckCircle2 className="h-5 w-5 text-secondary" />
                        Executive Audit Summary
                      </CardTitle>

                      <div className="flex items-center gap-2">
                        {/* Risk Meter Badge */}
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          (result.risk_score ?? 50) >= 65 || result.risk_level === "High"
                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                            : (result.risk_score ?? 50) >= 35 || result.risk_level === "Medium"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                            : "bg-green-600/15 text-green-700 dark:text-green-400 border border-green-600/30"
                        }`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Risk Score: {result.risk_score ?? 50}/100 ({result.risk_level || "Medium"})</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <p className="text-foreground text-sm leading-relaxed font-sans whitespace-pre-wrap">
                      {formatCleanPlainText(result.summary)}
                    </p>

                    {/* Immediate Action Items Checklist */}
                    {result.immediate_action_items && result.immediate_action_items.length > 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                          <Clock className="w-4 h-4" />
                          <span>Immediate Statutory Action Items & Safeguards:</span>
                        </div>
                        <ul className="space-y-1.5 pl-1">
                          {result.immediate_action_items.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed font-medium">
                              <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">▪</span>
                              <span>{formatCleanPlainText(item)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Flagged Clauses & Redline Studio */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-lg text-primary flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-destructive" />
                        Flagged Problematic Clauses & Protective Redlines
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Examine risky clauses alongside AI-crafted balanced alternatives ready for renegotiation.
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {result.flagged_clauses?.length || 0} Clauses Flagged
                    </span>
                  </div>

                  {!result.flagged_clauses || result.flagged_clauses.length === 0 ? (
                    <Card className="bg-white dark:bg-card border border-green-500/30 shadow-xs rounded-2xl p-8 text-center">
                      <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2 opacity-80" />
                      <p className="font-serif font-bold text-base text-foreground">Standard & Balanced Document</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        No predatory liabilities, unconscionable lock-in periods, or non-compete overreaches detected.
                      </p>
                    </Card>
                  ) : (
                    result.flagged_clauses.map((flag, idx) => {
                      const redraftData = clauseRedrafts[idx]
                      const activeRedline = redraftData ? redraftData.redraft : (flag.protective_redline || flag.recommendation)
                      const isCustomizing = customizingIndex === idx

                      return (
                        <Card 
                          key={idx} 
                          className="bg-white dark:bg-card border border-neutral-200 dark:border-border/80 shadow-md rounded-2xl overflow-hidden transition-all"
                        >
                          <div className="bg-neutral-50/80 dark:bg-muted/40 p-4 border-b border-neutral-200 dark:border-border/60 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-xs font-bold bg-neutral-200 text-black px-2.5 py-0.5 rounded-lg border border-neutral-300">
                                Clause #{idx + 1}
                              </span>
                              <span className="font-semibold text-xs text-black font-serif">
                                {formatCleanPlainText(flag.statutory_concept || "Contractual Risk")}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {flag.severity && (
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                                  flag.severity === "High" 
                                    ? "bg-red-200 text-black border border-red-300" 
                                    : flag.severity === "Medium"
                                    ? "bg-amber-200 text-black border border-amber-300"
                                    : "bg-blue-200 text-black border border-blue-300"
                                }`}>
                                  {flag.severity} Severity
                                </span>
                              )}
                            </div>
                          </div>

                          <CardContent className="p-5 space-y-4 text-xs font-sans">
                            {/* Original Problematic Clause */}
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Original Problematic Provision:</span>
                              </div>
                              <blockquote className="border-l-3 border-destructive/60 pl-3.5 pr-3 py-2.5 text-black italic bg-destructive/5 rounded-r-xl leading-relaxed text-xs">
                                "{formatCleanPlainText(flag.clause)}"
                              </blockquote>
                            </div>

                            {/* Why it's a concern */}
                            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-muted/30 border border-neutral-200/70 dark:border-border/60 space-y-1">
                              <p className="text-black text-xs leading-relaxed">
                                <strong className="text-destructive font-bold">Risk Assessment: </strong>
                                {formatCleanPlainText(flag.issue)}
                              </p>
                              {flag.recommendation && (
                                <p className="text-black text-[11px] mt-1">
                                  <strong>Negotiation Strategy: </strong> {formatCleanPlainText(flag.recommendation)}
                                </p>
                              )}
                            </div>

                            {/* Protective Redline Draft Box */}
                            {activeRedline && (
                              <div className="p-4 rounded-xl bg-neutral-100 text-black border border-neutral-300 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-black font-bold text-xs uppercase tracking-wider">
                                    <Sparkles className="w-3.5 h-3.5 text-black" />
                                    <span>AI Balanced Protective Redline Draft:</span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        copyText(activeRedline, () => {
                                          setCopiedRedlineIdx(idx)
                                          setTimeout(() => setCopiedRedlineIdx(null), 2000)
                                        })
                                      }}
                                      className="h-7 px-2.5 text-[11px] gap-1 bg-white border-neutral-300 text-black hover:bg-neutral-50"
                                    >
                                      {copiedRedlineIdx === idx ? (
                                        <>
                                          <Check className="w-3 h-3 text-green-600" />
                                          <span className="text-black font-bold">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 text-black" />
                                          <span className="text-black font-bold">Copy Redline</span>
                                        </>
                                      )}
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setCustomizingIndex(isCustomizing ? null : idx)
                                        setCustomInstruction("")
                                      }}
                                      className="h-7 px-2 text-[11px] gap-1 text-secondary hover:bg-slate-800"
                                      title="Refine this clause with custom instructions"
                                    >
                                      <Sliders className="w-3 h-3 text-secondary" />
                                      <span>{isCustomizing ? "Close" : "Customise"}</span>
                                    </Button>
                                  </div>
                                </div>

                                <blockquote className="border-l-3 border-secondary pl-3.5 pr-3 py-2.5 text-neutral-900 font-medium bg-white rounded-r-xl leading-relaxed text-xs sm:text-sm shadow-xs select-text">
                                  "{formatCleanPlainText(activeRedline)}"
                                </blockquote>

                                {(flag.redline_rationale || redraftData) && (
                                  <div className="text-slate-300 text-[11px] leading-relaxed bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60 flex items-start gap-1.5">
                                    <span className="text-secondary font-bold flex-shrink-0">Why this protects you:</span>
                                    <span>{formatCleanPlainText(redraftData ? redraftData.explanation : flag.redline_rationale || "")}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Inline Custom Redraft Refiner Box */}
                            {isCustomizing && (
                              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between text-xs font-bold text-primary">
                                  <span className="flex items-center gap-1.5">
                                    <Sliders className="w-3.5 h-3.5 text-secondary" />
                                    Custom AI Clause Drafter
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setCustomizingIndex(null)}
                                    className="text-muted-foreground hover:text-foreground text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCustomStance("balanced")}
                                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                                      customStance === "balanced" 
                                        ? "bg-neutral-200 text-black border-black/40 shadow-xs" 
                                        : "bg-white dark:bg-card border-neutral-200 dark:border-border text-neutral-800"
                                    }`}
                                  >
                                    ⚖️ Balanced Standard
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCustomStance("pro_user")}
                                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                                      customStance === "pro_user" 
                                        ? "bg-neutral-200 text-black border-black/40 shadow-xs" 
                                        : "bg-white dark:bg-card border-neutral-200 dark:border-border text-neutral-800"
                                    }`}
                                  >
                                    🛡️ Maximum Client Protection
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCustomStance("conservative")}
                                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                                      customStance === "conservative" 
                                        ? "bg-neutral-200 text-black border-black/40 shadow-xs" 
                                        : "bg-white dark:bg-card border-neutral-200 dark:border-border text-neutral-800"
                                    }`}
                                  >
                                    🤝 Friendly Compromise
                                  </button>
                                </div>

                                <Input
                                  value={customInstruction}
                                  onChange={(e) => setCustomInstruction(e.target.value)}
                                  placeholder="e.g. Set notice period to 45 days, cap liability at ₹50,000, make arbitration seat Mumbai..."
                                  className="text-xs bg-white text-black"
                                />

                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleCustomRedraft(idx, flag)}
                                    disabled={redraftLoading}
                                    className="gap-1.5 text-xs bg-amber-400 hover:bg-amber-500 text-black font-bold border border-amber-500/30"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-black" />
                                    <span className="text-black">{redraftLoading ? "Generating Redraft..." : "Generate Custom Clause"}</span>
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Right Col: Commercial Terms & Governing Statutes */}
              <div className="space-y-6">
                
                {/* Key Terms */}
                <Card className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 shadow-md rounded-2xl overflow-hidden">
                  <CardHeader className="bg-neutral-50/70 dark:bg-muted/30 border-b border-neutral-100 dark:border-border/60 pb-3">
                    <CardTitle className="text-base font-serif flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-secondary" />
                      Key Commercial Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <dl className="space-y-3 text-xs">
                      {Object.entries(result.key_terms || {}).map(([key, val]) => (
                        <div key={key} className="border-b border-neutral-100 dark:border-border/40 pb-2.5 last:border-0">
                          <dt className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold mb-0.5">{key}</dt>
                          <dd className="font-semibold text-foreground text-xs">{formatCleanPlainText(String(val))}</dd>
                        </div>
                      ))}
                      {Object.keys(result.key_terms || {}).length === 0 && (
                        <p className="text-muted-foreground italic text-xs">No key terms extracted.</p>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                {/* Governing Statutes */}
                {result.governing_laws && result.governing_laws.length > 0 && (
                  <Card className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 shadow-md rounded-2xl overflow-hidden">
                    <CardHeader className="bg-neutral-50/70 dark:bg-muted/30 border-b border-neutral-100 dark:border-border/60 pb-3">
                      <CardTitle className="flex items-center gap-2 text-base font-serif">
                        <Scale className="w-4 h-4 text-secondary" />
                        Applicable Indian Statutes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {result.governing_laws.map((law, idx) => (
                          <span 
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium"
                          >
                            {formatCleanPlainText(law)}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground pt-2 border-t border-neutral-100 dark:border-border/40">
                        Provisions cross-referenced with Indian jurisprudence and standard contractual principles.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Action Navigation Card */}
                <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10 border border-primary/20 shadow-sm rounded-2xl p-5 space-y-3">
                  <h4 className="font-serif font-bold text-sm text-primary">Need Next Steps?</h4>
                  <p className="text-xs text-muted-foreground">
                    You can directly draft a response to this notice or generate a polite email to renegotiate the terms.
                  </p>
                  <div className="space-y-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("reply_notice")}
                      className="w-full text-xs gap-1.5 bg-primary text-white"
                    >
                      <Scale className="w-3.5 h-3.5 text-secondary" />
                      <span>Draft Legal Reply Notice</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("negotiate")}
                      className="w-full text-xs gap-1.5 bg-white dark:bg-card"
                    >
                      <Mail className="w-3.5 h-3.5 text-secondary" />
                      <span>Draft Negotiation Email</span>
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: LEGAL NOTICE REPLY ASSISTANT */}
          {activeTab === "reply_notice" && (
            <div className="space-y-6">
              <Card className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="bg-neutral-50/70 dark:bg-muted/30 border-b border-neutral-100 dark:border-border/60 pb-3">
                  <CardTitle className="font-serif text-lg flex items-center gap-2 text-primary">
                    <Scale className="w-5 h-5 text-secondary" />
                    AI Legal Reply Notice & Defense Drafter
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Draft a formal, court-ready response to a legal notice, demand letter, or alleged contractual breach under Indian legal standards.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Your Name / Client Name</label>
                      <Input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Opposite Party / Sender</label>
                      <Input
                        value={oppositeParty}
                        onChange={(e) => setOppositeParty(e.target.value)}
                        placeholder="e.g. XYZ Enterprises Pvt Ltd"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Advocate / Firm Name</label>
                      <Input
                        value={advocateName}
                        onChange={(e) => setAdvocateName(e.target.value)}
                        placeholder="e.g. Adv. Vivek Mehra, High Court"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Defense Strategy & Stance</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDefenseStance("Complete Denial of Allegations & Frivolous Demand")}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                          defenseStance === "Complete Denial of Allegations & Frivolous Demand"
                            ? "bg-neutral-200 text-black border-black/40 shadow-xs"
                            : "bg-white dark:bg-card border-neutral-200 dark:border-border text-neutral-800"
                        }`}
                      >
                        <div className="font-bold text-black">❌ Full Categorical Denial</div>
                        <div className="text-[11px] text-neutral-700">Refute claims as baseless and motivated.</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDefenseStance("Denial of Liability + Counter-Claim for Damages")}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                          defenseStance === "Denial of Liability + Counter-Claim for Damages"
                            ? "bg-neutral-200 text-black border-black/40 shadow-xs"
                            : "bg-white dark:bg-card border-neutral-200 dark:border-border text-neutral-800"
                        }`}
                      >
                        <div className="font-bold text-black">⚔️ Counter-Claim & Breach</div>
                        <div className="text-[11px] text-neutral-700">Opposite party committed the primary default.</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDefenseStance("Willingness to Settle Amicably upon Account Reconciliation")}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                          defenseStance === "Willingness to Settle Amicably upon Account Reconciliation"
                            ? "bg-neutral-200 text-black border-black/40 shadow-xs"
                            : "bg-white dark:bg-card border-neutral-200 dark:border-border text-neutral-800"
                        }`}
                      >
                        <div className="font-bold text-black">🤝 Amicable Settlement</div>
                        <div className="text-[11px] text-neutral-700">Reconcile accounts without admitting liability.</div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-black">
                      Key Facts / Defense Narrative to Highlight (Optional)
                    </label>
                    <Textarea
                      value={keyFacts}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setKeyFacts(e.target.value)}
                      placeholder="e.g. Services were duly rendered till Oct 2024; Opposite party delayed payments for 4 months; Security deposit was not returned despite keys handed over on 1st Nov..."
                      className="text-xs h-20 text-black bg-white"
                    />
                  </div>

                  {replyError && (
                    <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Generation Error</span>
                      </div>
                      <p>{replyError}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleGenerateReplyNotice}
                      disabled={replyLoading}
                      className="gap-2 bg-primary text-white hover:bg-primary/90 shadow-md text-xs sm:text-sm"
                    >
                      <Sparkles className="w-4 h-4 text-secondary" />
                      <span>{replyLoading ? "Drafting Formal Reply Notice..." : "Generate Legal Reply Notice"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Reply Notice Preview */}
              {replyNoticeResult && (
                <Card className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 shadow-md rounded-2xl overflow-hidden animate-in fade-in duration-300">
                  <CardHeader className="bg-neutral-50/70 dark:bg-muted/30 border-b border-neutral-100 dark:border-border/60 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="font-serif text-base text-primary">Formal Legal Reply Notice</CardTitle>
                      <CardDescription className="text-xs">Court-ready plain text format with statutory citations</CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          copyText(replyNoticeResult.reply_notice_markdown || "", () => {
                            setReplyCopied(true)
                            setTimeout(() => setReplyCopied(false), 2000)
                          })
                        }}
                        className="gap-1.5 text-xs"
                      >
                        {replyCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{replyCopied ? "Copied" : "Copy Plain Text"}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadAsFile("Legal_Reply_Notice.txt", replyNoticeResult.reply_notice_markdown || "")}
                        className="gap-1.5 text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download (.txt)</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Legal Notice Text Display */}
                    <div className="p-6 rounded-xl bg-white dark:bg-card border border-neutral-200 dark:border-border font-serif text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-foreground select-text shadow-sm">
                      {formatCleanPlainText(replyNoticeResult.reply_notice_markdown || "No notice content generated.")}
                    </div>

                    {/* Legal Grounds & Recommendations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                        <div className="font-bold text-primary flex items-center gap-1.5">
                          <Scale className="w-4 h-4 text-secondary" />
                          <span>Key Legal Grounds & Statutes Cited:</span>
                        </div>
                        <ul className="space-y-1.5 pl-1">
                          {[...(replyNoticeResult.legal_grounds || []), ...(replyNoticeResult.statutory_citations || [])].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-foreground/90 font-medium">
                              <span className="text-primary font-bold">▪</span>
                              <span>{formatCleanPlainText(item)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/25 space-y-2">
                        <div className="font-bold text-primary flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-secondary" />
                          <span>Recommended Service & Dispatch Steps:</span>
                        </div>
                        <ul className="space-y-1.5 pl-1">
                          {(replyNoticeResult.recommended_next_steps || []).map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-foreground/90 font-medium">
                              <span className="text-secondary font-bold">▪</span>
                              <span>{formatCleanPlainText(item)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB 3: COUNTERPARTY NEGOTIATION EMAIL DRAFTER */}
          {activeTab === "negotiate" && (
            <div className="space-y-6">
              <Card className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="bg-neutral-50/70 dark:bg-muted/30 border-b border-neutral-100 dark:border-border/60 pb-3">
                  <CardTitle className="font-serif text-lg flex items-center gap-2 text-primary">
                    <Mail className="w-5 h-5 text-secondary" />
                    Counterparty Renegotiation Email Drafter
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Generate a polite, professional, and firm corporate email proposing all identified redlines and contract amendments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Sender Name</label>
                      <Input
                        value={emailSenderName}
                        onChange={(e) => setEmailSenderName(e.target.value)}
                        placeholder="e.g. John Doe / Founder"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Recipient / Counterparty Name</label>
                      <Input
                        value={emailRecipientName}
                        onChange={(e) => setEmailRecipientName(e.target.value)}
                        placeholder="e.g. Landlord / HR Team / Vendor Legal"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Negotiation Tone</label>
                      <select
                        value={emailTone}
                        onChange={(e) => setEmailTone(e.target.value)}
                        className="w-full text-xs h-9 px-3 rounded-md border border-input bg-background text-foreground"
                      >
                        <option value="constructive_professional">🤝 Constructive & Professional</option>
                        <option value="firm_protective">🛡️ Firm & Legally Protective</option>
                        <option value="cordial_commercial">🏢 Cordial Commercial Partner</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-muted/30 border border-neutral-200/70 dark:border-border/60 text-xs">
                    <span className="font-bold text-primary">Attached Redlines: </span>
                    <span className="text-muted-foreground">
                      The AI will automatically format and include all {result.flagged_clauses?.length || 0} flagged clauses and balanced redlines as structured bullet points in the email.
                    </span>
                  </div>

                  {emailError && (
                    <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Generation Error</span>
                      </div>
                      <p>{emailError}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleGenerateRenegotiationEmail}
                      disabled={emailLoading}
                      className="gap-2 bg-primary text-white hover:bg-primary/90 shadow-md text-xs sm:text-sm"
                    >
                      <Sparkles className="w-4 h-4 text-secondary" />
                      <span>{emailLoading ? "Composing Email..." : "Generate Negotiation Email"}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {negotiationEmail && (
                <Card className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 shadow-md rounded-2xl overflow-hidden animate-in fade-in duration-300">
                  <CardHeader className="bg-neutral-50/70 dark:bg-muted/30 border-b border-neutral-100 dark:border-border/60 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="font-serif text-base text-primary">Generated Renegotiation Email</CardTitle>
                      <CardDescription className="text-xs">Ready to review and send to your counterparty</CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const fullEmail = `Subject: ${negotiationEmail.subject || ""}\n\n${negotiationEmail.email_body || ""}`
                          copyText(fullEmail, () => {
                            setEmailCopied(true)
                            setTimeout(() => setEmailCopied(false), 2000)
                          })
                        }}
                        className="gap-1.5 text-xs"
                      >
                        {emailCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{emailCopied ? "Copied" : "Copy Full Email"}</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-1 pb-3 border-b border-neutral-200/60 dark:border-border/60">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Subject Line:</div>
                      <div className="text-xs sm:text-sm font-semibold text-primary">{formatCleanPlainText(negotiationEmail.subject)}</div>
                    </div>

                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-muted/20 border border-neutral-200 dark:border-border/60 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground select-text shadow-inner">
                      {formatCleanPlainText(negotiationEmail.email_body)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
