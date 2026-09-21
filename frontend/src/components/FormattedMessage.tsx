import React from 'react';
import { ExternalLink, BookOpen, ShieldCheck, Scale, Globe } from 'lucide-react';

interface FormattedMessageProps {
  content: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content }) => {
  if (!content) return null;

  // Split into lines to process structure
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentList: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2.5 pl-1">
            {currentList}
          </ul>
        );
      } else if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2.5 pl-1">
            {currentList}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  // Helper to parse inline bolding **text** -> <strong>text</strong>
  const renderInlineFormatted = (text: string) => {
    // Clean up any rogue leading hashtags
    const sanitized = text.replace(/^#+\s*/, '');
    const parts = sanitized.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const clean = part.slice(2, -2).trim();
        return (
          <strong key={i} className="font-semibold text-foreground">
            {clean}
          </strong>
        );
      }
      // Clean up stray asterisks
      const cleanedPart = part.replace(/^\s*[\*\-]\s*/, '').replace(/\*/g, '');
      return <span key={i}>{cleanedPart}</span>;
    });
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    // Empty line
    if (!line) {
      flushList();
      return;
    }

    // Horizontal divider
    if (line === '***' || line === '---' || line === '___') {
      flushList();
      elements.push(<hr key={`hr-${idx}`} className="my-3 border-border/60" />);
      return;
    }

    // Markdown Headings (# ..., ## ..., ### ..., #### ...) or **Heading**
    const isMarkdownHeading = /^#{1,6}\s+/.test(line);
    const isBoldHeading = /^\*\*[^*]{3,80}\*\*$/.test(line);
    const isEmojiHeading = /^\*\*?[🔍⚖️📋🏛️👨‍⚖️👉🙋💡📌⚠️🚨]/.test(line);

    if (isMarkdownHeading || isBoldHeading || isEmojiHeading) {
      flushList();
      let headingText = line
        .replace(/^#{1,6}\s*/, '')
        .replace(/^\*{1,3}/, '')
        .replace(/\*{1,3}$/, '')
        .trim();

      elements.push(
        <div key={`h-${idx}`} className="mt-4 mb-2 pt-1 border-b border-border/40 pb-1">
          <h4 className="text-base font-bold text-primary tracking-tight flex items-center gap-1.5 font-sans">
            {headingText}
          </h4>
        </div>
      );
      return;
    }

    // Numbered item (1. ..., 2. ...)
    const numberedMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numberedMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      const num = numberedMatch[1];
      const text = numberedMatch[2];
      currentList.push(
        <li key={`li-${idx}`} className="flex items-start gap-2.5 text-sm text-foreground/90 font-sans leading-relaxed">
          <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
            {num}
          </span>
          <div className="flex-1">{renderInlineFormatted(text)}</div>
        </li>
      );
      return;
    }

    // Bullet point (* ... or - ...)
    const bulletMatch = line.match(/^[\*\-•]\s+(.*)/);
    if (bulletMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      const text = bulletMatch[1];
      currentList.push(
        <li key={`li-${idx}`} className="flex items-start gap-2 text-sm text-foreground/90 font-sans leading-relaxed">
          <span className="text-primary mt-1.5 text-xs font-bold leading-none">•</span>
          <div className="flex-1">{renderInlineFormatted(text)}</div>
        </li>
      );
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="my-2 text-sm font-sans leading-relaxed text-foreground/90">
        {renderInlineFormatted(line)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1 font-sans text-sm">{elements}</div>;
};

// Official Legal Portal Links
export const SOURCE_LINKS: Record<string, { title: string; url: string; category: string; description: string }> = {
  bns: {
    title: 'Bharatiya Nyaya Sanhita, 2023 (BNS)',
    url: 'https://www.indiacode.nic.in/handle/123456789/20062',
    category: 'Official Substantive Criminal Law',
    description: 'Replaced Indian Penal Code (IPC)'
  },
  bnss: {
    title: 'Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)',
    url: 'https://www.indiacode.nic.in/handle/123456789/20063',
    category: 'Official Criminal Procedure Law',
    description: 'Replaced Code of Criminal Procedure (CrPC)'
  },
  bsa: {
    title: 'Bharatiya Sakshya Adhiniyam, 2023 (BSA)',
    url: 'https://www.indiacode.nic.in/handle/123456789/20064',
    category: 'Official Law of Evidence',
    description: 'Replaced Indian Evidence Act (IEA)'
  },
};

// Helpful Government & Legal Aid Resources
export const CONTEXT_LINKS = [
  {
    title: 'India Code Official Portal',
    url: 'https://www.indiacode.nic.in/',
    description: 'Digital repository of all Central and State Acts'
  },
  {
    title: 'National Legal Services Authority (NALSA)',
    url: 'https://nalsa.gov.in/',
    description: 'Free Legal Aid & Legal Services for Indian Citizens'
  },
  {
    title: 'National Cyber Crime Reporting Portal',
    url: 'https://cybercrime.gov.in/',
    description: 'Official portal to report online financial fraud & cyber crimes'
  },
  {
    title: 'eCourts Services Portal',
    url: 'https://ecourts.gov.in/',
    description: 'Check case status, court orders and cause lists across India'
  }
];

interface SourcesSectionProps {
  citations?: any[];
  userQuery?: string;
}

export const SourcesSection: React.FC<SourcesSectionProps> = ({ citations }) => {
  if (!citations || citations.length === 0) return null;

  // Extract unique law keys (bns, bnss, bsa)
  const referencedKeys = new Set<string>();
  citations.forEach((c: any) => {
    const filename = c.source?.split(/[/\\]/).pop()?.replace('.txt', '').toLowerCase() || '';
    if (filename.includes('bns') && !filename.includes('bnss')) referencedKeys.add('bns');
    if (filename.includes('bnss')) referencedKeys.add('bnss');
    if (filename.includes('bsa')) referencedKeys.add('bsa');
  });

  // Default to at least BNS/BNSS if not specifically tagged
  if (referencedKeys.size === 0) {
    referencedKeys.add('bns');
    referencedKeys.add('bnss');
  }

  return (
    <div className="mt-4 pt-3 border-t border-border/50 text-xs font-sans">
      <div className="flex items-center gap-1.5 font-semibold text-primary mb-2">
        <BookOpen className="w-3.5 h-3.5 text-primary" />
        <span>Verified Legal Sources & Contextual Links:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {Array.from(referencedKeys).map((key) => {
          const source = SOURCE_LINKS[key];
          if (!source) return null;
          return (
            <a
              key={key}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 p-2 rounded-lg border border-border bg-card/60 hover:bg-accent/10 hover:border-primary/40 transition-all text-foreground group shadow-sm"
            >
              <Scale className="w-4 h-4 text-primary mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 font-medium text-xs text-primary group-hover:underline">
                  <span className="truncate">{source.title}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70" />
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{source.description}</p>
              </div>
            </a>
          );
        })}

        {/* Essential Citizen Portals Link */}
        <a
          href="https://www.indiacode.nic.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 p-2 rounded-lg border border-border bg-card/60 hover:bg-accent/10 hover:border-primary/40 transition-all text-foreground group shadow-sm"
        >
          <Globe className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 font-medium text-xs text-primary group-hover:underline">
              <span>India Code Legal Portal</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70" />
            </div>
            <p className="text-[11px] text-muted-foreground truncate">Ministry of Law and Justice (Official Repository)</p>
          </div>
        </a>

        <a
          href="https://nalsa.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 p-2 rounded-lg border border-border bg-card/60 hover:bg-accent/10 hover:border-primary/40 transition-all text-foreground group shadow-sm"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 font-medium text-xs text-primary group-hover:underline">
              <span>Free Legal Aid (NALSA)</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70" />
            </div>
            <p className="text-[11px] text-muted-foreground truncate">Government-Provided Legal Services & Support</p>
          </div>
        </a>
      </div>
    </div>
  );
};
