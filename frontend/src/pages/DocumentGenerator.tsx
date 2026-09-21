import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Search,
  ArrowLeft,
  FileCode,
  Scale,
  Building2,
  Scroll,
  HelpCircle,
  FileCheck,
  RotateCcw,
  Landmark,
  MapPin,
  ExternalLink,
  ShieldAlert,
  AlertTriangle
} from "lucide-react"
import { fetchApi } from "../lib/api"

type DocumentType = {
  id: string
  name: string
  description?: string
  category?: string
  tag?: string
}

type FieldSchema = {
  id: string
  label: string
  type: string
  required: boolean
}

type DocumentSchema = {
  id: string
  name: string
  description: string
  fields: FieldSchema[]
}

type StampCalculation = {
  duty_amount: string
  duty_formula: string
  registration_fee: string
  registration_status: string
  act_citation: string
  portal: string
}

type AuditCheck = {
  status: "pass" | "warning" | "action_required"
  title: string
  message: string
  statute?: string
}

type ComplianceAuditResult = {
  overall_score: number
  status: string
  selected_state: string
  stamp_calculation: StampCalculation
  checks: AuditCheck[]
}

const TEMPLATE_METADATA: Record<string, { category: string; tag: string; stampTag: string; icon: any }> = {
  rental_agreement: {
    category: "Agreements & Real Estate",
    tag: "11-Month Lease",
    stampTag: "e-Stamp ₹100/₹500",
    icon: Building2
  },
  nda: {
    category: "Corporate & Business",
    tag: "Confidentiality",
    stampTag: "e-Stamp ₹100 / e-Sign",
    icon: ShieldCheck
  },
  general_affidavit: {
    category: "Court & Declarations",
    tag: "Sworn Oath",
    stampTag: "Notarization Required",
    icon: Scroll
  },
  fir_draft: {
    category: "Disputes & Police",
    tag: "BNSS Sec 173",
    stampTag: "Free of Cost",
    icon: AlertCircle
  },
  legal_notice: {
    category: "Disputes & Notice",
    tag: "Pre-Litigation",
    stampTag: "RPAD / Speed Post",
    icon: Scale
  },
  power_of_attorney: {
    category: "Property & Authorization",
    tag: "GPA / Special",
    stampTag: "Registration Optional/Mandatory",
    icon: FileCheck
  },
  will: {
    category: "Estate & Family",
    tag: "Testament",
    stampTag: "2 Witnesses Required",
    icon: FileText
  },
  employment_agreement: {
    category: "Corporate & HR",
    tag: "Staff Contract",
    stampTag: "Letterhead / e-Sign",
    icon: FileCode
  }
}

const SAMPLE_PRESETS: Record<string, Record<string, string>> = {
  rental_agreement: {
    landlord_name: "Vikram Malhotra",
    tenant_name: "Rahul S. Verma",
    property_address: "Flat No. 402, Sunshine Heights, Koramangala 4th Block, Bengaluru - 560034",
    rent_amount: "28500",
    security_deposit: "150000",
    duration_months: "11",
    start_date: "2026-10-01"
  },
  nda: {
    disclosing_party_name: "Aegis Cloud Innovations Pvt. Ltd.",
    receiving_party_name: "NexaBytes Software Solutions LLP",
    purpose: "Evaluating potential strategic collaboration and proprietary AI technology integration.",
    duration_years: "2",
    jurisdiction_state: "Karnataka",
    effective_date: "2026-09-25"
  },
  general_affidavit: {
    deponent_name: "Pooja Singhania",
    father_name: "Ramesh Chandra Singhania",
    age: "32",
    address: "House No. 12B, Civil Lines, Jaipur, Rajasthan - 302006",
    statement: "I hereby solemnly declare that I have not changed my legal surname and all my educational certificates bearing my maiden name belong to one and the same person, i.e., myself.",
    date: "2026-09-22"
  },
  fir_draft: {
    complainant_name: "Arun Kumar Sharma",
    police_station: "Cyber Crime Police Station, Cyberabad",
    city: "Hyderabad",
    incident_date: "2026-09-18",
    incident_details: "On 18th September 2026 at approximately 3:45 PM, I received a fraudulent call posing as bank KYC verification, subsequent to which unauthorized UPI transactions totaling Rs. 85,000 were debited from my savings account.",
    suspect_details: "Caller Mobile +91-9876543210, Beneficiary UPI VPA: fraudmerch@okhdfc"
  },
  legal_notice: {
    sender_name: "Rajeshwar Rao & Co.",
    recipient_name: "Apex Buildtech Ventures Pvt. Ltd.",
    recipient_address: "Plot 88, Sector 44, Gurugram, Haryana - 122003",
    subject: "Notice for Unreasonable Delay in Handover of Possession and Refund of Booking Amount",
    notice_body: "My client booked Unit No. C-904 in your project 'Apex Horizons' in March 2023 with guaranteed delivery by March 2025. Despite receiving 90% consideration, construction remains stalled without legitimate justification.",
    demand: "Immediately handover lawful physical possession with Occupancy Certificate (OC) or refund the entire paid amount of Rs. 45,00,000 along with 18% p.a. interest within 15 days.",
    deadline_days: "15",
    date: "2026-09-21"
  },
  power_of_attorney: {
    principal_name: "Smt. Shanti Devi",
    principal_address: "Flat 101, Palm Grove, Bandra West, Mumbai - 400050",
    agent_name: "Anand Kumar",
    agent_address: "A-44, Sea View Enclave, Worli, Mumbai - 400018",
    effective_date: "2026-10-01"
  },
  will: {
    testator_name: "Dr. K. S. Sundaram",
    testator_address: "No. 7, 2nd Main Road, Gandhi Nagar, Adyar, Chennai - 600020",
    executor_name: "Advocate S. Krishnamoorthy",
    beneficiary_details: "1. Residential House in Adyar, Chennai to my daughter Meenakshi Sundaram.\n2. Bank fixed deposits and securities to be divided equally between my children.",
    date: "2026-09-21"
  },
  employment_agreement: {
    employer_name: "NyayTech Legal Solutions Pvt. Ltd.",
    employee_name: "Ananya Deshmukh",
    job_title: "Senior Legal Data Analyst",
    salary: "95000",
    start_date: "2026-10-15",
    notice_period: "2"
  }
}

const DEFAULT_INDIAN_STATES = [
  "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "Uttar Pradesh",
  "Telangana", "Gujarat", "West Bengal", "Rajasthan", "Haryana", "Kerala", "Other States / Central"
]

export default function DocumentGeneratorPage() {
  const [types, setTypes] = useState<DocumentType[]>([])
  const [states, setStates] = useState<string[]>(DEFAULT_INDIAN_STATES)
  const [selectedState, setSelectedState] = useState<string>("Delhi")
  const [selectedSchema, setSelectedSchema] = useState<DocumentSchema | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  
  // Preview and Compliance Audit state
  const [previewText, setPreviewText] = useState("")
  const [auditResult, setAuditResult] = useState<ComplianceAuditResult | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [estimatedPages, setEstimatedPages] = useState(1)
  
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"preview" | "compliance">("preview")

  const previewContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchApi("/documents/types")
      .then((res) => setTypes(res.types || []))
      .catch((err) => console.error("Error fetching document types:", err))

    fetchApi("/documents/states")
      .then((res) => {
        if (res.states && res.states.length > 0) setStates(res.states)
      })
      .catch((err) => console.warn("Failed to load states:", err))
  }, [])

  const categories = useMemo(() => {
    const cats = new Set<string>(["All"])
    types.forEach((t) => {
      const meta = TEMPLATE_METADATA[t.id]
      if (meta?.category) cats.add(meta.category)
    })
    return Array.from(cats)
  }, [types])

  const filteredTypes = useMemo(() => {
    return types.filter((t) => {
      const meta = TEMPLATE_METADATA[t.id]
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (meta?.tag || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory =
        selectedCategory === "All" || meta?.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [types, searchQuery, selectedCategory])

  const fetchComplianceAudit = useCallback(async (typeId: string, state: string, data: Record<string, string>) => {
    setAuditLoading(true)
    try {
      const res = await fetchApi("/documents/compliance-audit", {
        method: "POST",
        body: JSON.stringify({
          type_id: typeId,
          state,
          data
        })
      })
      if (res.stamp_calculation) {
        setAuditResult(res)
      }
    } catch (err) {
      console.warn("Compliance audit failed", err)
    } finally {
      setAuditLoading(false)
    }
  }, [])

  const fetchLivePreview = useCallback(async (typeId: string, data: Record<string, string>) => {
    setPreviewLoading(true)
    try {
      const res = await fetchApi("/documents/preview", {
        method: "POST",
        body: JSON.stringify({
          type_id: typeId,
          data
        })
      })
      if (res.preview_text) setPreviewText(res.preview_text)
      if (res.word_count !== undefined) setWordCount(res.word_count)
      if (res.estimated_pages !== undefined) setEstimatedPages(res.estimated_pages)
    } catch (err) {
      console.warn("Live preview sync fallback", err)
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  const loadSchema = async (typeId: string) => {
    setLoading(true)
    setError("")
    try {
      const schema: DocumentSchema = await fetchApi(`/documents/types/${typeId}/schema`)
      setSelectedSchema(schema)
      
      // Initialize with default or empty
      const initialData: Record<string, string> = {}
      schema.fields.forEach((f) => {
        initialData[f.id] = ""
      })
      setFormData(initialData)

      // Fetch preview and compliance audit
      fetchLivePreview(typeId, initialData)
      fetchComplianceAudit(typeId, selectedState, initialData)
    } catch (err: any) {
      setError(err.message || "Failed to load schema")
    } finally {
      setLoading(false)
    }
  }

  // Update live preview & compliance when user edits form
  const handleInputChange = (field: string, value: string) => {
    const updated = { ...formData, [field]: value }
    setFormData(updated)
    if (selectedSchema) {
      fetchLivePreview(selectedSchema.id, updated)
      fetchComplianceAudit(selectedSchema.id, selectedState, updated)
    }
  }

  const handleStateChange = (newState: string) => {
    setSelectedState(newState)
    if (selectedSchema) {
      fetchComplianceAudit(selectedSchema.id, newState, formData)
    }
  }

  const handleApplySample = () => {
    if (!selectedSchema) return
    const sample = SAMPLE_PRESETS[selectedSchema.id]
    if (sample) {
      setFormData(sample)
      fetchLivePreview(selectedSchema.id, sample)
      fetchComplianceAudit(selectedSchema.id, selectedState, sample)
    }
  }

  const handleResetForm = () => {
    if (!selectedSchema) return
    const blank: Record<string, string> = {}
    selectedSchema.fields.forEach((f) => {
      blank[f.id] = ""
    })
    setFormData(blank)
    fetchLivePreview(selectedSchema.id, blank)
    fetchComplianceAudit(selectedSchema.id, selectedState, blank)
  }

  const handleDownloadDocx = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedSchema) return

    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const headers = new Headers({
        "Content-Type": "application/json"
      })
      if (token) headers.set("Authorization", `Bearer ${token}`)

      const response = await fetch("/api/documents/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type_id: selectedSchema.id,
          data: formData
        })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to generate document")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${selectedSchema.name.replace(/\s+/g, "_")}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || "Error generating document")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!selectedSchema) return

    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const headers = new Headers({
        "Content-Type": "application/json"
      })
      if (token) headers.set("Authorization", `Bearer ${token}`)

      const response = await fetch("/api/documents/generate-pdf", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type_id: selectedSchema.id,
          data: formData,
          state: selectedState
        })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to generate PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${selectedSchema.name.replace(/\s+/g, "_")}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || "Error generating PDF document")
    } finally {
      setLoading(false)
    }
  }

  const handlePrintPDF = () => {
    window.print()
  }

  const handleCopyText = async () => {
    if (!previewText) return
    try {
      await navigator.clipboard.writeText(previewText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error("Failed to copy", err)
    }
  }

  const handleDownloadTxt = () => {
    if (!selectedSchema || !previewText) return
    const blob = new Blob([previewText], { type: "text/plain;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedSchema.name.replace(/\s+/g, "_")}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  // Pre-flight validation warnings for the form
  const hasCriticalWarning = useMemo(() => {
    if (!auditResult) return false
    return auditResult.checks.some((c) => c.status === "action_required")
  }, [auditResult])

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header Banner */}
      <div className="no-print bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-xl shadow-md">
              <FileText className="h-6 w-6 text-secondary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary tracking-tight">
              Interactive Legal Document Studio
            </h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Generate enforceable Indian legal contracts, affidavits, police notices, and wills. Featuring <strong>AI Pre-Flight Compliance & Stamp Duty Audits</strong>, live interactive preview, and multi-format exports (.docx, PDF, txt).
          </p>
        </div>
        {selectedSchema && (
          <Button
            variant="outline"
            onClick={() => setSelectedSchema(null)}
            className="flex items-center gap-2 border-primary/30 hover:bg-primary/5 transition-all text-sm font-medium shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Browse All Templates
          </Button>
        )}
      </div>

      {!selectedSchema ? (
        /* TEMPLATE SELECTION VIEW */
        <div className="space-y-6">
          {/* Controls Bar: Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates (e.g., Rental, NDA, FIR, Will, Affidavit)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-card border-border/70 focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Template Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTypes.map((t) => {
              const meta = TEMPLATE_METADATA[t.id] || {
                category: "Legal Document",
                tag: "Standard Form",
                stampTag: "Standard Execution",
                icon: FileText
              }
              const IconComponent = meta.icon

              return (
                <Card
                  key={t.id}
                  onClick={() => loadSchema(t.id)}
                  className="group cursor-pointer hover:border-primary/60 hover:shadow-lg transition-all duration-200 border-border/80 flex flex-col justify-between overflow-hidden relative bg-card hover:bg-card/90"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-secondary to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20">
                        {meta.stampTag}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-serif text-primary group-hover:text-primary transition-colors">
                      {t.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {t.description || "Fully customized court-ready template adhering to Indian statutory norms."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 pb-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/40">
                      <span className="font-medium text-foreground/80">{meta.category}</span>
                      <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Draft Now &rarr;
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredTypes.length === 0 && (
            <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed border-border/80">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-base font-medium text-foreground">No matching templates found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search keywords or filter category.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("All")
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* DUAL-PANE WORKSPACE: FORM (LEFT) + INTERACTIVE PREVIEW & COMPLIANCE (RIGHT) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: INTERACTIVE FORM (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 no-print">
            <Card className="border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {TEMPLATE_METADATA[selectedSchema.id]?.category || "Document Schema"}
                    </span>
                    <CardTitle className="text-xl font-serif text-primary mt-2">
                      {selectedSchema.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      {selectedSchema.description}
                    </CardDescription>
                  </div>
                </div>

                {/* State Selector for Stamp Duty calculation */}
                <div className="pt-3.5 border-t border-border/40 mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-foreground">Execution State:</span>
                  </div>
                  <select
                    value={selectedState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="h-8 text-xs font-medium rounded-md border border-input bg-card px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {states.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Form Quick Action Buttons */}
                <div className="flex items-center gap-2 pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleApplySample}
                    className="h-8 text-xs font-semibold gap-1.5 bg-secondary/15 hover:bg-secondary/25 border-secondary/40 text-primary"
                    title="Populate realistic sample values to test the document immediately"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-secondary" />
                    Auto-Fill Sample Data
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleResetForm}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                    title="Clear all fields"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                {/* Pre-Flight Health Bar Summary */}
                {auditResult && (
                  <div
                    onClick={() => setActiveTab("compliance")}
                    className="cursor-pointer mb-4 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          auditResult.overall_score >= 90
                            ? "bg-green-500/15 text-green-700 dark:text-green-400"
                            : auditResult.overall_score >= 70
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : "bg-red-500/15 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {auditResult.overall_score}%
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <span>AI Compliance Score</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              auditResult.status === "Compliant"
                                ? "bg-green-500/10 text-green-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {auditResult.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {selectedState} Duty: <span className="font-semibold text-foreground">{auditResult.stamp_calculation.duty_amount}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-primary hover:underline">
                      View Audit &rarr;
                    </span>
                  </div>
                )}

                {/* Critical Statutory Alert Banner */}
                {hasCriticalWarning && (
                  <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <span className="font-semibold">Statutory Action Required: </span>
                      Check the pre-flight audit for mandatory execution rules before formal execution.
                    </div>
                  </div>
                )}

                <form id="docForm" onSubmit={handleDownloadDocx} className="space-y-4">
                  <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
                    {selectedSchema.fields.map((field) => {
                      const isLongText =
                        field.id.includes("statement") ||
                        field.id.includes("details") ||
                        field.id.includes("body") ||
                        field.id.includes("demand") ||
                        field.id.includes("beneficiary")
                      
                      return (
                        <div key={field.id} className="space-y-1.5">
                          <div className="flex justify-between items-baseline">
                            <Label htmlFor={field.id} className="text-xs font-semibold text-foreground/90">
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </Label>
                          </div>
                          
                          {isLongText ? (
                            <textarea
                              id={field.id}
                              rows={3}
                              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              value={formData[field.id] || ""}
                              onChange={(e) => handleInputChange(field.id, e.target.value)}
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                              required={field.required}
                            />
                          ) : (
                            <Input
                              id={field.id}
                              type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                              value={formData[field.id] || ""}
                              onChange={(e) => handleInputChange(field.id, e.target.value)}
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                              required={field.required}
                              className="h-9 text-sm"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-xs text-red-600 font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: LIVE INTERACTIVE COURT PREVIEW & COMPLIANCE AUDIT (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Top Preview Toolbar */}
            <div className="no-print bg-card border border-border/80 rounded-xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
              {/* Tab Selector & Metrics */}
              <div className="flex items-center gap-2">
                <div className="bg-muted/80 p-1 rounded-lg flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeTab === "preview"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Live Preview
                  </button>
                  <button
                    onClick={() => setActiveTab("compliance")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      activeTab === "compliance"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>AI Compliance & Stamp Duty</span>
                    {auditResult && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          auditResult.overall_score >= 90
                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {auditResult.overall_score}%
                      </span>
                    )}
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground border-l border-border/60 pl-3">
                  {(previewLoading || auditLoading) && <span className="text-secondary font-medium animate-pulse">Checking...</span>}
                  <span className="bg-muted/60 px-2 py-0.5 rounded font-mono">{wordCount} words</span>
                  <span className="bg-muted/60 px-2 py-0.5 rounded font-mono">~{estimatedPages} {estimatedPages === 1 ? 'page' : 'pages'}</span>
                </div>
              </div>

              {/* Multi-Format Export Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  className="h-8 px-2.5 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                  title="Copy formatted plain text to clipboard"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTxt}
                  className="h-8 px-2.5 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                  title="Download as .txt file"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>.txt</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrintPDF}
                  className="h-8 px-2.5 text-xs font-medium gap-1 border-primary/30 hover:bg-primary/5 text-primary"
                  title="Open system print dialog"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={loading}
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm"
                  title="Download genuine high-resolution formatted PDF document"
                >
                  <Download className="h-3.5 w-3.5 text-white" />
                  <span className="text-white">Download PDF</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => handleDownloadDocx()}
                  disabled={loading}
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-sm"
                  title="Download official Microsoft Word .docx template"
                >
                  <Download className="h-3.5 w-3.5 text-white" />
                  <span className="text-white">Download Word (.docx)</span>
                </Button>
              </div>
            </div>

            {/* TAB CONTENT 1: LIVE COURT PAPER PREVIEW */}
            {activeTab === "preview" && (
              <div className="print-container">
                <div
                  ref={previewContainerRef}
                  className="legal-document-paper bg-white text-slate-900 border border-border/80 shadow-md rounded-xl p-8 sm:p-10 font-serif min-h-[620px] max-h-[72vh] overflow-y-auto relative transition-all"
                  style={{
                    backgroundImage: "radial-gradient(#e2e8f0 0.75px, transparent 0.75px)",
                    backgroundSize: "24px 24px"
                  }}
                >
                  {/* Decorative Court Header Stamp */}
                  <div className="border-b-2 border-primary/40 pb-4 mb-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-primary font-sans text-xs uppercase tracking-widest font-bold">
                      <Scale className="h-4 w-4 text-secondary" />
                      <span>NyayAssist Legal Document Drafting System</span>
                    </div>
                    <div className="text-[11px] font-sans text-slate-500 mt-0.5">
                      Court-Ready Draft &bull; Governed under Indian Legal Jurisdiction ({selectedState})
                    </div>
                  </div>

                  {/* Rendered Plain Document Text */}
                  <div className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-slate-800 selection:bg-secondary/30 selection:text-foreground">
                    {previewText || "Loading preview..."}
                  </div>

                  {/* Document Footer Watermark Note */}
                  <div className="border-t border-slate-200 mt-10 pt-4 text-center text-[10px] font-sans text-slate-400">
                    Drafted via NyayAssist AI Document Engine &bull; Please execute on appropriate Non-Judicial e-Stamp Paper as prescribed by State Law ({selectedState}).
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: AI PRE-FLIGHT COMPLIANCE & STATE STAMP DUTY HUB */}
            {activeTab === "compliance" && auditResult && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* Top State Calculator Summary Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Stamp Duty Card */}
                  <Card className="border-primary/20 bg-primary/5 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                          <Landmark className="h-3.5 w-3.5" />
                          {auditResult.selected_state} e-Stamp Duty
                        </span>
                        <span className="text-base font-bold text-primary font-mono">
                          {auditResult.stamp_calculation.duty_amount}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-1 space-y-1">
                      <p className="text-xs text-foreground/90 font-medium">
                        {auditResult.stamp_calculation.duty_formula}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {auditResult.stamp_calculation.act_citation}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Registration Fee Card */}
                  <Card className="border-secondary/30 bg-secondary/5 shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                          <FileCheck className="h-3.5 w-3.5 text-secondary" />
                          Registration Requirement
                        </span>
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-card text-foreground border">
                          Fee: {auditResult.stamp_calculation.registration_fee}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-1">
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {auditResult.stamp_calculation.registration_status}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Pre-Flight AI Diagnostic Checklist */}
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-serif text-primary flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Pre-Flight Statutory & Execution Audit
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Readiness:</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            auditResult.overall_score >= 90
                              ? "bg-green-500/15 text-green-700 dark:text-green-400"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {auditResult.overall_score}% {auditResult.status}
                        </span>
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      Automated audit against Indian statutory mandates (Registration Act, Indian Contract Act, Bharatiya Nagarik Suraksha Sanhita).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-1 pb-5">
                    {auditResult.checks.map((check, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                          check.status === "pass"
                            ? "bg-green-500/5 border-green-500/20"
                            : check.status === "action_required"
                            ? "bg-red-500/5 border-red-500/25"
                            : "bg-amber-500/5 border-amber-500/25"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {check.status === "pass" ? (
                            <div className="h-5 w-5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                              <Check className="h-3 w-3" />
                            </div>
                          ) : check.status === "action_required" ? (
                            <div className="h-5 w-5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                              <ShieldAlert className="h-3 w-3" />
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                              <AlertCircle className="h-3 w-3" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {check.title}
                            </span>
                            {check.statute && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card text-muted-foreground border">
                                {check.statute}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {check.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* State Official e-Stamping Portal Link */}
                <div className="p-4 bg-muted/40 rounded-xl border border-border/60 text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-foreground">Official e-Stamping Authority: </span>
                      {auditResult.stamp_calculation.portal}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-primary font-medium text-[11px] whitespace-nowrap">
                    Authorized Indian Government Portal <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
