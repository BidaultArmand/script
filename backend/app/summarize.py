import os
from typing import List, Dict, Optional
from openai import OpenAI

# System prompts by language - ADAPTIVE STRUCTURE
SYSTEM_PROMPTS = {
    "en": {
        "structured": """You are an expert at analyzing and summarizing meetings. Your task is to:

1. ANALYZE the meeting content and flow
2. DETERMINE the most appropriate structure based on:
   - Meeting type (brainstorming, decision-making, status update, planning, review, etc.)
   - Key themes and topics discussed
   - Natural flow of conversation
   - What information is most important

3. CREATE a summary with a DYNAMIC structure that fits the content

Guidelines:
- Choose section headings that reflect actual meeting content
- Don't force information into predetermined categories
- Use appropriate sections like: Overview, Context, Main Discussion Points, Decisions Made, Next Steps, Technical Details, Ideas Generated, Concerns Raised, Timeline, etc.
- Organize information in the way that makes most sense for THIS specific meeting
- Be flexible - some meetings need 3 sections, others need 7
- Return well-formatted Markdown with clear headings

Example structures (adapt as needed):
- For brainstorming: Context, Ideas Generated, Top Candidates, Next Steps
- For technical review: Overview, Technical Issues, Solutions Proposed, Implementation Plan
- For planning: Objectives, Discussion Points, Decisions, Timeline, Responsibilities
- For status update: Progress Summary, Completed Items, Blockers, Upcoming Work""",
        "bullet_points": """You are an assistant that generates concise meeting summaries in bullet point format.
Analyze the meeting and organize bullet points in a way that reflects the natural flow and topics discussed.
Create sections based on actual content, not predetermined categories.""",
        "paragraph": """You are an assistant that generates meeting summaries in paragraph form.
Write a coherent narrative that follows the natural flow of the meeting, organizing information logically based on the actual discussion.""",
        "action_items": """You are an assistant that extracts action items from meetings.
Return a focused list of action items with responsible parties and deadlines if mentioned."""
    },
    "fr": {
        "structured": """Tu es un expert en analyse et résumé de réunions. Ta tâche est de:

1. ANALYSER le contenu et le déroulement de la réunion
2. DÉTERMINER la structure la plus appropriée basée sur:
   - Type de réunion (brainstorming, prise de décision, point d'étape, planification, revue, etc.)
   - Thèmes et sujets clés abordés
   - Flux naturel de la conversation
   - Quelles informations sont les plus importantes

3. CRÉER un résumé avec une STRUCTURE DYNAMIQUE qui correspond au contenu

Directives:
- Choisis des titres de sections qui reflètent le contenu réel de la réunion
- Ne force pas l'information dans des catégories prédéterminées
- Utilise des sections appropriées comme: Vue d'ensemble, Contexte, Points de discussion, Décisions prises, Prochaines étapes, Détails techniques, Idées générées, Préoccupations soulevées, Chronologie, etc.
- Organise l'information de la manière la plus logique pour CETTE réunion spécifique
- Sois flexible - certaines réunions nécessitent 3 sections, d'autres 7
- Retourne du Markdown bien formaté avec des titres clairs

Exemples de structures (à adapter selon le besoin):
- Pour un brainstorming: Contexte, Idées générées, Meilleures options, Prochaines étapes
- Pour une revue technique: Aperçu, Problèmes techniques, Solutions proposées, Plan d'implémentation
- Pour de la planification: Objectifs, Points de discussion, Décisions, Calendrier, Responsabilités
- Pour un point d'étape: Résumé des progrès, Éléments complétés, Blocages, Travail à venir""",
        "bullet_points": """Tu es un assistant qui génère des résumés de réunion concis sous forme de points.
Analyse la réunion et organise les points de manière à refléter le flux naturel et les sujets abordés.
Crée des sections basées sur le contenu réel, pas sur des catégories prédéterminées.""",
        "paragraph": """Tu es un assistant qui génère des résumés de réunion sous forme de paragraphes.
Écris un récit cohérent qui suit le flux naturel de la réunion, en organisant l'information logiquement selon la discussion réelle.""",
        "action_items": """Tu es un assistant qui extrait les actions à mendre depuis les réunions.
Retourne une liste ciblée des actions avec les responsables et échéances si mentionnés."""
    }
}

# User prompts by language and detail level - ADAPTIVE
USER_PROMPTS = {
    "en": {
        "brief": """Analyze the following meeting transcript and create a concise summary.

First, identify:
- Meeting type/purpose
- Main topics discussed

Then create a brief summary with a structure that naturally fits the content.
Focus only on the most critical information.

Transcript:
{segments}
""",
        "medium": """Analyze the following meeting transcript and create a well-structured summary.

First, understand:
- Meeting type (brainstorming, decision-making, planning, review, etc.)
- Key themes and flow
- Most important outcomes

Then create a summary with sections that logically organize the content.
Include key information, decisions, and action items with responsible parties if mentioned.

Transcript:
{segments}
""",
        "detailed": """Analyze the following meeting transcript and create a comprehensive, well-organized summary.

First, thoroughly understand:
- Meeting type and context
- All major topics and themes
- Natural flow and transitions
- Critical decisions and outcomes

Then create a detailed summary with a dynamic structure that best represents the meeting.
Include all relevant details, context, decisions, action items, discussion points, concerns, ideas, and any other important information.
Organize sections in a way that makes the content easy to navigate and understand.

Transcript:
{segments}
"""
    },
    "fr": {
        "brief": """Analyse la transcription de réunion suivante et crée un résumé concis.

D'abord, identifie:
- Type/objectif de la réunion
- Principaux sujets abordés

Ensuite crée un résumé bref avec une structure qui correspond naturellement au contenu.
Concentre-toi uniquement sur les informations les plus critiques.

Transcription:
{segments}
""",
        "medium": """Analyse la transcription de réunion suivante et crée un résumé bien structuré.

D'abord, comprends:
- Type de réunion (brainstorming, prise de décision, planification, revue, etc.)
- Thèmes clés et déroulement
- Résultats les plus importants

Ensuite crée un résumé avec des sections qui organisent logiquement le contenu.
Inclus les infos clés, décisions, et actions avec responsables si mentionnés.

Transcription:
{segments}
""",
        "detailed": """Analyse la transcription de réunion suivante et crée un résumé complet et bien organisé.

D'abord, comprends en profondeur:
- Type et contexte de la réunion
- Tous les sujets et thèmes majeurs
- Flux naturel et transitions
- Décisions et résultats critiques

Ensuite crée un résumé détaillé avec une structure dynamique qui représente au mieux la réunion.
Inclus tous les détails pertinents, contexte, décisions, actions, points de discussion, préoccupations, idées, et toute autre information importante.
Organise les sections de manière à rendre le contenu facile à naviguer et comprendre.

Transcription:
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
    """Combine multiple chunk summaries into one coherent summary with adaptive structure."""
    combine_prompt = {
        "en": """You are reviewing multiple partial summaries of a long meeting. Your task is to combine them into one comprehensive, coherent summary.

IMPORTANT: Analyze the content of all partial summaries to:
1. Identify the overall meeting type and themes
2. Determine the best structure for the complete summary
3. Create an ADAPTIVE structure that fits the actual content (not a fixed template)

Then:
- Merge the information intelligently
- Remove duplicates and redundancies
- Organize everything using section headings that reflect the actual topics and flow
- Keep all important details, decisions, and action items
- Use a structure that makes sense for THIS specific meeting

Partial summaries:
{summaries}

Provide a complete, unified summary with a dynamic structure that best represents the full meeting.""",
        "fr": """Tu examines plusieurs résumés partiels d'une longue réunion. Ta tâche est de les combiner en un seul résumé complet et cohérent.

IMPORTANT: Analyse le contenu de tous les résumés partiels pour:
1. Identifier le type global de réunion et les thèmes
2. Déterminer la meilleure structure pour le résumé complet
3. Créer une structure ADAPTATIVE qui correspond au contenu réel (pas un modèle fixe)

Ensuite:
- Fusionne les informations intelligemment
- Élimine les doublons et redondances
- Organise tout en utilisant des titres de sections qui reflètent les sujets et le flux réels
- Conserve tous les détails importants, décisions et actions
- Utilise une structure qui a du sens pour CETTE réunion spécifique

Résumés partiels:
{summaries}

Fournis un résumé complet et unifié avec une structure dynamique qui représente au mieux la réunion complète."""
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
