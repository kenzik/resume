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
${ANSI.cyan}╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║  ${ANSI.bright}${ANSI.green}${paddedArt[0]}${ANSI.reset}${ANSI.cyan} ║
║  ${ANSI.bright}${ANSI.green}${paddedArt[1]}${ANSI.reset}${ANSI.cyan} ║
║  ${ANSI.bright}${ANSI.green}${paddedArt[2]}${ANSI.reset}${ANSI.cyan} ║
║  ${ANSI.bright}${ANSI.green}${paddedArt[3]}${ANSI.reset}${ANSI.cyan} ║
║  ${ANSI.bright}${ANSI.green}${paddedArt[4]}${ANSI.reset}${ANSI.cyan} ║
║  ${ANSI.bright}${ANSI.green}${paddedArt[5]}${ANSI.reset}${ANSI.cyan} ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝${ANSI.reset}
`.trim();

    const text = `
${ANSI.bright}${ANSI.cyan}Hi. I'm Dave.${ANSI.reset}

${ANSI.yellow}Cloud-Native Architect | AI Infrastructure & Strategy | Full-Stack Engineer | Senior Technical Leader${ANSI.reset}

${ANSI.dim}─────────────────────────────────────────────────────────────────────────────${ANSI.reset}

${ANSI.bright}About Me:${ANSI.reset}

  Senior Technologist with ${ANSI.green}25+ years of experience${ANSI.reset} bridging executive business 
  strategy and deep-tech engineering. Career spans from ${ANSI.cyan}Founder/CTO${ANSI.reset} to 
  ${ANSI.cyan}Senior Principal Architect${ANSI.reset}, including work with Fortune 50 enterprises.

  Currently pivoting deeper into ${ANSI.magenta}AI/ML Infrastructure${ANSI.reset}—architecting 
  high-performance compute, RAG pipelines, and scalable cloud systems that power AI models.

  Actively pursuing ${ANSI.yellow}NVIDIA architecture certifications${ANSI.reset} and seeking roles 
  at the intersection of ${ANSI.cyan}High-Performance Computing (HPC), Cloud-Native Infrastructure, 
  and Applied AI${ANSI.reset}.

${ANSI.dim}─────────────────────────────────────────────────────────────────────────────${ANSI.reset}

${ANSI.bright}Technical Arsenal:${ANSI.reset}

  ${ANSI.magenta}AI & ML:${ANSI.reset}        LangChain, RAG, Vertex AI, Pinecone, Redis Vector, Prompt Engineering
  ${ANSI.blue}Cloud & Infra:${ANSI.reset}     Google Cloud Platform (GCP), Terraform (IaC), Docker
  ${ANSI.cyan}High Scale:${ANSI.reset}        Redis Streams/Cluster, WebSockets, Distributed Systems
  ${ANSI.green}Languages:${ANSI.reset}        Python, TypeScript, Node.js, Go, Bash
  ${ANSI.yellow}Leadership:${ANSI.reset}      Solution Architecture, Technical Strategy, Team Mentorship

${ANSI.dim}─────────────────────────────────────────────────────────────────────────────${ANSI.reset}

${ANSI.bright}About This Resume:${ANSI.reset}

  This is a "Resume as Code" project demonstrating ${ANSI.cyan}Separation of Concerns${ANSI.reset} 
  and ${ANSI.cyan}Single Source of Truth${ANSI.reset}:

  1. ${ANSI.green}Data Layer:${ANSI.reset}    Career history stored as structured YAML
  2. ${ANSI.green}Logic Layer:${ANSI.reset}   Python engine for formatting rules
  3. ${ANSI.green}Presentation:${ANSI.reset}  Generates PDF, DOCX, Markdown, RTF formats

${ANSI.dim}─────────────────────────────────────────────────────────────────────────────${ANSI.reset}

  Type ${ANSI.bright}${ANSI.green}help${ANSI.reset} to see available commands.

`.trim();

    return { banner, text };
  };

  return {
    getMotd,
  };
}

