import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Label } from "../components/ui/label"
import { ShieldCheck, Lock, Users, FileText, Activity, MessageSquare, Trash2, Edit } from "lucide-react"

export default function AdminDashboardPage() {
  const [adminPassword, setAdminPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const [activeTab, setActiveTab] = useState("dashboard")
  
  // Data States
  const [stats, setStats] = useState<any>(null)
  const [pendingLawyers, setPendingLawyers] = useState<any[]>([])
  const [verifiedLawyers, setVerifiedLawyers] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleLogin = async () => {
    if (!adminPassword) return
    setLoading(true)
    setError("")
    
    try {
      // Just ping the stats endpoint to verify password
      const response = await fetch(`/api/admin/stats?password=${encodeURIComponent(adminPassword)}`)
      if (!response.ok) throw new Error("Unauthorized or incorrect password")
      
      setIsAuthenticated(true)
      fetchDashboardData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    setError("")
    setSuccess("")
    
    try {
      const statsRes = await fetch(`/api/admin/stats?password=${encodeURIComponent(adminPassword)}`)
      if (statsRes.ok) setStats(await statsRes.json())
      
      const plRes = await fetch(`/api/lawyer-portal/pending?password=${encodeURIComponent(adminPassword)}`)
      if (plRes.ok) setPendingLawyers(await plRes.json())
      
      const vlRes = await fetch(`/api/admin/lawyers?password=${encodeURIComponent(adminPassword)}`)
      if (vlRes.ok) setVerifiedLawyers(await vlRes.json())
      
      const usersRes = await fetch(`/api/admin/users?password=${encodeURIComponent(adminPassword)}`)
      if (usersRes.ok) setUsers(await usersRes.json())
        
      const ticketsRes = await fetch(`/api/admin/support?password=${encodeURIComponent(adminPassword)}`)
      if (ticketsRes.ok) setTickets(await ticketsRes.json())

    } catch (err: any) {
      setError("Failed to fetch some dashboard data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData()
    }
  }, [isAuthenticated, activeTab])

  // --- ACTIONS ---
  const verifyLawyer = async (lawyerId: string) => {
    try {
      await fetch(`/api/lawyer-portal/${lawyerId}/verify?password=${encodeURIComponent(adminPassword)}`, { method: "POST" })
      fetchDashboardData()
      setSuccess("Lawyer verified.")
    } catch(err) { setError("Action failed") }
  }
  
  const revokeLawyer = async (lawyerId: string) => {
    if (!window.confirm("Are you sure you want to revoke this lawyer's verification?")) return
    try {
      await fetch(`/api/admin/lawyers/${lawyerId}/revoke?password=${encodeURIComponent(adminPassword)}`, { method: "POST" })
      fetchDashboardData()
      setSuccess("Lawyer verification revoked.")
    } catch(err) { setError("Action failed") }
  }

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user completely?")) return
    try {
      await fetch(`/api/admin/users/${userId}?password=${encodeURIComponent(adminPassword)}`, { method: "DELETE" })
      fetchDashboardData()
      setSuccess("User deleted.")
    } catch(err) { setError("Action failed") }
  }
  
  const resolveTicket = async (ticketId: string) => {
    try {
      await fetch(`/api/admin/support/${ticketId}/resolve?password=${encodeURIComponent(adminPassword)}`, { method: "POST" })
      fetchDashboardData()
      setSuccess("Ticket resolved.")
    } catch(err) { setError("Action failed") }
  }

  // --- CMS STATE ---
  const [blogForm, setBlogForm] = useState({ title: "", crime_type: "", source_sections: "", body: "" })
  
  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...blogForm, password: adminPassword })
      })
      if (!res.ok) throw new Error("Failed to post")
      setSuccess("Blog post created!")
      setBlogForm({ title: "", crime_type: "", source_sections: "", body: "" })
      fetchDashboardData()
    } catch(err: any) { setError(err.message) }
    finally { setLoading(false) }
  }


  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-24">
        <Card className="border-accent shadow-lg text-center">
          <CardHeader className="bg-primary/5">
            <Lock className="h-12 w-12 text-secondary mx-auto mb-4" />
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Enter the master password to access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Input 
              type="password" 
              placeholder="Admin Password" 
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button onClick={handleLogin} disabled={loading} className="w-full">Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 space-y-2">
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
            <Lock className="h-6 w-6 text-secondary" />
            Admin Panel
          </h2>
        </div>
        
        <nav className="flex flex-col space-y-1">
          {[
            { id: "dashboard", icon: Activity, label: "Overview" },
            { id: "verifications", icon: ShieldCheck, label: "Verifications" },
            { id: "lawyers", icon: FileText, label: "Lawyer Directory" },
            { id: "users", icon: Users, label: "Users" },
            { id: "cms", icon: Edit, label: "Blog CMS" },
            { id: "support", icon: MessageSquare, label: "Support Tickets" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted text-muted-foreground hover:text-primary"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100">{error}</div>}
        {success && <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-100">{success}</div>}

        {/* OVERVIEW TAB */}
        {activeTab === "dashboard" && stats && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold">Platform Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{stats.users}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Verified Lawyers</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{stats.verified_lawyers}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Blog Posts</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{stats.blog_posts}</div></CardContent>
              </Card>
              <Card className="border-secondary/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold text-secondary">{stats.open_tickets}</div></CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* VERIFICATIONS TAB */}
        {activeTab === "verifications" && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold">Pending Verifications</h3>
            <div className="space-y-4">
              {pendingLawyers.map(pl => (
                <Card key={pl.lawyer_id}>
                  <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <p className="font-bold text-lg text-primary">{pl.full_name}</p>
                      <p className="text-sm text-muted-foreground mt-1 font-mono bg-background px-2 py-0.5 rounded inline-block border">Bar ID: {pl.bar_council_id} | License: {pl.licence_number}</p>
                      <p className="text-sm text-muted-foreground mt-2">Types: {pl.case_types} | Court: {pl.court_level}</p>
                    </div>
                    <Button onClick={() => verifyLawyer(pl.lawyer_id)} className="bg-green-600 hover:bg-green-700">
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {pendingLawyers.length === 0 && <p className="text-muted-foreground">No pending verifications.</p>}
            </div>
          </div>
        )}

        {/* LAWYERS TAB */}
        {activeTab === "lawyers" && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold">Verified Lawyers Directory</h3>
            <div className="space-y-4">
              {verifiedLawyers.map(vl => (
                <Card key={vl.lawyer_id}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">{vl.full_name}</p>
                      <p className="text-sm text-muted-foreground">Bar ID: {vl.bar_council_id}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => revokeLawyer(vl.lawyer_id)} className="text-red-500 hover:text-red-700">
                      Revoke
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {verifiedLawyers.length === 0 && <p className="text-muted-foreground">No verified lawyers yet.</p>}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold">User Management</h3>
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.user_id} className="flex justify-between items-center p-3 border rounded-md bg-muted/30">
                  <span className="font-mono">{u.email}</span>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteUser(u.user_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {users.length === 0 && <p className="text-muted-foreground">No users found.</p>}
            </div>
          </div>
        )}

        {/* BLOG CMS TAB */}
        {activeTab === "cms" && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold">Create Blog Post</h3>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleBlogSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={blogForm.title} onChange={e => setBlogForm({...blogForm, title: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Crime Type Category</Label>
                      <Input value={blogForm.crime_type} onChange={e => setBlogForm({...blogForm, crime_type: e.target.value})} required placeholder="e.g. Cybercrime" />
                    </div>
                    <div className="space-y-2">
                      <Label>Source Sections (comma separated)</Label>
                      <Input value={blogForm.source_sections} onChange={e => setBlogForm({...blogForm, source_sections: e.target.value})} required placeholder="e.g. BNS 103, BNS 111" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Body Content (Markdown/Text)</Label>
                    <textarea 
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[200px]"
                      value={blogForm.body} onChange={e => setBlogForm({...blogForm, body: e.target.value})} required 
                    />
                  </div>
                  <Button type="submit">Publish Post</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SUPPORT TICKETS TAB */}
        {activeTab === "support" && (
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold">Support Tickets</h3>
            <div className="space-y-4">
              {tickets.map(t => (
                <Card key={t.id} className={t.status === "Open" ? "border-secondary/50" : "opacity-75"}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg">{t.subject}</h4>
                        <p className="text-sm text-muted-foreground">From: {t.name} ({t.email})</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${t.status === "Open" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {t.status}
                        </span>
                        {t.status === "Open" && (
                          <Button size="sm" variant="outline" onClick={() => resolveTicket(t.id)}>Mark Resolved</Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm bg-muted/30 p-3 rounded-md">{t.message}</p>
                  </CardContent>
                </Card>
              ))}
              {tickets.length === 0 && <p className="text-muted-foreground">No tickets submitted.</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
