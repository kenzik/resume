/**
 * MOTD (Message of the Day) composable
 * Returns plain text terminal-style MOTD
 */

export function useMotd() {
  const getMotd = (): string => {
    return `
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
  };

  return {
    getMotd,
  };
}

