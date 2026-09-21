import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import { MessageSquareText } from "lucide-react"

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error("Failed to submit support ticket")
      setSuccess("Your message has been sent successfully. We will get back to you soon.")
      setFormData({ name: "", email: "", subject: "", message: "" })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 mt-12">
      <div className="text-center mb-8">
        <MessageSquareText className="h-12 w-12 text-secondary mx-auto mb-4" />
        <h2 className="text-3xl font-serif font-bold text-primary">
          Contact Support
        </h2>
        <p className="text-muted-foreground mt-2">
          Have an issue or feedback? Send us a message and our team will review it.
        </p>
      </div>

      <Card className="shadow-lg border-primary/10">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle>Submit a Ticket</CardTitle>
          <CardDescription>All fields are required.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input name="subject" value={formData.subject} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <textarea 
                name="message" 
                value={formData.message} 
                onChange={handleChange} 
                required
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[150px]"
              />
            </div>
            
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            {success && <p className="text-green-600 text-sm font-medium">{success}</p>}
            
            <Button type="submit" disabled={loading} className="w-full text-lg mt-4">
              {loading ? "Submitting..." : "Send Message"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
