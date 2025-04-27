import openai
import datetime
import pathlib
import random
import textwrap
import os
import slugify

openai.api_key = os.getenv("OPENAI_API_KEY")

topics = [
    "beetroot and red stool",
    "iron tablets",
    "leafy greens",
    "gut transit time",
    "bile salts",
    "antibiotics effect",
    "charcoal tablets",
    "Peppermint oil",
    "blue food colouring"
]

topic = random.choice(topics)
today = datetime.date.today()

prompt = (
    f"Write a friendly 120-word fun fact explaining how {topic} "
    f"affects stool colour. No medical advice, no disclaimers."
)

response = openai.ChatCompletion.create(
    model="gpt-4.1-mini",
    messages=[{"role": "user", "content": prompt}]
)

tip = response.choices[0].message.content.strip()

slug = slugify.slugify(topic) + "-" + today.isoformat()
folder = pathlib.Path("content/posts")
folder.mkdir(parents=True, exist_ok=True)
path = folder / f"{slug}.md"

path.write_text(textwrap.dedent(f"""\
---
title: "{topic.title()}"
date: {today}
draft: false
---

{tip}

**. Not medical advice.*
"""))

print("Created", path)