# Hi. I'm Dave. 👋

**Cloud-Native Architect | AI Infrastructure & Strategy | Full-Stack Engineer | Senior Technical Leader**

[![LinkedIn](https://img.shields.io/badge/Connect-LinkedIn-blue?style=flat&logo=linkedin)](https://linkedin.com/in/kenzik)
[![Email](https://img.shields.io/badge/Email-Me-red?style=flat&logo=gmail)](mailto:david@kenzik.com)
[![Website](https://img.shields.io/badge/View-Live%20Site-purple?style=flat&logo=vercel)](https://kenzik.com)
[![Status](https://img.shields.io/badge/Status-Open%20to%20Work-green?style=flat)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 🚀 The Elevator Pitch

I'm a Senior Technologist with over **25 years of experience** bridging executive business strategy and deep-tech engineering. My career has spanned roles from **Founder/CTO** to **Senior Principal Architect** across companies of all sizes, including Fortune 50 enterprises.

Currently, I'm pivoting deeper into **AI/ML Infrastructure**—I don't just want to *use* models; I want to architect the high-performance compute, RAG pipelines, and scalable cloud systems that power them.

I'm actively pursuing **NVIDIA architecture certifications** while looking for future opportunities/connections that sit at the intersection of **High-Performance Computing (HPC), Cloud-Native Infrastructure, and Applied AI**.

---

## 📄 Resume as Code

So, why build a repository for a resume? Why not just use Word?

As an architect, I believe in **Separation of Concerns** and **Single Source of Truth**. Maintaining multiple versions of a document manually is an anti-pattern. Every time I need a PDF, a DOCX for a recruiter's ATS, or an updated website—they should all derive from the same canonical source.

This project demonstrates how I approach even simple problems with engineering rigor:

```
resume/
├── data/                    # 📊 DATA LAYER - Single Source of Truth
│   ├── kenzik.yml           #    My actual resume data (.gitignored-ed and provided as a secret in pipelines.)
│   └── example.yml          #    Template for others to use
│
├── python/                  # ⚙️  LOGIC LAYER - Document Generation
│   ├── build_resume.py      #    Generates PDF, DOCX, MD, RTF
│   └── requirements.txt     #    Python dependencies
│
├── games/                   # 🎮 ...nothing to see here, move along
│
└── web/                     # 🖥️  PRESENTATION LAYER - Interactive Website
    ├── src/                 #    Vue 3 + Quasar + TypeScript
    └── public/downloads/    #    Pre-built downloadable files
```

### The Philosophy

| Principle | Implementation |
|:---|:---|
| **Single Source of Truth** | One YAML file feeds both the Python generator AND the web app |
| **Separation of Concerns** | Data (YAML) → Logic (Python/Vue) → Presentation (PDF/Web) |
| **Reproducibility** | Anyone can clone, edit data, and generate their own resume |
| **Version Control** | Career history is tracked like code—diff your growth over time |

---

## 🖥️ The Terminal Website

My interactive resume lives at **[kenzik.com](https://kenzik.com)** — but it's not your typical portfolio site.

It's a **terminal emulator** that lets you explore my resume with Unix-like commands:

```bash
$ help              # Available commands
$ resume            # View full resume  
$ skills            # List technical skills
$ experience google # Filter by company name
$ resume | grep AI  # Pipe and filter like a real terminal
$ resume | more     # Page through long output
$ download pdf      # Download resume as PDF
$ theme dark        # Switch color themes
$ font "JetBrains Mono"  # Change terminal font
```

**Features:**
- 🎨 **Theme System** — Auto-detects system preference, persists choice
- ⌨️ **Typewriter Effect** — Authentic terminal feel with animation
- 📦 **Command Pipeline** — Real pipe support (`grep`, `head`, `tail`, `more`)
- 🔤 **Font Switcher** — Multiple monospace fonts to choose from
- 📥 **Downloads** — PDF, DOCX, MD, RTF exports

The source code is in [`./web`](./web/) with its own [README](./web/README.md).

---

## 🛠️ Using This Repository

Want to use this for your own resume? Here's how:

### Option 1: Just Generate Documents (Python)

```bash
# Clone the repo
git clone https://github.com/kenzik/resume.git && cd resume

# Copy and edit the example data
cp data/example.yml data/yourname.yml
# Edit data/yourname.yml with your information

# Install Python dependencies
cd python
pip install -r requirements.txt

# Set your contact info (create .env.local in python/)
cat > .env.local << EOF
RESUME_NAME="Your Name"
RESUME_EMAIL="you@example.com"
RESUME_PHONE="555-555-5555"
RESUME_CITY_STATE="City, State"
RESUME_LINKEDIN="linkedin.com/in/yourprofile"
EOF

# Generate all formats
python build_resume.py --source ../data/yourname.yml --format all

# Or generate with revealed contact info
python build_resume.py --source ../data/yourname.yml --format pdf --reveal-pii
```

**Output formats:** `PDF`, `DOCX`, `MD`, `RTF`

### Option 2: Run the Full Web App

```bash
# From the repo root
cd web

# Install dependencies
yarn install  # or npm install

# Start development server
yarn dev      # Opens at http://localhost:9000

# Build for production
yarn build    # Output in dist/spa/
```

The web app automatically reads from `data/kenzik.yml` during the build. You'll need to change this.

### Data Schema

Your YAML file should follow this structure:

```yaml
web:
  motd: |
    # Your welcome message (Markdown supported)
    Type `help` for available commands.

resume:
  profile: >
    Your professional summary here.
  
  skills:
    - "Skill 1"
    - "Skill 2"
  
  experience:
    - company: "Company Name"
      title: "Your Title"
      date: "Start - End"
      summary: Optional summary
      sections:
        - title: "Project or Focus Area"
          bullets:
            - "Achievement 1"
            - "Achievement 2"
      tech: "Tech stack used"
  
  earlier:
    - "Previous Role — Company (Years)"
  
  certs:
    - "Certification Name"
  
  education:
    - "University — Degree"
```

See [`data/example.yml`](./data/example.yml) for a complete template.

---

## 🏗️ Technical Stack

| Layer | Technology |
|:---|:---|
| **Data** | YAML (structured, version-controlled) |
| **Document Gen** | Python 3, fpdf2, python-docx, PyYAML |
| **Web Framework** | Vue 3, Quasar Framework, TypeScript |
| **Styling** | SCSS, CSS Custom Properties (theming) |
| **Build** | Vite, Quasar CLI |

---

## 📝 Notes

- **Privacy:** Contact details (phone, city) are redacted by default in generated documents. Use `--reveal-pii` to include them, or set environment variables.
- **Fonts:** The web app uses [JuliaMono](https://juliamono.netlify.app/) and supports multiple monospace fonts.
- **Deployment:** The site is deployed to Cloudflare Pages. See `web/public/_headers` and `_redirects` for config.

---

## 📬 Get In Touch

If you're working on interesting problems in AI infrastructure, cloud-native systems, or need a senior technical leader—let's talk.

**[LinkedIn](https://linkedin.com/in/kenzik)** · **[Email](mailto:david@kenzik.com)** · **[kenzik.com](https://kenzik.com)**

---

<sub>**Resume as Code** - Because `resume_final_v3_FINAL(2).docx` is an anti-pattern.</sub>
