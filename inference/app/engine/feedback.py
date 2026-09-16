"""Dimension-level pedagogical feedback generator for Automated Essay Scoring.

Conforms to Section 9.1 DimensionFeedbackGenerator abstract interface and Prompt 16 requirements:
- Produces targeted feedback text across three core dimensions:
    1. grammar & mechanics
    2. coherence & organization
    3. argumentation & evidence
- Employs a rule-based/auxiliary heuristic approach layered on top of the holistic BERT scorer,
  without requiring separate training targets from the ASAP corpus.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Sequence, Tuple

from app.engine.interfaces import DimensionFeedbackGenerator

logger = logging.getLogger(__name__)

# Common transition keywords grouped by discourse category
DISCOURSE_TRANSITIONS: Dict[str, List[str]] = {
    "additive": [
        "furthermore", "moreover", "in addition", "additionally",
        "also", "similarly", "likewise", "not only",
    ],
    "contrastive": [
        "however", "on the other hand", "nevertheless", "in contrast",
        "conversely", "yet", "although", "even though", "whereas", "while",
    ],
    "causal": [
        "therefore", "consequently", "as a result", "in conclusion",
        "thus", "hence", "because of this", "for this reason",
    ],
    "sequential": [
        "first", "second", "third", "finally", "subsequently",
        "initially", "next", "to begin with", "in summary", "ultimately",
    ],
}

# Rhetorical claim & evidence indicators
EVIDENCE_MARKERS: List[str] = [
    "for example", "for instance", "specifically", "such as",
    "according to", "evidence shows", "research demonstrates",
    "data illustrates", "as shown by", "illustrated by", "to illustrate",
]

CLAIM_MARKERS: List[str] = [
    "i argue", "i believe", "in my opinion", "the main reason",
    "the central argument", "clearly shows", "it is evident",
    "demonstrates that", "substantiates that", "proves that",
]

ANALYSIS_MARKERS: List[str] = [
    "this demonstrates", "this illustrates", "this reveals",
    "this explains why", "this implies", "which indicates",
    "the significance of this", "as a consequence",
]


class RuleBasedDimensionFeedbackGenerator(DimensionFeedbackGenerator):
    """Auxiliary rule-based feedback generator for grammar, coherence, and argumentation."""

    def __init__(self) -> None:
        """Initialize heuristic pattern matchers."""
        self._sentence_splitter = re.compile(r"(?<=[.!?])\s+")
        self._duplicate_word_pattern = re.compile(r"\b([a-zA-Z]{2,})\s+\1\b", re.IGNORECASE)

    def generate_feedback(self, essay_text: str, dimension: str) -> str:
        """Produce dimension-specific feedback text (grammar / coherence / argumentation).

        Args:
            essay_text: Raw submitted essay text.
            dimension: Dimension name (e.g. 'grammar', 'coherence', 'argumentation').

        Returns:
            Pedagogical guidance text tailored to the essay's characteristics.
        """
        clean_text = essay_text.strip()
        dim_lower = dimension.strip().lower()

        if not clean_text:
            return "No text provided. Please submit an essay body for evaluation."

        word_count = len(clean_text.split())
        if word_count < 15:
            return (
                f"The response is too brief ({word_count} words) to adequately evaluate {dimension}. "
                "Please expand your submission with full paragraphs."
            )

        if "grammar" in dim_lower or "mechanic" in dim_lower:
            return self._analyze_grammar(clean_text)
        elif "coherence" in dim_lower or "organi" in dim_lower or "flow" in dim_lower:
            return self._analyze_coherence(clean_text)
        elif "argument" in dim_lower or "evidence" in dim_lower or "reason" in dim_lower:
            return self._analyze_argumentation(clean_text)
        else:
            return (
                f"Strong effort across {dimension}. Continue developing clarity, "
                "precise vocabulary, and balanced paragraph organization."
            )

    def generate_all_feedback(
        self,
        essay_text: str,
        holistic_band: Optional[str] = None,
    ) -> Dict[str, str]:
        """Generate comprehensive feedback for all three primary rubric dimensions.

        Args:
            essay_text: Submitted essay text.
            holistic_band: Optional score band (e.g. 'Advanced', 'Proficient', 'Basic', 'Below Basic').

        Returns:
            Dictionary mapping dimension names ('grammar', 'coherence', 'argumentation') to feedback text.
        """
        return {
            "grammar": self._analyze_grammar(essay_text, holistic_band=holistic_band),
            "coherence": self._analyze_coherence(essay_text, holistic_band=holistic_band),
            "argumentation": self._analyze_argumentation(essay_text, holistic_band=holistic_band),
        }

    def score_dimensions(
        self,
        essay_text: str,
        holistic_score: float,
        min_score: float,
        max_score: float,
    ) -> Dict[str, float]:
        """Layer auxiliary dimension scores onto the holistic BERT score.

        Modulates the holistic score by +/- 5% based on dimension-specific heuristic signals,
        clamping strictly to the prompt rubric range [min_score, max_score].

        Args:
            essay_text: Submitted essay text.
            holistic_score: Raw holistic score from BERT regressor.
            min_score: Lower bound of prompt rubric.
            max_score: Upper bound of prompt rubric.

        Returns:
            Dictionary mapping dimensions to calibrated scalar scores rounded to 2 decimals.
        """
        clean_text = essay_text.strip()
        words = clean_text.split()
        word_count = max(1, len(words))

        # 1. Grammar signal: capitalization and duplicate word ratio
        sentences = [s.strip() for s in self._sentence_splitter.split(clean_text) if s.strip()]
        cap_errors = sum(1 for s in sentences if s and not s[0].isupper())
        duplicate_count = len(self._duplicate_word_pattern.findall(clean_text))
        grammar_factor = 1.0 - (min(0.08, (cap_errors * 0.02) + (duplicate_count * 0.03)))

        # 2. Coherence signal: transition density
        text_lower = clean_text.lower()
        transition_count = sum(
            1 for group in DISCOURSE_TRANSITIONS.values()
            for marker in group if marker in text_lower
        )
        transition_density = (transition_count / word_count) * 100.0
        if transition_density >= 2.0:
            coherence_factor = 1.02
        elif transition_density < 0.8:
            coherence_factor = 0.96
        else:
            coherence_factor = 1.00

        # 3. Argumentation signal: presence of claim, evidence, and analysis markers
        evidence_found = sum(1 for m in EVIDENCE_MARKERS if m in text_lower)
        claim_found = sum(1 for m in CLAIM_MARKERS if m in text_lower)
        analysis_found = sum(1 for m in ANALYSIS_MARKERS if m in text_lower)
        arg_signals = evidence_found + claim_found + analysis_found

        if arg_signals >= 3:
            argumentation_factor = 1.03
        elif arg_signals == 0:
            argumentation_factor = 0.95
        else:
            argumentation_factor = 1.00

        # Compute and clamp calibrated scores
        span = max(0.1, max_score - min_score)
        g_score = max(min_score, min(max_score, holistic_score * grammar_factor))
        c_score = max(min_score, min(max_score, holistic_score * coherence_factor))
        a_score = max(min_score, min(max_score, holistic_score * argumentation_factor))

        return {
            "grammar": round(g_score, 2),
            "coherence": round(c_score, 2),
            "argumentation": round(a_score, 2),
        }

    # ========================================================================
    # Private Diagnostic Analyzers
    # ========================================================================

    def _analyze_grammar(self, text: str, holistic_band: Optional[str] = None) -> str:
        """Evaluate sentence mechanics, capitalization, repeated words, and run-ons."""
        sentences = [s.strip() for s in self._sentence_splitter.split(text) if s.strip()]
        num_sentences = max(1, len(sentences))
        words = text.split()
        num_words = len(words)

        # Heuristic 1: Sentence capitalization
        uncapitalized = [s for s in sentences if s and not s[0].isupper()]
        uncap_count = len(uncapitalized)

        # Heuristic 2: Duplicate repeated words ("the the", "and and")
        duplicates = self._duplicate_word_pattern.findall(text)

        # Heuristic 3: Run-on sentences (> 40 words)
        long_sentences = [s for s in sentences if len(s.split()) > 40]

        # Heuristic 4: Terminal punctuation
        lacks_terminal_punct = sum(1 for s in sentences if s and s[-1] not in ".!?")

        feedback_parts: List[str] = []

        if uncap_count > 0:
            feedback_parts.append(
                f"Ensure every sentence begins with a capital letter "
                f"({uncap_count} sentence{'s' if uncap_count > 1 else ''} started with lower-case)."
            )

        if duplicates:
            sample_dup = duplicates[0]
            feedback_parts.append(
                f"Watch for accidental word repetitions (e.g. '{sample_dup} {sample_dup}')."
            )

        if long_sentences:
            feedback_parts.append(
                f"Review {len(long_sentences)} extended sentence(s) exceeding 40 words; "
                "consider breaking them into concise clauses to prevent comma splices or run-ons."
            )

        if lacks_terminal_punct > 1:
            feedback_parts.append(
                "Ensure sentences conclude with appropriate terminal punctuation (period, exclamation, or question mark)."
            )

        # Synthesize overall feedback
        if not feedback_parts:
            if holistic_band in ("Advanced", "Proficient"):
                return (
                    "Exemplary command of sentence mechanics, accurate punctuation, and varied syntactic structures. "
                    "To further elevate your writing, experiment with advanced rhetorical inversion and nuanced semicolons."
                )
            return (
                "Solid sentence mechanics and grammatical conventions observed throughout the submission. "
                "Maintain this consistency by continuing to vary compound and complex sentence structures."
            )

        return " ".join(feedback_parts)

    def _analyze_coherence(self, text: str, holistic_band: Optional[str] = None) -> str:
        """Evaluate paragraph organization, discourse connectives, and logical transitions."""
        # Detect paragraphs
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n|\n", text) if p.strip()]
        num_paragraphs = len(paragraphs)
        words = text.split()
        num_words = max(1, len(words))

        text_lower = text.lower()
        found_transitions: Dict[str, List[str]] = {}
        total_transitions = 0

        for category, keywords in DISCOURSE_TRANSITIONS.items():
            matches = [kw for kw in keywords if kw in text_lower]
            if matches:
                found_transitions[category] = matches
                total_transitions += len(matches)

        density = (total_transitions / num_words) * 100.0
        feedback_parts: List[str] = []

        # Check paragraph structure
        if num_words >= 60 and num_paragraphs <= 1:
            feedback_parts.append(
                "Organize your submission into multi-paragraph units (introduction, developed body paragraphs, and conclusion) "
                "to delineate clear thematic transitions for the reader."
            )
        elif num_paragraphs >= 3:
            feedback_parts.append(
                f"Good structural layout with {num_paragraphs} distinct paragraphs."
            )

        # Check discourse transitions
        categories_used = len(found_transitions)
        if categories_used == 0:
            feedback_parts.append(
                "Enhance the logical flow between ideas by incorporating cohesive transition signposts "
                "(e.g., 'furthermore', 'however', 'consequently', or 'for instance')."
            )
        elif categories_used == 1:
            cat_name = list(found_transitions.keys())[0]
            feedback_parts.append(
                f"You have incorporated {cat_name} connectives well. Broaden your organizational toolkit by adding "
                f"{'contrastive' if cat_name != 'contrastive' else 'causal'} transitions to juxtapose viewpoints."
            )
        else:
            used_cats_str = ", ".join(sorted(found_transitions.keys()))
            feedback_parts.append(
                f"Effective discourse flow utilizing diverse transitional markers ({used_cats_str}), "
                f"achieving a healthy connective density of {density:.1f}%."
            )

        return " ".join(feedback_parts)

    def _analyze_argumentation(self, text: str, holistic_band: Optional[str] = None) -> str:
        """Evaluate thesis clarity, evidence integration, and deductive reasoning."""
        text_lower = text.lower()
        words = text.split()
        num_words = len(words)

        evidence_hits = [m for m in EVIDENCE_MARKERS if m in text_lower]
        claim_hits = [m for m in CLAIM_MARKERS if m in text_lower]
        analysis_hits = [m for m in ANALYSIS_MARKERS if m in text_lower]

        feedback_parts: List[str] = []

        # Claim / Thesis check
        if claim_hits:
            feedback_parts.append(
                "Your central stance is clearly framed with purposeful assertion markers."
            )
        elif num_words > 80:
            feedback_parts.append(
                "Establish a distinct, unambiguous thesis statement early in the introductory section "
                "to anchor the trajectory of your argument."
            )

        # Evidence check
        if evidence_hits:
            feedback_parts.append(
                f"Effective integration of concrete evidence markers ({len(evidence_hits)} found) "
                "grounding your claims in contextual examples."
            )
        else:
            feedback_parts.append(
                "Support assertions with concrete evidence, illustrative real-world examples, or textual citations "
                "rather than relying purely on generalized claims."
            )

        # Analytical follow-through check
        if analysis_hits:
            feedback_parts.append(
                "Strong deductive elaboration: you effectively bridge the gap between evidence and thesis conclusion."
            )
        elif evidence_hits and not analysis_hits:
            feedback_parts.append(
                "After presenting evidence, explain *why* and *how* the data directly confirms your central argument."
            )

        if not feedback_parts:
            feedback_parts.append(
                "Continue developing persuasive depth by clearly pairing each claim with supporting data and deductive reasoning."
            )

        return " ".join(feedback_parts)


# Public alias matching section 9.1 naming convention
DimensionFeedbackGeneratorImpl = RuleBasedDimensionFeedbackGenerator
