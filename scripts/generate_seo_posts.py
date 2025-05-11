"""
scripts/generate_seo_posts.py

Automates creation of SEO-optimized Hugo Markdown posts for the Poo Colour Decoder.
Updated for OpenAI v1+ SDK.
"""

import os
import datetime
import pathlib
import textwrap
import slugify
import openai

# 1) Setup OpenAI client (new style)
client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OUTPUT_DIR = pathlib.Path("content/posts")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 2) Target topics
TOPICS = [
    
    "Why can i see food in my poo?"
]

# 3) Helper to build a slug and filename
def make_filename(title: str, date: datetime.date) -> pathlib.Path:
    slug = slugify.slugify(title)
    filename = f"{slug}-{date.isoformat()}.md"
    return OUTPUT_DIR / filename

# 4) Prompt template
POST_PROMPT = textwrap.dedent("""
  You are a medical content writer and SEO specialist.
  Write a **Markdown** blog post for Hugo with the following:
  1. Front matter at the top:
     ```
     ---
     title: "{title}"
     date: {date_iso}
     draft: false
     summary: "{summary}"
     ---
     ```
  2. Body structure:
     # {title}
     **TL;DR**: 2–3 sentences.
     ## Overview
     Short intro with keyword.
     ## {h2_1}
     - Expand into H3 subsections.
     ## {h2_2}
     - Advice, tips, or warning signs.
     ## Related Posts
     - List the related topics.
     ## Try It Yourself
     - Call to action: “Try our free poo colour decoder!”

  Notes:
  - Use the exact title.
  - Insert keyword in H1, first paragraph, and in each H2.
  - 500–800 words total.
""").strip()

# 5) Generate one post
def generate_post(title: str, related: list[str]) -> None:
    today = datetime.date.today()
    date_iso = today.isoformat() + "T00:00:00Z"

    # Get short summary
    summary_prompt = f"Write a 20-word SEO-focused summary for a blog post titled: {title}"
    summary_resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "user", "content": summary_prompt}
        ]
    )
    summary = summary_resp.choices[0].message.content.strip().replace('"', "'")[:140]

    # Build related links
    related_md = "\n".join(f"- [{r}](/posts/{slugify.slugify(r)})" for r in related)

    # Format full blog post prompt
    prompt = POST_PROMPT.format(
        title=title,
        date_iso=date_iso,
        summary=summary,
        h2_1="Key Causes",
        h2_2="When to Seek Help"
    )

    # Get full markdown blog post
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    md_content = resp.choices[0].message.content.strip()

    # Insert related posts properly
    md_content = md_content.replace(
        "## Related Posts\n",
        f"## Related Posts\n{related_md}\n\n"
    )

    # Save to file
    output_path = make_filename(title, today)
    with open(output_path, "w") as f:
        f.write(md_content + "\n")
    print(f"✅ Created {output_path}")

# 6) Main loop
def main():
    for i, topic in enumerate(TOPICS):
        related = [t for t in TOPICS if t != topic]
        generate_post(topic, related)

if __name__ == "__main__":
    if os.getenv("OPENAI_API_KEY") is None:
        raise RuntimeError("Please set OPENAI_API_KEY in your environment")
    main()