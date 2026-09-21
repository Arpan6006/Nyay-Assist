import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import { Scale } from "lucide-react"

export default function LawyerPortalPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    bar_council_id: "",
    licence_number: "",
    court_level: "",
    case_types: "",
    cases_handled_count: "",
    contact: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError("Please upload your COP (Certificate of Practice) document.")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const data = new FormData()
      Object.entries(formData).forEach(([key, val]) => {
        data.append(key, val)
      })
      data.append("cop_file", file)

      const token = localStorage.getItem("token")
      const response = await fetch("/api/lawyer-portal/register", {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: data
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || "Registration failed. Ensure you are logged in.")
      }

      setSuccess("Your registration has been submitted and is pending verification.")
      // Reset form
      setFormData({
        full_name: "",
        bar_council_id: "",
        licence_number: "",
        court_level: "",
        case_types: "",
        cases_handled_count: "",
        contact: "",
      })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ""

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-primary flex items-center gap-2">
            <Scale className="h-8 w-8 text-secondary" />
            Lawyer Portal
          </h2>
          <p className="text-muted-foreground mt-2">
            Join the NyayAssist network as a verified legal professional.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Apply for Verification</CardTitle>
          <CardDescription>
            Submit your credentials below. Our team will verify your Certificate of Practice (COP) before listing you in the public directory.
            <br/><br/>
            <em>Note: You must be logged in to a NyayAssist account to submit this form.</em>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input name="full_name" value={formData.full_name} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label>Contact Number / Email</Label>
                <Input name="contact" value={formData.contact} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label>Bar Council ID</Label>
                <Input name="bar_council_id" value={formData.bar_council_id} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label>Licence Number</Label>
                <Input name="licence_number" value={formData.licence_number} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label>Primary Court Level</Label>
                <Input name="court_level" placeholder="e.g. High Court" value={formData.court_level} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label>Specialization (Case Types)</Label>
                <Input name="case_types" placeholder="e.g. Criminal, Corporate" value={formData.case_types} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label>Approximate Cases Handled</Label>
                <Input type="number" name="cases_handled_count" value={formData.cases_handled_count} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label>Upload COP (Image/PDF)</Label>
                <Input 
                  type="file" 
                  ref={fileRef}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
            </div>
            
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            {success && <p className="text-green-600 text-sm font-medium">{success}</p>}
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Submitting..." : "Submit Registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
