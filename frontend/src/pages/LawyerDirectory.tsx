import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import {
  Search,
  MapPin,
  Briefcase,
  Star,
  BadgeCheck,
  Phone,
  Sparkles,
  FileText,
  Download,
  Mail,
  Copy,
  Check,
  Scale,
  AlertCircle,
  X
} from "lucide-react"
import { fetchApi } from "../lib/api"

type Lawyer = {
  lawyer_id: string
  name: string
  specialization: string
  location: string
  contact: string
  experience_years: number
  graduation_college?: string
  graduation_year?: number
  achievements?: string
  court_level?: string
  bio?: string
  bar_council_id?: string
  is_verified: boolean
}

type ChronologyItem = {
  date: string
  event: string
}

type CaseBrief = {
  case_title: string
  executive_summary: string
  chronology: ChronologyItem[]
  applicable_statutes: string[]
  legal_remedies: string[]
  document_checklist: string[]
  questions_for_advocate: string[]
  practice_area: string
  jurisdiction: string
  urgency_level: string
  date: string
  lawyer_name: string
  client_name: string
}

const SAMPLE_CASE_SCENARIOS = [
  {
    title: "Tenancy & Deposit Dispute",
    tag: "Property & Rent",
    client_name: "Rahul S. Verma",
    description: "My landlord in Koramangala, Bengaluru is refusing to refund my security deposit of Rs. 1,50,000 despite peaceful handover of the vacant flat on 1st September 2026. He is not answering calls and sent threatening WhatsApp messages citing fabricated repainting damages without bills.",
    urgency: "Standard",
    incident_date: "2026-09-01",
    opposing_party: "Landlord (Vikram Malhotra)"
  },
  {
    title: "Section 138 Cheque Bounce",
    tag: "Banking & Negotiable Instruments",
    client_name: "Aegis Tech Solutions LLP",
    description: "A commercial client issued an account payee cheque of Rs. 4,50,000 for delivered software consulting services. The cheque was dishonoured by HDFC Bank on 10th September 2026 with bank return memo stating 'Funds Insufficient'. The 30-day statutory notice window is running.",
    urgency: "Urgent",
    incident_date: "2026-09-10",
    opposing_party: "Apex Ventures Pvt. Ltd."
  },
  {
    title: "Cyber Financial Fraud & Unauthorized Debit",
    tag: "Cyber Law & BNSS 173",
    client_name: "Pooja Singhania",
    description: "Received a fraudulent SMS posing as electricity bill KYC verification with a malicious APK link. Within 10 minutes, unauthorized IMPS/UPI transfers totaling Rs. 85,000 were debited in 3 transactions to unknown beneficiary accounts.",
    urgency: "Emergency / Pre-Arrest",
    incident_date: "2026-09-18",
    opposing_party: "Cyber Perpetrators / Unknown"
  },
  {
    title: "Employment Salary Restraint & Non-Compete",
    tag: "Labour & Corporate",
    client_name: "Ananya Deshmukh",
    description: "My previous employer has withheld my final settlement (2 months salary + PF clearance) and served a legal threat claiming breach of a 2-year post-employment non-compete clause because I accepted a role at another IT firm.",
    urgency: "Standard",
    incident_date: "2026-09-15",
    opposing_party: "NexaBytes Software Pvt. Ltd."
  }
]

export default function LawyerDirectoryPage() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([])
  const [loading, setLoading] = useState(false)
  const [specialization, setSpecialization] = useState("")
  const [location, setLocation] = useState("")
  const [minExp, setMinExp] = useState("")
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null)

  // AI Pre-Consultation Brief State
  const [briefModalOpen, setBriefModalOpen] = useState(false)
  const [briefTargetLawyer, setBriefTargetLawyer] = useState<Lawyer | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefDownloading, setBriefDownloading] = useState(false)
  const [briefError, setBriefError] = useState("")
  const [generatedBrief, setGeneratedBrief] = useState<CaseBrief | null>(null)
  const [copiedBrief, setCopiedBrief] = useState(false)

  // Brief Form Fields
  const [briefForm, setBriefForm] = useState({
    client_name: "",
    case_description: "",
    urgency_level: "Standard",
    incident_date: "",
    opposing_party: ""
  })

  const searchLawyers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (specialization) params.append("specialization", specialization)
      if (location) params.append("location", location)
      if (minExp) params.append("min_experience", minExp)

      const data = await fetchApi(`/lawyers?${params.toString()}`)
      setLawyers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    searchLawyers()
  }, [])

  const clearFilters = async () => {
    setSpecialization("")
    setLocation("")
    setMinExp("")
    setLoading(true)
    try {
      const data = await fetchApi(`/lawyers`)
      setLawyers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openBriefModal = (lawyer?: Lawyer) => {
    setBriefTargetLawyer(lawyer || null)
    setGeneratedBrief(null)
    setBriefError("")
    // Start with clean, empty fields so placeholders are displayed
    setBriefForm({
      client_name: "",
      case_description: "",
      urgency_level: "Standard",
      incident_date: "",
      opposing_party: ""
    })
    setBriefModalOpen(true)
  }

  const applySampleScenario = (sample: typeof SAMPLE_CASE_SCENARIOS[0]) => {
    setBriefForm({
      client_name: sample.client_name,
      case_description: sample.description,
      urgency_level: sample.urgency,
      incident_date: sample.incident_date,
      opposing_party: sample.opposing_party
    })
  }

  const handleGenerateBrief = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!briefForm.case_description.trim()) {
      setBriefError("Please describe your legal issue or situation.")
      return
    }

    setBriefLoading(true)
    setBriefError("")

    try {
      const payload = {
        lawyer_id: briefTargetLawyer?.lawyer_id,
        lawyer_name: briefTargetLawyer?.name || "Selected Legal Counsel",
        lawyer_specialization: briefTargetLawyer?.specialization || "General Practice",
        client_name: briefForm.client_name || "Client",
        case_description: briefForm.case_description,
        urgency_level: briefForm.urgency_level,
        incident_date: briefForm.incident_date || undefined,
        opposing_party: briefForm.opposing_party || undefined
      }

      const res: CaseBrief = await fetchApi("/lawyers/generate-brief", {
        method: "POST",
        body: JSON.stringify(payload)
      })

      setGeneratedBrief(res)
    } catch (err: any) {
      setBriefError(err.message || "Failed to generate brief. Please try again.")
    } finally {
      setBriefLoading(false)
    }
  }

  const handleDownloadBriefPdf = async () => {
    if (!generatedBrief) return

    setBriefDownloading(true)
    try {
      const token = localStorage.getItem("token")
      const headers = new Headers({
        "Content-Type": "application/json"
      })
      if (token) headers.set("Authorization", `Bearer ${token}`)

      const response = await fetch("/api/lawyers/download-brief-pdf", {
        method: "POST",
        headers,
        body: JSON.stringify(generatedBrief)
      })

      if (!response.ok) {
        throw new Error("Failed to generate PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const safeTitle = generatedBrief.case_title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_")
      a.download = `${safeTitle}_Dossier.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert("Error downloading PDF: " + (err.message || "Unknown error"))
    } finally {
      setBriefDownloading(false)
    }
  }

  const handleCopyBrief = async () => {
    if (!generatedBrief) return
    const text = `CASE CONSULTATION DOSSIER: ${generatedBrief.case_title.toUpperCase()}
Client: ${generatedBrief.client_name}
Target Advocate: ${generatedBrief.lawyer_name} (${generatedBrief.practice_area})
Jurisdiction: ${generatedBrief.jurisdiction}
Urgency: ${generatedBrief.urgency_level}

1. EXECUTIVE SUMMARY:
${generatedBrief.executive_summary}

2. CHRONOLOGY:
${generatedBrief.chronology.map(c => `• [${c.date}]: ${c.event}`).join("\n")}

3. APPLICABLE STATUTES:
${generatedBrief.applicable_statutes.map(s => `• ${s}`).join("\n")}

4. RECOMMENDED REMEDIES:
${generatedBrief.legal_remedies.map(r => `• ${r}`).join("\n")}

5. DOCUMENT CHECKLIST:
${generatedBrief.document_checklist.map(d => `[ ] ${d}`).join("\n")}

6. STRATEGIC QUESTIONS FOR ADVOCATE:
${generatedBrief.questions_for_advocate.map((q, i) => `Q${i + 1}. ${q}`).join("\n")}
`
    try {
      await navigator.clipboard.writeText(text)
      setCopiedBrief(true)
      setTimeout(() => setCopiedBrief(false), 2500)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEmailAdvocate = () => {
    if (!generatedBrief) return
    const recipient = briefTargetLawyer?.contact || ""
    const subject = encodeURIComponent(`Legal Consultation Brief: ${generatedBrief.case_title}`)
    const body = encodeURIComponent(`Respected Advocate ${generatedBrief.lawyer_name},

I would like to seek an initial legal consultation regarding the following matter. Below is my structured case brief prepared via NyayAssist AI:

CASE TITLE: ${generatedBrief.case_title}
CLIENT: ${generatedBrief.client_name}
URGENCY: ${generatedBrief.urgency_level}

EXECUTIVE SUMMARY:
${generatedBrief.executive_summary}

KEY STATUTES & ACTIONS SOUGHT:
${generatedBrief.applicable_statutes.join("; ")}

I have compiled the required supporting evidence as per our pre-consultation checklist and look forward to scheduling a meeting.

Sincerely,
${generatedBrief.client_name}
`)
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`
  }

  const specializations = [
    "Corporate Law", "Constitutional Law", "Criminal Law", "Cyber Law", "Divorce and Family Law",
    "Environmental Law", "Family Law", "Human Rights Law", "Immigration Law",
    "Intellectual Property Law", "Property Law", "Real Estate Law", "Tax Law"
  ]

  const locations = [
    "Ahmedabad, Gujarat", "Bangalore, Karnataka", "Chandigarh, Punjab", "Chennai, Tamil Nadu",
    "Gurgaon, Haryana", "Hyderabad, Telangana", "Kolkata, West Bengal", "Lucknow, Uttar Pradesh",
    "Mumbai, Maharashtra", "New Delhi, Delhi", "Pune, Maharashtra", "Surat, Gujarat"
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner with AI Brief Feature Highlight */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-md">
              <Briefcase className="h-6 w-6 text-secondary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary tracking-tight">
              Verified Advocate Directory
            </h1>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Connect with Bar Council verified advocates across High Courts and District Courts. Use our <strong>AI Pre-Consultation Brief Generator</strong> to compile your facts into a court-ready dossier before meeting your advocate.
          </p>
        </div>
        <Button
          onClick={() => openBriefModal()}
          className="h-10 px-5 text-sm font-semibold gap-2 bg-secondary/90 hover:bg-secondary text-primary-foreground shadow-md shrink-0 border border-secondary/40"
        >
          <Sparkles className="h-4 w-4" />
          Prepare AI Case Dossier
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <Card className="bg-card border-border/80 shadow-sm">
        <CardContent className="p-5">
          <form onSubmit={searchLawyers} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="spec" className="text-xs font-semibold">Specialization</Label>
              <select
                id="spec"
                value={specialization}
                onChange={e => setSpecialization(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Any Specialization</option>
                {specializations.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc" className="text-xs font-semibold">Location</Label>
              <select
                id="loc"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Any Location</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp" className="text-xs font-semibold">Min Experience (Yrs)</Label>
              <Input
                id="exp"
                type="number"
                placeholder="e.g. 5"
                value={minExp}
                onChange={e => setMinExp(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clearFilters} disabled={loading} className="w-1/3 h-9 text-xs">
                Clear
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="w-2/3 h-9 text-xs gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lawyers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lawyers.map(lawyer => (
          <Card
            key={lawyer.lawyer_id}
            className="flex flex-col cursor-pointer hover:border-primary/60 transition-all hover:shadow-lg border-border/80 relative overflow-hidden bg-card"
            onClick={() => setSelectedLawyer(lawyer)}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-secondary to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <CardTitle className="text-lg font-serif flex items-center gap-1.5">
                    {lawyer.name}
                    {lawyer.is_verified && <BadgeCheck className="h-4 w-4 text-green-600 shrink-0" aria-label="NyayAssist Verified" />}
                  </CardTitle>
                  <p className="text-xs text-primary font-medium mt-0.5">{lawyer.specialization}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20 shrink-0">
                  {lawyer.court_level || "Advocate"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2.5 text-xs text-muted-foreground pt-0">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{lawyer.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-secondary shrink-0" />
                <span>{lawyer.experience_years}+ Years Experience</span>
              </div>
              {lawyer.contact && (
                <div className="flex items-center gap-2">
                  {lawyer.contact.includes("@") ? (
                    <a
                      href={`mailto:${lawyer.contact}?subject=Legal%20Inquiry%20via%20NyayAssist`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-secondary hover:underline break-all transition-colors cursor-pointer"
                      title={`Send email to ${lawyer.contact}`}
                    >
                      <Mail className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span className="truncate">{lawyer.contact}</span>
                    </a>
                  ) : (
                    <a
                      href={`tel:${lawyer.contact}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-secondary hover:underline break-all transition-colors cursor-pointer"
                      title={`Call ${lawyer.contact}`}
                    >
                      <Phone className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span>{lawyer.contact}</span>
                    </a>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-3 pb-3 border-t bg-muted/30 flex items-center justify-between gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 bg-primary text-white hover:bg-primary/90 shadow-sm cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  openBriefModal(lawyer)
                }}
                title="Prepare a structured AI case dossier for this advocate"
              >
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                <span>Prepare AI Brief</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-primary font-semibold hover:bg-primary/10 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedLawyer(lawyer)
                }}
              >
                View Profile &rarr;
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!loading && lawyers.length === 0 && (
        <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border/80">
          <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-base font-medium text-foreground">No lawyers found matching your criteria</p>
          <p className="text-xs text-muted-foreground mt-1">Try clearing some filter criteria to browse all advocates.</p>
        </div>
      )}

      {/* Lawyer Detail Modal */}
      {selectedLawyer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedLawyer(null)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl max-h-[85vh] flex flex-col relative border border-border/80"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-muted/30 p-6 border-b border-border/60 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
                    {selectedLawyer.name}
                    {selectedLawyer.is_verified && <BadgeCheck className="h-6 w-6 text-green-600" aria-label="NyayAssist Verified" />}
                  </h2>
                </div>
                <p className="text-sm text-secondary font-medium mt-1">{selectedLawyer.specialization}</p>
                {selectedLawyer.bar_council_id && (
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono bg-card inline-block px-2 py-0.5 rounded border border-border">
                    Bar Council ID: {selectedLawyer.bar_council_id}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedLawyer(null)}
                className="text-muted-foreground hover:text-foreground text-xl p-1 rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sidebar Info */}
                <div className="space-y-4 md:col-span-1 border-r border-border/60 pr-4">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location</h3>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      {selectedLawyer.location}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Experience</h3>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Star className="h-4 w-4 text-secondary shrink-0" />
                      {selectedLawyer.experience_years}+ Years of Practice
                    </div>
                  </div>
                  {selectedLawyer.court_level && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Court Level</h3>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Briefcase className="h-4 w-4 text-primary shrink-0" />
                        {selectedLawyer.court_level}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Direct Contact</h3>
                    {selectedLawyer.contact ? (
                      selectedLawyer.contact.includes("@") ? (
                        <a
                          href={`mailto:${selectedLawyer.contact}?subject=Legal%20Inquiry%20via%20NyayAssist`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-xs text-primary font-medium hover:text-secondary hover:underline break-all transition-colors cursor-pointer group"
                          title={`Send email to ${selectedLawyer.contact}`}
                        >
                          <Mail className="h-4 w-4 shrink-0 text-secondary group-hover:scale-110 transition-transform" />
                          <span className="underline underline-offset-2">{selectedLawyer.contact}</span>
                        </a>
                      ) : (
                        <a
                          href={`tel:${selectedLawyer.contact}`}
                          className="flex items-center gap-2 text-xs text-primary font-medium hover:text-secondary hover:underline break-all transition-colors cursor-pointer group"
                          title={`Call ${selectedLawyer.contact}`}
                        >
                          <Phone className="h-4 w-4 shrink-0 text-secondary group-hover:scale-110 transition-transform" />
                          <span className="underline underline-offset-2">{selectedLawyer.contact}</span>
                        </a>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">Not provided</span>
                    )}
                  </div>
                </div>

                {/* Main Body */}
                <div className="md:col-span-2 space-y-5">
                  <div>
                    <h3 className="text-lg font-serif font-semibold text-primary mb-2">Professional Biography</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {selectedLawyer.bio || `${selectedLawyer.name} is a dedicated legal professional with ${selectedLawyer.experience_years} years of practice in ${selectedLawyer.specialization}, actively representing clients across ${selectedLawyer.location}.`}
                    </p>
                  </div>

                  {(selectedLawyer.graduation_college || selectedLawyer.achievements) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/60">
                      {selectedLawyer.graduation_college && (
                        <div>
                          <h4 className="text-xs font-semibold text-primary mb-1">Education & Qualifications</h4>
                          <p className="text-xs text-muted-foreground">
                            {selectedLawyer.graduation_college}
                            {selectedLawyer.graduation_year && ` (Class of ${selectedLawyer.graduation_year})`}
                          </p>
                        </div>
                      )}
                      {selectedLawyer.achievements && (
                        <div>
                          <h4 className="text-xs font-semibold text-primary mb-1">Notable Standing</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <BadgeCheck className="h-3.5 w-3.5 text-secondary shrink-0" />
                            {selectedLawyer.achievements}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Pre-Consultation Card inside Modal */}
                  <div className="p-4 bg-secondary/10 border border-secondary/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-secondary" />
                        <span className="text-xs font-bold text-foreground">AI Pre-Consultation Dossier</span>
                      </div>
                      <span className="text-[10px] bg-secondary/20 px-2 py-0.5 rounded font-bold text-secondary">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Generate a structured case dossier, evidence checklist, and strategic questions specifically tailored for your consultation with <strong>{selectedLawyer.name}</strong>.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedLawyer(null)
                        openBriefModal(selectedLawyer)
                      }}
                      className="w-full text-xs font-semibold gap-2 mt-2 bg-primary text-white hover:bg-primary/90 shadow-md"
                    >
                      <FileText className="h-3.5 w-3.5 text-white" />
                      <span className="text-white">Prepare Case Brief for {selectedLawyer.name.split(" ")[0]}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI PRE-CONSULTATION CASE BRIEF GENERATOR MODAL */}
      {briefModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setBriefModalOpen(false)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col relative border border-border/80 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 p-6 border-b border-border/60 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary text-primary-foreground rounded-lg shadow-sm">
                    <Sparkles className="h-4 w-4 text-secondary" />
                  </div>
                  <h2 className="text-xl font-serif font-bold text-primary">
                    AI Pre-Consultation Case Brief & Strategy Dossier
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  {briefTargetLawyer
                    ? `Preparing tailored consultation dossier for Advocate ${briefTargetLawyer.name} (${briefTargetLawyer.specialization})`
                    : "Generate an advocate-ready legal dossier, evidence checklist, and strategic questions."}
                </p>
              </div>
              <button
                onClick={() => setBriefModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {!generatedBrief ? (
                /* STEP 1: INPUT FORM & QUICK SAMPLES */
                <div className="space-y-5">
                  {/* Quick Sample Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-secondary" />
                        Quick Fill Sample Scenario (Optional):
                      </Label>
                      {(briefForm.case_description || briefForm.client_name) && (
                        <button
                          type="button"
                          onClick={() => setBriefForm({
                            client_name: "",
                            case_description: "",
                            urgency_level: "Standard",
                            incident_date: "",
                            opposing_party: ""
                          })}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline"
                        >
                          Clear Form
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {SAMPLE_CASE_SCENARIOS.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applySampleScenario(sample)}
                          className="text-left p-3 rounded-xl border border-border/70 bg-card hover:border-primary/60 hover:bg-primary/5 transition-all space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">{sample.title}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary/15 text-secondary font-medium">
                              {sample.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {sample.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleGenerateBrief} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Your Full Name</Label>
                        <Input
                          value={briefForm.client_name}
                          onChange={(e) => setBriefForm({ ...briefForm, client_name: e.target.value })}
                          placeholder="Enter your full name (e.g. Rahul Sharma)"
                          required
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Opposing Party (Optional)</Label>
                        <Input
                          value={briefForm.opposing_party}
                          onChange={(e) => setBriefForm({ ...briefForm, opposing_party: e.target.value })}
                          placeholder="Opposing party / organization name"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Urgency Level</Label>
                        <select
                          value={briefForm.urgency_level}
                          onChange={(e) => setBriefForm({ ...briefForm, urgency_level: e.target.value })}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="Standard">Standard Consultation</option>
                          <option value="Urgent">Urgent (Notice Expiry / Cheque Bounce)</option>
                          <option value="Emergency / Pre-Arrest">Emergency / Pre-Arrest Apprehension</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Describe Your Legal Issue / Factual Situation <span className="text-red-500">*</span>
                      </Label>
                      <textarea
                        rows={5}
                        value={briefForm.case_description}
                        onChange={(e) => setBriefForm({ ...briefForm, case_description: e.target.value })}
                        placeholder="Describe what happened, key dates, monetary transactions involved, notices received, and what legal outcome or relief you are seeking..."
                        required
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>

                    {briefError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-xs text-red-600 font-medium">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{briefError}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={briefLoading}
                      className="w-full h-10 text-xs font-semibold gap-2 bg-primary text-white hover:bg-primary/90 shadow-md"
                    >
                      {briefLoading ? (
                        <>
                          <Sparkles className="h-4 w-4 animate-spin text-secondary" />
                          <span className="text-white">Analyzing against Indian Law & Generating Dossier...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-secondary" />
                          <span className="text-white">Generate Pre-Consultation Dossier</span>
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
                /* STEP 2: RENDERED CASE BRIEF & EXPORT ACTIONS */
                <div className="space-y-6">
                  {/* Action Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-muted/40 rounded-xl border border-border/70">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setGeneratedBrief(null)}
                        className="h-8 text-xs"
                      >
                        &larr; Edit Details
                      </Button>
                      <span className="text-xs font-semibold text-primary">
                        Dossier Ready
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyBrief}
                        className="h-8 text-xs gap-1"
                      >
                        {copiedBrief ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedBrief ? "Copied" : "Copy"}</span>
                      </Button>

                      {briefTargetLawyer && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleEmailAdvocate}
                          className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Email to Advocate</span>
                        </Button>
                      )}

                      <Button
                        type="button"
                        onClick={handleDownloadBriefPdf}
                        disabled={briefDownloading}
                        size="sm"
                        className="h-8 px-3 text-xs font-semibold gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm"
                      >
                        <Download className="h-3.5 w-3.5 text-white" />
                        <span className="text-white">{briefDownloading ? "Generating..." : "Download PDF Dossier"}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Rendered Dossier Card */}
                  <div className="bg-white text-slate-900 border border-border/80 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
                    {/* Header Stamp */}
                    <div className="border-b-2 border-primary/40 pb-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-primary font-sans text-xs uppercase tracking-widest font-bold">
                          <Scale className="h-4 w-4 text-secondary" />
                          <span>NyayAssist Legal Strategy Brief</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            generatedBrief.urgency_level === "Standard"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {generatedBrief.urgency_level}
                        </span>
                      </div>
                      <h3 className="text-xl font-serif font-bold text-slate-900 mt-2">
                        {generatedBrief.case_title}
                      </h3>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Client Name</span>
                        <span className="font-semibold text-slate-800">{generatedBrief.client_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Target Advocate</span>
                        <span className="font-semibold text-slate-800">{generatedBrief.lawyer_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Practice Area</span>
                        <span className="font-semibold text-slate-800">{generatedBrief.practice_area}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Jurisdiction</span>
                        <span className="font-semibold text-slate-800">{generatedBrief.jurisdiction}</span>
                      </div>
                    </div>

                    {/* Section 1: Executive Summary */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1">
                        1. Executive Case Summary
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {generatedBrief.executive_summary}
                      </p>
                    </div>

                    {/* Section 2: Chronology of Events */}
                    {generatedBrief.chronology.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1">
                          2. Chronology of Events
                        </h4>
                        <div className="space-y-1.5">
                          {generatedBrief.chronology.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                              <span className="font-mono font-semibold text-slate-900 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {item.date}
                              </span>
                              <span className="leading-normal">{item.event}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 3: Statutory Mapping & Remedies */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1">
                          3. Applicable Statutes
                        </h4>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {generatedBrief.applicable_statutes.map((stat, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-secondary font-bold">•</span>
                              <span>{stat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1">
                          4. Recommended Remedies
                        </h4>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {generatedBrief.legal_remedies.map((rem, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-green-600 font-bold">•</span>
                              <span>{rem}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Section 4: Evidence Checklist */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1">
                        5. Evidence & Records to Bring to Consultation
                      </h4>
                      <div className="space-y-1.5">
                        {generatedBrief.document_checklist.map((doc, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                            <input type="checkbox" className="mt-0.5 rounded text-primary focus:ring-primary" defaultChecked />
                            <span className="leading-normal">{doc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 5: Strategic Questions */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b pb-1">
                        6. Strategic Questions to Ask the Advocate
                      </h4>
                      <div className="space-y-1.5">
                        {generatedBrief.questions_for_advocate.map((q, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                            <span className="font-bold text-primary shrink-0">Q{idx + 1}.</span>
                            <span className="leading-normal">{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
