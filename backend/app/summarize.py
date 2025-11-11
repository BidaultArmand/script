import os
from typing import List, Dict, Optional
from openai import OpenAI

# System prompts by language
SYSTEM_PROMPTS = {
    "en": {
        "structured": """You are an assistant that generates clear and actionable meeting summaries.
Return Markdown with:
## Executive Summary
## Key Decisions
## Action Items
## Risks / Blockers
## Open Questions
""",
        "bullet_points": """You are an assistant that generates concise meeting summaries in bullet point format.
Return a clear, organized bullet-point summary of the meeting highlighting key points, decisions, and action items.""",
        "paragraph": """You are an assistant that generates meeting summaries in paragraph form.
Write a coherent narrative summary of the meeting, covering key discussions, decisions, and outcomes.""",
        "action_items": """You are an assistant that extracts action items from meetings.
Return a focused list of action items with responsible parties and deadlines if mentioned."""
    },
    "fr": {
        "structured": """Tu es un assistant qui génère des comptes rendus de réunion clairs et actionnables.
Retourne du Markdown avec:
## Résumé exécutif
## Décisions clés
## Actions
## Risques / Bloqueurs
## Questions ouvertes
""",
        "bullet_points": """Tu es un assistant qui génère des résumés de réunion concis sous forme de points.
Retourne un résumé clair et organisé de la réunion en points, mettant en évidence les points clés, décisions et actions.""",
        "paragraph": """Tu es un assistant qui génère des résumés de réunion sous forme de paragraphes.
Écris un résumé narratif cohérent de la réunion, couvrant les discussions clés, décisions et résultats.""",
        "action_items": """Tu es un assistant qui extrait les actions à mener depuis les réunions.
Retourne une liste ciblée des actions avec les responsables et échéances si mentionnés."""
    }
}

# User prompts by language and detail level
USER_PROMPTS = {
    "en": {
        "brief": """From the following segments (with timestamps), generate a brief summary.
Focus on the most important information only.

Segments:
{segments}
""",
        "medium": """From the following segments (with timestamps), generate the requested summary.
Include key information, decisions, and action items with responsible parties if mentioned.

Segments:
{segments}
""",
        "detailed": """From the following segments (with timestamps), generate a comprehensive summary.
Include all relevant details, context, decisions, action items, discussion points, and any other important information.

Segments:
{segments}
"""
    },
    "fr": {
        "brief": """À partir des segments suivants (avec timestamps), génère un résumé bref.
Concentre-toi uniquement sur les informations les plus importantes.

Segments:
{segments}
""",
        "medium": """À partir des segments suivants (avec timestamps), génère le résumé demandé.
Conserve les infos clés, décisions, et actions avec responsables si mentionnés.

Segments:
{segments}
""",
        "detailed": """À partir des segments suivants (avec timestamps), génère un résumé complet.
Inclus tous les détails pertinents, contexte, décisions, actions, points de discussion et toute autre information importante.

Segments:
{segments}
"""
    }
}

def build_segments_md(segments: List[Dict], include_timestamps: bool = True) -> str:
    lines = []
    for s in segments:
        start = float(s["start_seconds"])
        end = float(s["end_seconds"])
        txt = s["text"]
        if include_timestamps:
            lines.append(f"- [{start:.1f}s–{end:.1f}s] {txt}")
        else:
            lines.append(f"- {txt}")
    return "\n".join(lines)

def chunk_segments(segments: List[Dict], max_chars: int = 20000) -> List[str]:
    """
    Split segments into chunks that fit within token limits.
    Each chunk will be around max_chars to stay under GPT token limits.
    Optimized for fewer chunks = lower API costs.
    """
    chunks = []
    current_chunk = []
    current_length = 0

    for seg in segments:
        seg_text = f"[{seg['start_seconds']:.1f}s–{seg['end_seconds']:.1f}s] {seg['text']}\n"
        seg_length = len(seg_text)

        if current_length + seg_length > max_chars and current_chunk:
            # Save current chunk and start new one
            chunks.append("".join(current_chunk))
            current_chunk = [seg_text]
            current_length = seg_length
        else:
            current_chunk.append(seg_text)
            current_length += seg_length

    # Add the last chunk
    if current_chunk:
        chunks.append("".join(current_chunk))

    return chunks


def summarize_chunk(client: OpenAI, chunk: str, system_prompt: str, user_prompt_template: str, chunk_index: int, total_chunks: int) -> str:
    """Summarize a single chunk of the meeting."""
    chunk_info = f"\n\n[This is part {chunk_index + 1} of {total_chunks} of the meeting]" if total_chunks > 1 else ""

    resp = client.chat.completions.create(
        model="gpt-4o-mini",  # Most cost-effective model
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt_template.format(segments=chunk) + chunk_info},
        ],
        temperature=0.2,
        max_tokens=1500 if total_chunks > 1 else 3000,  # Optimized for cost
    )
    return resp.choices[0].message.content


def combine_summaries(client: OpenAI, summaries: List[str], system_prompt: str, language: str) -> str:
    """Combine multiple chunk summaries into one coherent summary."""
    combine_prompt = {
        "en": """You are reviewing multiple partial summaries of a long meeting. Your task is to combine them into one comprehensive, coherent summary.

Merge the information, remove duplicates, and organize everything logically. Keep all important details, decisions, and action items.

Partial summaries:
{summaries}

Provide a complete, unified summary that preserves all important information.""",
        "fr": """Tu examines plusieurs résumés partiels d'une longue réunion. Ta tâche est de les combiner en un seul résumé complet et cohérent.

Fusionne les informations, élimine les doublons et organise tout de manière logique. Conserve tous les détails importants, décisions et actions.

Résumés partiels:
{summaries}

Fournis un résumé complet et unifié qui préserve toutes les informations importantes."""
    }

    lang = language if language in combine_prompt else "en"
    numbered_summaries = "\n\n".join([f"## Part {i+1}\n{s}" for i, s in enumerate(summaries)])

    resp = client.chat.completions.create(
        model="gpt-4o-mini",  # Most cost-effective model
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": combine_prompt[lang].format(summaries=numbered_summaries)},
        ],
        temperature=0.2,
        max_tokens=3000,  # Optimized for cost while preserving quality
    )
    return resp.choices[0].message.content


def summarize(
    segments: List[Dict],
    format: str = "structured",
    language: str = "en",
    detail_level: str = "medium",
    include_timestamps: bool = True
) -> str:
    """
    Generate a summary from meeting segments with user preferences.
    Handles long meetings by chunking and combining summaries.

    Args:
        segments: List of segment dictionaries with start_seconds, end_seconds, and text
        format: Summary format - 'structured', 'bullet_points', 'paragraph', 'action_items'
        language: Language code - 'en', 'fr', etc.
        detail_level: Level of detail - 'brief', 'medium', 'detailed'
        include_timestamps: Whether to include timestamps in segment listings

    Returns:
        str: The generated summary text
    """
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    # Get appropriate prompts, default to English if language not supported
    lang = language if language in SYSTEM_PROMPTS else "en"
    system_prompt = SYSTEM_PROMPTS[lang].get(format, SYSTEM_PROMPTS[lang]["structured"])
    user_prompt_template = USER_PROMPTS[lang].get(detail_level, USER_PROMPTS[lang]["medium"])

    seg_md = build_segments_md(segments, include_timestamps)

    # Check if content is too long and needs chunking
    # Using higher threshold (20k) to minimize API calls and reduce costs
    if len(seg_md) > 20000:
        print(f"Long meeting detected ({len(seg_md)} chars). Using chunking strategy...")

        # Split into chunks
        chunks = chunk_segments(segments, max_chars=20000)
        print(f"Split into {len(chunks)} chunks")

        # Summarize each chunk
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            print(f"Summarizing chunk {i+1}/{len(chunks)}...")
            summary = summarize_chunk(client, chunk, system_prompt, user_prompt_template, i, len(chunks))
            chunk_summaries.append(summary)

        # Combine all chunk summaries into final summary
        if len(chunk_summaries) > 1:
            print("Combining chunk summaries into final summary...")
            final_summary = combine_summaries(client, chunk_summaries, system_prompt, lang)
            return final_summary
        else:
            return chunk_summaries[0]
    else:
        # Short meeting - process normally in single API call (most cost-efficient)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",  # Most cost-effective model ($0.15/1M input, $0.60/1M output)
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt_template.format(segments=seg_md)},
            ],
            temperature=0.2,
            max_tokens=2500,  # Optimized: enough for detailed summary, lower cost
        )
        return resp.choices[0].message.content
