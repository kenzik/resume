# Hi. I'm Dave. 👋

### Cloud-Native Architect | AI Infrastructure & Strategy | Full-Stack Engineer | Senior Technical Leader

[![LinkedIn](https://img.shields.io/badge/Connect-LinkedIn-blue?style=flat&logo=linkedin)]([https://linkedin.com/in/kenzik])
[![Email](https://img.shields.io/badge/Email-Me-red?style=flat&logo=gmail)](mailto:[david@kenzik.com])
[![Status](https://img.shields.io/badge/Status-Open%20to%20Work-green?style=flat)]()

---

## 🚀 The Elevator Pitch

I am a Senior Technologist with over **25 years of experience** bridging the gap between executive business strategy and deep-tech engineering. My career has spanned roles from **Founder/CTO** to **Senior Principal Architect** for all size companies, including my recent position working with Fortune 50 enterprises.

Currently, I am pivoting deeper into the **AI/ML Infrastructure** space. I don't just want to *use* models; I want to architect the high-performance compute, RAG pipelines, and scalable cloud systems that power them.

I am actively pursuing **NVIDIA architecture certifications** and am looking for roles that sit at the intersection of **High-Performance Computing (HPC), Cloud-Native Infrastructure, and Applied AI**.

---

## 🛠 Technical Arsenal

| Domain | Stack |
| :--- | :--- |
| **AI & ML** | LangChain, RAG, Vertex AI, Pinecone, Redis Vector, Prompt Engineering |
| **Cloud & Infra** | Google Cloud Platform (GCP), Terraform (IaC), Docker |
| **High Scale** | Redis Streams/Cluster, WebSockets, Distributed Systems (Sub-20ms latency at scale) |
| **Languages** | Python, TypeScript, Node.js, Go, Bash |
| **Leadership** | Solution Architecture, Technical Strategy, Team Mentorship, Agile/Scrum |

---

## 📄 About This Repository: "Resume as Code"

You might be wondering why I wrote a Python script (and soon a website) to generate my resume instead of just using Word.

As an architect, I believe in **Separation of Concerns** and **Single Source of Truth**. Maintaining multiple versions of a document manually is an anti-pattern. Plus, I haven't used Python in a while (I'm a polyglot.)

This repository demonstrates my approach to a simple engineering problem:

1.  **Data Layer (`resume.yml`):** My career history is stored as structured data. It is version-controlled, readable, and agnostic of the presentation layer.
2.  **Logic Layer (`build_resume.py`):** A Python engine that ingests the data and handles the specific formatting rules for different outputs.
3.  **Presentation Layer:** The script generates consistent artifacts in **PDF**, **DOCX**, **Markdown**, and **RTF** formats automatically.

### How to Build My Resume

If you'd like to see the code in action:

```bash
# 1. Clone the repo
git clone https://github.com/kenzik/resume.git 
# or git clone git://github.com/kenzik/resume.git

# 2. Change into the python folder
cd python

# 3. Install dependencies (fpdf2, python-docx, PyYAML)
pip install -r requirements.txt

# 3. Build all formats (PDF, DOCX, MD, RTF)
python build_resume.py --format all
```

Some of my contact details are redacted from this, but you'll get the point (if you are looking at this then you probably already know me.)

When I generate a PDF or DOCX for any opportunity and distribute outside of this repo, it will indeed have my full contact information.

Have a nice day. 😄
