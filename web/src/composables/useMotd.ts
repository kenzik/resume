/**
 * MOTD (Message of the Day) composable
 * Returns plain text terminal-style MOTD with ANSI art
 */

// ANSI color codes
const ANSI = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

export function useMotd() {
  const getMotd = (): { banner: string; text: string } => {
    // Art content (without ANSI codes) - all padded to 72 chars for consistent rectangular box
    const artLines = [
      '██║  ██╗███████╗███╗   ██╗███████╗██╗██╗  ██╗',  // 45 chars
      '██║ ██╔╝██╔════╝████╗  ██║╚══███╔╝██║██║ ██╔╝',  // 45 chars
      '█████╔╝ █████╗  ██╔██╗ ██║  ███╔╝ ██║█████╔╝',   // 44 chars
      '██╔═██╗ ██╔══╝  ██║╚██╗██║ ███╔╝  ██║██╔═██╗',   // 44 chars
      '██║  ██╗███████╗██║ ╚████║███████╗██║██║  ██╗',  // 45 chars
      '╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝╚═╝  ╚═╝'   // 45 chars
    ];
    
    // Pad all art lines to 72 characters (consistent width)
    const paddedArt = artLines.map(line => line.padEnd(72, ' '));
    
    const banner = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║  ${paddedArt[0]} ║
║  ${paddedArt[1]} ║
║  ${paddedArt[2]} ║
║  ${paddedArt[3]} ║
║  ${paddedArt[4]} ║
║  ${paddedArt[5]} ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`.trim();

    const text = `
Hi. I'm Dave.

Cloud-Native Architect | AI Infrastructure & Strategy | Full-Stack Engineer | Senior Technical Leader

─────────────────────────────────────────────────────────────────────────────

About Me:

  Senior Technologist with 25+ years of experience bridging executive business 
  strategy and deep-tech engineering. Career spans from Founder/CTO to 
  Senior Principal Architect, including work with Fortune 50 enterprises.

  Currently pivoting deeper into AI/ML Infrastructure—architecting 
  high-performance compute, RAG pipelines, and scalable cloud systems that power AI models.

  Actively pursuing NVIDIA architecture certifications and seeking roles 
  at the intersection of High-Performance Computing (HPC), Cloud-Native Infrastructure, 
  and Applied AI.

─────────────────────────────────────────────────────────────────────────────

Technical Arsenal:

  AI & ML:        LangChain, RAG, Vertex AI, Pinecone, Redis Vector, Prompt Engineering
  Cloud & Infra:     Google Cloud Platform (GCP), Terraform (IaC), Docker
  High Scale:        Redis Streams/Cluster, WebSockets, Distributed Systems
  Languages:        Python, TypeScript, Node.js, Go, Bash
  Leadership:      Solution Architecture, Technical Strategy, Team Mentorship

─────────────────────────────────────────────────────────────────────────────

About This Resume:

  This is a "Resume as Code" project demonstrating Separation of Concerns 
  and Single Source of Truth:

  1. Data Layer:    Career history stored as structured YAML
  2. Logic Layer:   Python engine for formatting rules
  3. Presentation:  Generates PDF, DOCX, Markdown, RTF formats

─────────────────────────────────────────────────────────────────────────────

  Type help to see available commands.

`.trim();

    return { banner, text };
  };

  return {
    getMotd,
  };
}

