import { Link } from "react-router-dom"
import { 
  Scale, 
  ShieldCheck, 
  FileText, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  FileCheck2,
  Sparkles,
  ExternalLink,
  Lock
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="space-y-16 -mt-2 pb-12">
      {/* Hero Section with Cinematic Background */}
      <section className="relative rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 text-black min-h-[520px] flex items-center">
        {/* Background Image with Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: `url('/legal_hero_bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-50/95 via-amber-50/85 to-amber-100/60 backdrop-blur-[2px]" />
        
        {/* Hero Content */}
        <div className="relative z-10 p-8 sm:p-12 md:p-16 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/20 border border-secondary/40 text-black text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>Updated with BNS, BNSS & BSA (2023–2024 Acts)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-black leading-tight tracking-tight drop-shadow-sm">
            Next-Generation <span className="text-black font-serif underline decoration-secondary">Legal Intelligence</span> for Indian Law
          </h1>

          <p className="text-black text-sm sm:text-base md:text-lg leading-relaxed font-sans max-w-2xl font-medium">
            Navigate the <strong>Bharatiya Nyaya Sanhita (BNS)</strong>, <strong>BNSS</strong>, and <strong>BSA</strong> with AI-powered statutory analysis, plain-language guidance, and automated legal drafting.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link 
              to="/chat" 
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-secondary text-black font-semibold hover:bg-secondary/90 transition-all shadow-lg hover:shadow-secondary/25 hover:-translate-y-0.5 text-sm"
            >
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>Start Legal Analysis</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
            
            <Link 
              to="/contracts" 
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/80 hover:bg-white text-black font-semibold border border-black/20 transition-all backdrop-blur-sm text-sm"
            >
              <FileCheck2 className="w-4 h-4 text-black" />
              <span>Analyze Contracts</span>
            </Link>

            <Link 
              to="/documents" 
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/80 hover:bg-white text-black font-semibold border border-black/20 transition-all backdrop-blur-sm text-sm"
            >
              <FileText className="w-4 h-4 text-black" />
              <span>Generate Legal Notices</span>
            </Link>
          </div>

          <div className="flex items-center gap-6 pt-4 text-xs text-black font-medium">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-black" />
              <span>Statutory Compliance & Insights</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-black" />
              <span>Direct Law Citations</span>
            </div>
          </div>
        </div>
      </section>

      {/* The 3 New Criminal Laws Artifacts Section */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary">
            The Pillars of Indian Criminal Law Reform
          </h2>
          <p className="text-sm text-muted-foreground">
            NyayAssist is engineered around the three new criminal codes replacing colonial-era statutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: BNS */}
          <div className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-serif font-bold text-lg">
                BNS
              </div>
              <h3 className="text-lg font-serif font-bold text-primary">
                Bharatiya Nyaya Sanhita, 2023
              </h3>
              <p className="text-xs text-secondary font-semibold uppercase tracking-wider">
                Replaces IPC 1860 (Indian Penal Code)
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Consisting of 358 sections, BNS introduces modernized definitions of offenses against women and children, organized crime, terror acts, mob lynching, and community service penalties.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-border/40 flex items-center justify-between text-xs font-medium text-primary">
              <span className="text-muted-foreground">358 Sections Codified</span>
              <Link 
                to="/blog" 
                className="text-secondary hover:text-secondary/80 flex items-center gap-1 font-semibold group/link transition-colors"
              >
                <span>Offenses & Penalties</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Card 2: BNSS */}
          <div className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-serif font-bold text-lg">
                BNSS
              </div>
              <h3 className="text-lg font-serif font-bold text-primary">
                Bharatiya Nagarik Suraksha Sanhita, 2023
              </h3>
              <p className="text-xs text-secondary font-semibold uppercase tracking-wider">
                Replaces CrPC 1973 (Code of Criminal Procedure)
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Replaces 531 sections of procedure with time-bound investigations, mandatory audio-video recordings for search & seizure, zero FIR protocols, and mandatory forensic mandates.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-border/40 flex items-center justify-between text-xs font-medium text-primary">
              <span className="text-muted-foreground">531 Sections of Procedure</span>
              <Link 
                to="/chat" 
                className="text-secondary hover:text-secondary/80 flex items-center gap-1 font-semibold group/link transition-colors"
              >
                <span>FIR & Police Timelines</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Card 3: BSA */}
          <div className="bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-serif font-bold text-lg">
                BSA
              </div>
              <h3 className="text-lg font-serif font-bold text-primary">
                Bharatiya Sakshya Adhiniyam, 2023
              </h3>
              <p className="text-xs text-secondary font-semibold uppercase tracking-wider">
                Replaces Indian Evidence Act 1872
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Provides comprehensive recognition of digital and electronic records as primary evidence, updated admissibility criteria, and structured electronic forensic compliance.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-border/40 flex items-center justify-between text-xs font-medium text-primary">
              <span className="text-muted-foreground">170 Sections of Evidence</span>
              <Link 
                to="/blog" 
                className="text-secondary hover:text-secondary/80 flex items-center gap-1 font-semibold group/link transition-colors"
              >
                <span>Digital Evidence Rules</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Capabilities Grid */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-primary">
              Everything You Need for Legal Clarity
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Engineered for citizens, litigants, businesses, and legal professionals.
            </p>
          </div>
          <Link 
            to="/chat" 
            className="text-xs font-semibold text-secondary flex items-center gap-1 hover:underline"
          >
            Explore all capabilities <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <Link 
            to="/chat" 
            className="group bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-black flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-black" />
              </div>
              <h4 className="font-serif font-bold text-base text-primary group-hover:text-secondary transition-colors">
                Legal AI Assistant
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Consult with verified statutory retrieval. Get exact sections, rights breakdown, and actionable next steps.
              </p>
            </div>
            <span className="text-xs font-medium text-secondary flex items-center gap-1 mt-4">
              Try Legal Chat <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1 text-black" />
            </span>
          </Link>

          {/* Feature 2 */}
          <Link 
            to="/contracts" 
            className="group bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-secondary text-black flex items-center justify-center shadow-sm">
                <FileCheck2 className="w-5 h-5 text-black" />
              </div>
              <h4 className="font-serif font-bold text-base text-primary group-hover:text-secondary transition-colors">
                Contract Risk Analyzer
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload NDAs, employment agreements, and commercial contracts to extract hidden liabilities and risks.
              </p>
            </div>
            <span className="text-xs font-medium text-secondary flex items-center gap-1 mt-4">
              Analyze Agreement <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1 text-black" />
            </span>
          </Link>

          {/* Feature 3 */}
          <Link 
            to="/documents" 
            className="group bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-accent text-black flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-black" />
              </div>
              <h4 className="font-serif font-bold text-base text-primary group-hover:text-secondary transition-colors">
                Document Generator
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Draft formal Legal Notices, RTI petitions, consumer complaints, and tenancy agreements in minutes.
              </p>
            </div>
            <span className="text-xs font-medium text-secondary flex items-center gap-1 mt-4">
              Generate Draft <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1 text-black" />
            </span>
          </Link>

          {/* Feature 4 */}
          <Link 
            to="/lawyers" 
            className="group bg-white dark:bg-card border border-neutral-200/80 dark:border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/80 text-black flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5 text-black" />
              </div>
              <h4 className="font-serif font-bold text-base text-primary group-hover:text-secondary transition-colors">
                Lawyer Directory
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Find verified criminal defense, cyber law, civil, and corporate advocates across High Courts and District Courts.
              </p>
            </div>
            <span className="text-xs font-medium text-secondary flex items-center gap-1 mt-4">
              Find Lawyers <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1 text-black" />
            </span>
          </Link>
        </div>
      </section>

      {/* Verified Government Sources & Legal Portals Banner */}
      <section className="bg-amber-50/90 text-black rounded-2xl p-6 sm:p-8 shadow-xl border border-secondary/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-secondary text-xs font-semibold uppercase tracking-wider">
            <Scale className="w-4 h-4 text-black" />
            <span className="text-black font-bold">Official Government Repositories</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-black">
            Integrated with Official Indian Legal Databases
          </h3>
          <p className="text-xs sm:text-sm text-black leading-relaxed font-sans font-medium">
            Our citations are backed by direct references to the Ministry of Law and Justice (India Code), the National Legal Services Authority (NALSA), and the Supreme Court e-Courts portal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <a
            href="https://www.indiacode.nic.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-neutral-100 border border-black/20 text-xs font-semibold text-black transition-colors shadow-xs"
          >
            <span className="text-black">India Code Portal</span>
            <ExternalLink className="w-3 h-3 text-black opacity-75" />
          </a>
          <a
            href="https://nalsa.gov.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-neutral-100 border border-black/20 text-xs font-semibold text-black transition-colors shadow-xs"
          >
            <span className="text-black">NALSA Free Legal Aid</span>
            <ExternalLink className="w-3 h-3 text-black opacity-75" />
          </a>
          <a
            href="https://ecourts.gov.in"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-neutral-100 border border-black/20 text-xs font-semibold text-black transition-colors shadow-xs"
          >
            <span className="text-black">eCourts Services</span>
            <ExternalLink className="w-3 h-3 text-black opacity-75" />
          </a>
        </div>
      </section>
    </div>
  )
}
