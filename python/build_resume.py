#!/usr/bin/env python3

import argparse
import sys
import os
import yaml
from dotenv import load_dotenv
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from fpdf import FPDF
from fpdf.enums import XPos, YPos


# --- UTILS ---
def clean_pdf(text):
    if not text:
        return ""
    replacements = {
        "\u2022": "-",
        "\u2013": "-",
        "\u2014": "--",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text.encode("latin-1", "replace").decode("latin-1")


def clean_rtf(text):
    if not text:
        return ""
    text = text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
    res = []
    for char in text:
        code = ord(char)
        if code < 128:
            res.append(char)
        else:
            res.append(f"\\u{code - 65536 if code > 32767 else code}?")
    return "".join(res)


def get_contact_string(reveal_pii):
    """
    Constructs the contact string from Env Vars.
    Default: Redacts City/Phone.
    --reveal-pii: Shows everything.
    """
    city = os.getenv("RESUME_CITY_STATE", "City, State")
    phone = os.getenv("RESUME_PHONE", "555-555-5555")
    email = os.getenv("RESUME_EMAIL", "email@example.com")
    linkedin = os.getenv("RESUME_LINKEDIN", "linkedin.com/in/user")

    parts = []

    if reveal_pii:
        parts.append(city)
        parts.append(phone)
    else:
        parts.append("[REDACTED LOC]")
        parts.append("[REDACTED TEL]")

    parts.append(email)
    parts.append(linkedin)

    return " | ".join(parts)


# --- RENDERERS ---


def render_docx(data, filename):
    print(f"[+] Generating DOCX -> {filename}...")
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    # Header
    h1 = doc.add_heading(data["header"]["name"], 0)
    h1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(data["header"]["contact"]).alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Sections
    doc.add_heading("PROFILE", level=1)
    doc.add_paragraph(data["profile"])

    doc.add_heading("CORE COMPETENCIES", level=1)
    doc.add_paragraph(" • ".join(data["skills"]))

    doc.add_heading("PROFESSIONAL EXPERIENCE", level=1)
    for job in data["experience"]:
        p = doc.add_paragraph()
        p.add_run(job["company"]).bold = True
        p.add_run(f" | {job['title']}").italic = True
        p.add_run(f"\n{job['date']}")

        if job.get("summary"):
            doc.add_paragraph(job["summary"])

        for section in job.get("sections", []):
            if section.get("title") and section["title"] not in [
                "Highlights",
                "Key Projects",
            ]:
                doc.add_paragraph(section["title"]).bold = True
            for bullet in section["bullets"]:
                doc.add_paragraph(bullet, style="List Bullet")

        if job.get("tech"):
            doc.add_paragraph(job["tech"]).italic = True
        doc.add_paragraph()

    doc.add_heading("EARLIER ROLES", level=1)
    for role in data["earlier"]:
        doc.add_paragraph(role)

    doc.add_heading("CERTIFICATIONS & EDUCATION", level=1)
    for cert in data["certs"]:
        p = doc.add_paragraph()
        p.add_run(cert).bold = "In Progress" in cert
    for edu in data["education"]:
        parts = edu.split("—")
        p = doc.add_paragraph()
        p.add_run(parts[0].strip() + " — ").bold = True
        if len(parts) > 1:
            p.add_run(parts[1].strip())

    doc.save(filename)


def render_md(data, filename):
    print(f"[+] Generating MD -> {filename}...")
    try:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"# {data['header']['name']}\n\n")
            f.write(f"**{data['header']['contact']}**\n\n")
            f.write(f"## PROFILE\n\n{data['profile']}\n\n")
            f.write(f"## CORE COMPETENCIES\n\n" + " • ".join(data["skills"]) + "\n\n")
            f.write("## PROFESSIONAL EXPERIENCE\n\n")
            for job in data["experience"]:
                f.write(
                    f"### {job['company']} | *{job['title']}*\n**{job['date']}**\n\n"
                )
                if job.get("summary"):
                    f.write(f"{job['summary']}\n\n")
                for section in job.get("sections", []):
                    if section.get("title") and section["title"] not in [
                        "Highlights",
                        "Key Projects",
                    ]:
                        f.write(f"**{section['title']}**\n")
                    for bullet in section["bullets"]:
                        f.write(f"* {bullet}\n")
                    f.write("\n")
                if job.get("tech"):
                    f.write(f"*{job['tech']}*\n\n")
                f.write("---\n\n")
            f.write("## EARLIER ROLES\n\n")
            for role in data["earlier"]:
                f.write(f"* {role}\n")
            f.write("\n## CERTIFICATIONS & EDUCATION\n\n")
            for c in data["certs"]:
                f.write(f"* **{c}**\n")
            for e in data["education"]:
                parts = e.split("—")
                f.write(
                    f"* **{parts[0].strip()}**"
                    + (f" — {parts[1].strip()}\n" if len(parts) > 1 else "\n")
                )
    except Exception as e:
        print(f"FAILED to write Markdown: {e}")
        raise e


def render_pdf(data, filename):
    print(f"[+] Generating PDF -> {filename}...")

    class PDF(FPDF):
        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "I", 8)
            self.cell(0, 10, f"Page {self.page_no()}", align="C")

    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    width = pdf.epw

    # --- HEADER ---
    pdf.set_font("Helvetica", "B", 24)
    pdf.cell(
        width,
        10,
        clean_pdf(data["header"]["name"]),
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
        align="C",
    )
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(
        width,
        10,
        clean_pdf(data["header"]["contact"]),
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
        align="C",
    )
    pdf.ln(5)

    # --- SECTIONS ---
    sections = [
        ("PROFILE", "text", data["profile"]),
        ("CORE COMPETENCIES", "text", " - ".join(data["skills"])),
    ]

    for title, mode, content in sections:
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(220, 220, 220)
        pdf.cell(width, 8, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT, fill=False)
        pdf.ln(2)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(width, 5, clean_pdf(content))
        pdf.ln(4)

    # --- EXPERIENCE ---
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(width, 8, "PROFESSIONAL EXPERIENCE", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)

    for job in data["experience"]:
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(
            width,
            6,
            clean_pdf(f"{job['company']} | {job['title']}"),
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
        )
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(width, 5, clean_pdf(job["date"]), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(2)

        if job.get("summary"):
            pdf.multi_cell(width, 5, clean_pdf(job["summary"]))
            pdf.ln(2)

        for section in job.get("sections", []):
            if section.get("title") and section["title"] not in [
                "Highlights",
                "Key Projects",
            ]:
                pdf.set_font("Helvetica", "B", 10)
                pdf.cell(
                    width,
                    6,
                    clean_pdf(section["title"]),
                    new_x=XPos.LMARGIN,
                    new_y=YPos.NEXT,
                )
            pdf.set_font("Helvetica", "", 10)
            for bullet in section["bullets"]:
                pdf.set_x(pdf.l_margin + 2)
                pdf.multi_cell(width - 2, 5, f"- {clean_pdf(bullet)}")
            pdf.ln(2)

        if job.get("tech"):
            pdf.set_font("Helvetica", "I", 9)
            pdf.multi_cell(width, 5, clean_pdf(job["tech"]))
        pdf.ln(4)

    # --- TAIL SECTIONS ---
    if pdf.get_y() > 250:
        pdf.add_page()
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(width, 8, "EARLIER ROLES", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)
    for role in data["earlier"]:
        pdf.multi_cell(width, 5, clean_pdf(role))
    pdf.ln(4)

    if pdf.get_y() > 250:
        pdf.add_page()
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(
        width, 8, "CERTIFICATIONS & EDUCATION", new_x=XPos.LMARGIN, new_y=YPos.NEXT
    )
    pdf.ln(2)
    for item in data["certs"] + data["education"]:
        is_bold = "In Progress" in item or "University" in item
        pdf.set_font("Helvetica", "B" if is_bold else "", 10)
        pdf.multi_cell(width, 6, clean_pdf(item))

    pdf.output(filename)


def render_rtf(data, filename):
    print(f"[+] Generating RTF -> {filename}...")
    rtf = [
        r"{\rtf1\ansi\deff0{\fonttbl{\f0 Arial;}}\viewkind4\uc1\pard\sa200\sl276\slmult1\lang9\f0\fs22"
    ]

    def line(txt, bold=False, italic=False, ul=False):
        fmt = r"\par"
        if bold:
            fmt = r"\b " + fmt + r"\b0"
        if italic:
            fmt = r"\i " + fmt + r"\i0"
        if ul:
            fmt = r"\ul " + fmt + r"\ulnone"
        rtf.append(
            r"\pard\sa200\sl276\slmult1 "
            + fmt.replace(r"\par", clean_rtf(txt) + r"\par")
        )

    # Header
    rtf.append(r"\qc\b\fs32 " + clean_rtf(data["header"]["name"]) + r"\par")
    rtf.append(r"\fs22\b0 " + clean_rtf(data["header"]["contact"]) + r"\par\par")

    line("PROFILE", bold=True, ul=True)
    line(data["profile"])
    line("CORE COMPETENCIES", bold=True, ul=True)
    line(" \u8226? ".join(data["skills"]))

    line("PROFESSIONAL EXPERIENCE", bold=True, ul=True)
    for job in data["experience"]:
        rtf.append(
            r"\pard\sa200\sl276\slmult1\b "
            + clean_rtf(job["company"])
            + r"\b0  | \i "
            + clean_rtf(job["title"])
            + r"\i0\par"
        )
        line(job["date"])
        if job.get("summary"):
            line(job["summary"])
        for section in job.get("sections", []):
            if section.get("title") and section["title"] not in [
                "Highlights",
                "Key Projects",
            ]:
                line(section["title"], bold=True)
            for bullet in section["bullets"]:
                rtf.append(
                    r"\pard\sa200\sl276\slmult1\tx360\li360\fi-360 \u8226? \tab "
                    + clean_rtf(bullet)
                    + r"\par"
                )
        if job.get("tech"):
            line(job["tech"], italic=True)
        else:
            rtf.append(r"\par")

    line("EARLIER ROLES", bold=True, ul=True)
    for role in data["earlier"]:
        rtf.append(
            r"\pard\sa200\sl276\slmult1\tx360\li360\fi-360 \u8226? \tab "
            + clean_rtf(role)
            + r"\par"
        )

    line("CERTIFICATIONS & EDUCATION", bold=True, ul=True)
    for item in data["certs"] + data["education"]:
        bold = "In Progress" in item or "University" in item
        txt = clean_rtf(item)
        if bold:
            txt = r"\b " + txt + r"\b0"
        rtf.append(
            r"\pard\sa200\sl276\slmult1\tx360\li360\fi-360 \u8226? \tab "
            + txt
            + r"\par"
        )

    rtf.append("}")
    with open(filename, "w", encoding="utf-8") as f:
        f.write("\n".join(rtf))


# --- MAIN EXECUTION ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate Resume from YAML in multiple formats."
    )
    parser.add_argument(
        "--format",
        choices=["docx", "pdf", "md", "rtf", "all"],
        default="docx",
        help="Output format(s)",
    )
    parser.add_argument("--name", default="Resume", help="Output filename base")
    parser.add_argument("--source", default="resume.yml", help="Source YAML file")
    parser.add_argument(
        "--reveal-pii", action="store_true", help="Reveal PII (Phone/City) in output"
    )

    # 1. CHECK ARGS: If none provided, print help and exit
    if len(sys.argv) == 1:
        parser.print_help()
        print("\n[-] Note: No arguments provided. Usage examples:")
        print("    python build_resume.py --format all")
        print("    python build_resume.py --format pdf --reveal-pii")
        sys.exit(0)

    args = parser.parse_args()

    # 2. CHECK ENV: Look for .env.local or .env
    env_local = ".env.local"
    env_default = ".env"
    env_loaded = False

    if os.path.exists(env_local):
        load_dotenv(env_local, override=True)
        print(f"[+] Loaded configuration from {env_local}")
        env_loaded = True
    elif os.path.exists(env_default):
        load_dotenv(env_default)
        print(f"[+] Loaded configuration from {env_default}")
        env_loaded = True
    else:
        print(f"[-] Warning: No {env_local} or {env_default} found.")
        print("    PII (Name, Phone, etc.) will use system defaults or be redacted.")

    # 3. LOAD YAML
    if not os.path.exists(args.source):
        sys.exit(f"[!] Error: Source file '{args.source}' not found.")

    try:
        with open(args.source, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        sys.exit(f"[!] Error parsing YAML: {e}")

    # 4. INJECT HEADER (Combine Env + Args)
    data["header"] = {
        "name": os.getenv("RESUME_NAME", "Your Name"),
        "contact": get_contact_string(args.reveal_pii),
    }

    # 5. RENDER
    try:
        if args.format in ["docx", "all"]:
            render_docx(data, f"{args.name}.docx")
        if args.format in ["md", "all"]:
            render_md(data, f"{args.name}.md")
        if args.format in ["pdf", "all"]:
            render_pdf(data, f"{args.name}.pdf")
        if args.format in ["rtf", "all"]:
            render_rtf(data, f"{args.name}.rtf")
        print("[+] Done.")
    except Exception as e:
        print(f"[!] Unexpected error during generation: {e}")
