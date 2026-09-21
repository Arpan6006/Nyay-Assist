import { useState, useRef, useEffect } from "react"
import { 
  Mic, 
  Square, 
  Sparkles, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  Scale, 
  Send,
  RefreshCw,
  Building2,
  ArrowRight,
  ShieldAlert
} from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

type VoiceFIRModalProps = {
  isOpen: boolean
  onClose: () => void
  onSendToChat?: (firSummaryText: string) => void
}

type FIRAnalysisResult = {
  title: string
  incident_type?: string
  complaint_meta: {
    to: string
    police_station: string
    district: string
    complainant_name: string
    complainant_contact: string
    complainant_address: string
    date_of_incident: string
    place_of_incident: string
    accused_details: string
  }
  applicable_sections: Array<{
    act: string
    section: string
    offense_name: string
    classification: string
    punishment: string
  }>
  chronological_statement: string
  stolen_or_damaged_property?: string[]
  evidence_and_witnesses?: string[]
  prayer: string
  citizen_rights_guidance?: string[]
  full_formal_draft: string
}

export function VoiceFIRModal({ isOpen, onClose, onSendToChat }: VoiceFIRModalProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [error, setError] = useState("")
  const [firResult, setFirResult] = useState<FIRAnalysisResult | null>(null)
  const [copied, setCopied] = useState(false)
  
  // Optional meta inputs
  const [complainantName, setComplainantName] = useState("")
  const [location, setLocation] = useState("")
  const [policeStation, setPoliceStation] = useState("")
  const [contactNumber, setContactNumber] = useState("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const recognitionRef = useRef<any>(null)

  // Clear states when closing
  useEffect(() => {
    if (!isOpen) {
      cancelOngoingProcess()
      setFirResult(null)
      setError("")
      setTranscript("")
      setRecordDuration(0)
    }
  }, [isOpen])

  // Setup Web Speech API fallback for live streaming speech-to-text
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-IN"

      recognition.onresult = (event: any) => {
        let liveTranscript = ""
        for (let i = 0; i < event.results.length; i++) {
          liveTranscript += event.results[i][0].transcript + " "
        }
        setTranscript(liveTranscript.trim())
      }

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition notice:", e)
      }

      recognitionRef.current = recognition
    }
  }, [])

  // Timer while recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const startRecording = async () => {
    setError("")
    setFirResult(null)
    setTranscript("")
    setRecordDuration(0)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop())
          mediaStreamRef.current = null
        }
        await processAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Start live Web Speech API recognition if available
      try {
        recognitionRef.current?.start()
      } catch (e) {
        // Recognition already running or unsupported
      }
    } catch (err: any) {
      console.error(err)
      setError("Microphone access was denied or not found. Please enable microphone permissions in your browser or type your incident description below.")
    }
  }

  const stopRecording = () => {
    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      try {
        recognitionRef.current?.stop()
      } catch (e) {
        // ignore
      }
    }
  }

  const cancelOngoingProcess = () => {
    // Abort network transcription request if active
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Stop and detach recorder handlers
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
      mediaRecorderRef.current = null
    }

    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Stop recognition
    try {
      recognitionRef.current?.stop()
    } catch (e) {
      // ignore
    }

    // Reset recording & transcription states
    setIsRecording(false)
    setIsTranscribing(false)
    setRecordDuration(0)
    setTranscript("")
    setError("")
    audioChunksRef.current = []
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const processAudio = async (blob: Blob) => {
    setIsTranscribing(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const formData = new FormData()
      formData.append("file", blob, "fir_voice.webm")

      const res = await fetch("/api/chat/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal
      })

      if (res.ok) {
        const data = await res.json()
        if (data.text && data.text.trim().length > 0) {
          setTranscript(data.text.trim())
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Backend Whisper transcription error, retaining live speech transcript:", err)
      }
    } finally {
      setIsTranscribing(false)
      abortControllerRef.current = null
    }
  }

  const handleGenerateFIR = async () => {
    if (!transcript.trim()) {
      setError("Please record your voice or type your incident narrative first.")
      return
    }

    setIsDrafting(true)
    setError("")

    try {
      const res = await fetch("/api/chat/draft-fir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_transcript: transcript,
          complainant_name: complainantName || "Complainant",
          complainant_contact: contactNumber || "",
          location: location || "",
          police_station: policeStation || ""
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || "Failed to generate FIR draft.")
      }

      const data: FIRAnalysisResult = await res.json()
      setFirResult(data)
    } catch (err: any) {
      setError(err.message || "Failed to draft FIR. Please try again.")
    } finally {
      setIsDrafting(false)
    }
  }

  const copyToClipboard = () => {
    if (!firResult) return
    navigator.clipboard.writeText(firResult.full_formal_draft || firResult.chronological_statement)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const printFIR = () => {
    if (!firResult) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Official Police Complaint - Section 173 BNSS 2023</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; color: #111; line-height: 1.6; }
            h2, h3 { text-align: center; margin-bottom: 5px; }
            .badge { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 25px; }
            .section { margin-top: 20px; }
            .meta-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
            .meta-table td, .meta-table th { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .narrative { text-align: justify; margin: 15px 0; white-space: pre-wrap; }
            .prayer { font-weight: bold; margin-top: 20px; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <h2>FORMAL POLICE COMPLAINT / FIRST INFORMATION REPORT</h2>
          <div class="badge">Drafted pursuant to Section 173 of Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)</div>
          <div class="narrative">${firResult.full_formal_draft}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleSendToActiveChat = () => {
    if (!firResult || !onSendToChat) return
    const summaryText = `[Voice FIR Assistant Draft]\n\nComplaint Title: ${firResult.title}\nPrimary Offense: ${firResult.incident_type || "Criminal Offense"}\nApplicable Sections: ${firResult.applicable_sections?.map(s => `${s.section} (${s.offense_name})`).join(", ")}\n\nIncident Narrative:\n${firResult.chronological_statement}\n\nPlease advise me on next legal steps, bail implications for the accused, and how to file this at the nearest police station.`
    onSendToChat(summaryText)
    onClose()
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-card border border-neutral-200 dark:border-border/80 w-full max-w-4xl rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-neutral-50/80 dark:bg-muted/40 border-b border-neutral-200/80 dark:border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-serif font-bold text-primary">
                  Voice-Assisted FIR & Complaint Drafter
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                  BNSS Sec. 173
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Speak your incident in plain language. AI structures it into an official police complaint with BNS (2023) penal citations.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-200/60 dark:hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!firResult ? (
            <div className="space-y-6">
              
              {/* Voice Recording Control Box */}
              <div className="relative bg-neutral-50/60 dark:bg-muted/20 border-2 border-dashed border-neutral-200 dark:border-border/60 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4">
                
                {/* Visual Mic Button */}
                <div className="relative">
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                  )}
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 text-black ${
                      isRecording 
                        ? "bg-red-400 text-black hover:bg-red-500" 
                        : "bg-amber-400 text-black hover:bg-amber-500 hover:scale-105"
                    }`}
                  >
                    {isRecording ? <Square className="w-8 h-8 text-black" /> : <Mic className="w-9 h-9 text-black" />}
                  </button>
                </div>

                {/* Status & Timer */}
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-primary flex items-center justify-center gap-2">
                    {isRecording ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                        <span>Recording voice narrative ({formatTimer(recordDuration)})... Click to Stop</span>
                      </>
                    ) : isTranscribing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-secondary" />
                        <span>Transcribing audio with Whisper AI...</span>
                      </>
                    ) : (
                      <span>Click the microphone to start speaking your complaint</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Speak clearly about what happened, location, time, accused details, and what was taken or damaged.
                  </p>
                </div>

                {/* Cancel Ongoing Process Button in Bottom Right of Voice Section */}
                {(isRecording || isTranscribing || recordDuration > 0 || transcript.length > 0) && (
                  <div className="w-full flex justify-end pt-2 sm:pt-0 sm:absolute sm:bottom-3 sm:right-3 sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cancelOngoingProcess}
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 shadow-xs flex items-center gap-1.5 transition-all font-medium h-8 px-2.5 rounded-lg"
                      title="Cancel ongoing transcription and reset"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Editable Transcript Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-secondary" />
                    <span>Incident Narrative / Transcript</span>
                  </Label>
                  {transcript && (
                    <button 
                      type="button" 
                      onClick={() => setTranscript("")}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Your speech transcript will appear here automatically. You can also type or edit details directly (e.g. On 15th Sept around 8 PM near Rajiv Chowk Metro, two men on a black bike snatched my gold chain and iPhone...)"
                  rows={4}
                  className="flex w-full rounded-xl border border-neutral-200 dark:border-border/80 bg-white dark:bg-card p-3.5 text-xs sm:text-sm font-sans placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-xs"
                />
              </div>

              {/* Optional Case Meta Fields */}
              <div className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/60 rounded-xl p-4 space-y-3 shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Optional Details for Official Police Header
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Complainant Name</Label>
                    <Input 
                      value={complainantName} 
                      onChange={e => setComplainantName(e.target.value)} 
                      placeholder="e.g. Ramesh Kumar" 
                      className="h-8 text-xs font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Incident Location</Label>
                    <Input 
                      value={location} 
                      onChange={e => setLocation(e.target.value)} 
                      placeholder="e.g. Indirapuram, Ghaziabad" 
                      className="h-8 text-xs font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Nearest Police Station</Label>
                    <Input 
                      value={policeStation} 
                      onChange={e => setPoliceStation(e.target.value)} 
                      placeholder="e.g. PS Indirapuram" 
                      className="h-8 text-xs font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Contact Number</Label>
                    <Input 
                      value={contactNumber} 
                      onChange={e => setContactNumber(e.target.value)} 
                      placeholder="e.g. +91 9876543210" 
                      className="h-8 text-xs font-sans"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Button */}
              <Button
                type="button"
                onClick={handleGenerateFIR}
                disabled={isDrafting || !transcript.trim()}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium shadow-md flex items-center justify-center gap-2 text-sm"
              >
                <Sparkles className="w-4 h-4 text-secondary" />
                <span className="text-white">{isDrafting ? "Analyzing Incident & Structuring FIR (Section 173 BNSS)..." : "Generate Official Police Complaint & FIR"}</span>
              </Button>
            </div>
          ) : (
            /* FIR Generated Report View */
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Report Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-50/80 dark:bg-muted/30 border border-neutral-200/80 dark:border-border/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-bold text-black font-serif">
                    {firResult.title || "Official Police Complaint Draft"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 text-xs gap-1.5 text-black">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                    <span className="text-black">Copy Complaint</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={printFIR} className="h-8 text-xs gap-1.5 text-black">
                    <Printer className="w-3.5 h-3.5 text-black" />
                    <span className="text-black">Print / Save PDF</span>
                  </Button>
                  {onSendToChat && (
                    <Button size="sm" onClick={handleSendToActiveChat} className="h-8 text-xs gap-1.5 bg-amber-400 hover:bg-amber-500 text-black font-bold border border-amber-500/30">
                      <Send className="w-3.5 h-3.5 text-black" />
                      <span className="text-black">Ask Follow-up in Chat</span>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setFirResult(null)} className="h-8 text-xs">
                    Draft Another
                  </Button>
                </div>
              </div>

              {/* Grid: Applicable Sections & Key Offenses */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Meta details */}
                <div className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/60 rounded-xl p-4 space-y-2.5 text-xs shadow-xs">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-secondary" />
                    Jurisdiction & Parties
                  </span>
                  <div className="space-y-1.5 text-foreground">
                    <p><strong>Police Station:</strong> {firResult.complaint_meta?.police_station || "Jurisdictional Station"}</p>
                    <p><strong>District:</strong> {firResult.complaint_meta?.district || "Concerned District"}</p>
                    <p><strong>Complainant:</strong> {firResult.complaint_meta?.complainant_name || "Complainant"}</p>
                    <p><strong>Accused:</strong> {firResult.complaint_meta?.accused_details || "Unknown"}</p>
                  </div>
                </div>

                {/* Applicable BNS Sections */}
                <div className="md:col-span-2 bg-white dark:bg-card border border-neutral-200/80 dark:border-border/60 rounded-xl p-4 space-y-2.5 text-xs shadow-xs">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-secondary" />
                    Applicable Penal Provisions (Bharatiya Nyaya Sanhita, 2023)
                  </span>
                  <div className="space-y-2">
                    {firResult.applicable_sections?.map((sec, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-neutral-50 dark:bg-muted/30 border border-neutral-200/60 dark:border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">{sec.section}:</span>
                            <span className="font-medium text-foreground">{sec.offense_name}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Punishment: {sec.punishment}
                          </p>
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 flex-shrink-0 self-start sm:self-center">
                          {sec.classification}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Citizen Statutory Rights under BNSS 173 Box */}
              {firResult.citizen_rights_guidance && firResult.citizen_rights_guidance.length > 0 && (
                <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/25 space-y-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-secondary" />
                    <span>Your Legal Rights under Bharatiya Nagarik Suraksha Sanhita (BNSS 2023)</span>
                  </span>
                  <ul className="space-y-1 text-xs text-primary/90 font-sans">
                    {firResult.citizen_rights_guidance.map((right, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-secondary flex-shrink-0 mt-0.5" />
                        <span>{right}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full Formal Document Preview */}
              <div className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200/70 pb-3">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-secondary" />
                    <span>Formal Police Complaint Document</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground italic">Ready for Print / Submission</span>
                </div>

                <div className="bg-neutral-50/70 dark:bg-muted/20 border border-neutral-200/50 p-5 rounded-xl font-serif text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-foreground select-all">
                  {firResult.full_formal_draft}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
