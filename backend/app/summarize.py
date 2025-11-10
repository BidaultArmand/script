import os
from typing import List, Dict
from openai import OpenAI

SYSTEM = """Tu es un assistant qui génère des comptes rendus de réunion clairs et actionnables.
Retourne du Markdown avec:
## Résumé exécutif
## Décisions
## Actions
## Risques / Bloqueurs
## Questions ouvertes
"""

PROMPT = """À partir des segments suivants (avec timestamps), génère le compte rendu structuré demandé.
Conserve les infos clés, décisions, et actions avec responsables si mentionnés.

Segments:
{segments}
"""

def build_segments_md(segments: List[Dict]) -> str:
    lines = []
    for s in segments:
        start = float(s["start_seconds"])
        end = float(s["end_seconds"])
        txt = s["text"]
        lines.append(f"- [{start:.1f}s–{end:.1f}s] {txt}")
    return "\n".join(lines)

def summarize(segments: List[Dict]) -> str:
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    seg_md = build_segments_md(segments)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": PROMPT.format(segments=seg_md[:15000])},
        ],
        temperature=0.2,
    )
    return resp.choices[0].message.content
