import { BrowserRouter, Routes, Route, Link, Outlet, Navigate } from 'react-router-dom'
import { Scale } from 'lucide-react'
import { useState } from 'react'

// Layout Component
function Layout() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem("token"));
  
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuth(false);
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-black">
      <header className="bg-white/90 backdrop-blur border-b border-neutral-200/80 text-black py-4 px-6 shadow-sm flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="flex items-center space-x-2">
          <Scale className="h-6 w-6 text-black" />
          <span className="text-xl font-serif font-bold tracking-wider text-black">NyayAssist</span>
        </Link>
        <nav className="flex items-center space-x-6 text-sm font-semibold">
          <Link to="/chat" className="text-black hover:text-secondary transition-colors">Legal Chat</Link>
          <Link to="/blog" className="text-black hover:text-secondary transition-colors">Legal Blog</Link>
          <Link to="/documents" className="text-black hover:text-secondary transition-colors">Documents</Link>
          <Link to="/contracts" className="text-black hover:text-secondary transition-colors">Contracts</Link>
          <Link to="/lawyers" className="text-black hover:text-secondary transition-colors">Lawyers</Link>
          <Link to="/lawyer-portal" className="text-black hover:text-secondary transition-colors">For Lawyers</Link>
          <Link to="/support" className="text-black hover:text-secondary transition-colors">Support</Link>
          <div className="border-l border-neutral-300 h-4 mx-2"></div>
          {isAuth ? (
            <button onClick={handleLogout} className="text-black hover:text-secondary transition-colors font-semibold">Logout</button>
          ) : (
            <Link to="/login" className="text-black hover:text-secondary transition-colors font-semibold">Login</Link>
          )}
          <Link to="/admin" className="text-xs uppercase tracking-widest text-accent hover:text-accent/80 font-bold ml-2">Admin</Link>
        </nav>
      </header>
      <main className="flex-1 px-4 sm:px-6 md:px-8 py-4 sm:py-6 max-w-7xl mx-auto w-full flex flex-col">
        <Outlet />
      </main>
      <footer className="bg-neutral-100 border-t border-neutral-200/80 py-3.5 px-4 text-center text-xs text-black font-medium mt-auto">
        <p className="text-black">&copy; {new Date().getFullYear()} NyayAssist. AI-Powered Legal Intelligence for Indian Law.</p>
      </footer>
    </div>
  )
}

function ProtectedRoute() {
  const isAuth = !!localStorage.getItem("token");
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

import HomePage from './pages/Home'
import AuthPage from './pages/Auth'
import ChatPage from './pages/Chat'
import BlogPage from './pages/Blog'
import DocumentGeneratorPage from './pages/DocumentGenerator'
import ContractAnalyzerPage from './pages/ContractAnalyzer'
import LawyerDirectoryPage from './pages/LawyerDirectory'
import LawyerPortalPage from './pages/LawyerPortal'
import AdminDashboardPage from './pages/AdminDashboard'
import SupportPage from './pages/Support'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="login" element={<AuthPage />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<HomePage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="documents" element={<DocumentGeneratorPage />} />
            <Route path="contracts" element={<ContractAnalyzerPage />} />
            <Route path="lawyers" element={<LawyerDirectoryPage />} />
            <Route path="lawyer-portal" element={<LawyerPortalPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="admin" element={<AdminDashboardPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
