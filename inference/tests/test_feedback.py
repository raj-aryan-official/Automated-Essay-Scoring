"""Unit tests for DimensionFeedbackGenerator implementation (Section 9.1 / Prompt 16).

Verifies:
1. Interface compliance with DimensionFeedbackGenerator.
2. Grammar feedback: mechanics, capitalization, repeated words, and run-ons.
3. Coherence feedback: paragraphing, discourse connectives, transition density.
4. Argumentation feedback: claims, evidence markers, and deductive analysis.
5. generate_all_feedback comprehensive multi-dimension dictionary generation.
6. score_dimensions calibrated modulation clamped strictly to prompt rubric bounds.
7. Edge cases: empty text, short text (<15 words), case-insensitive aliases, unknown dimensions.
"""

from __future__ import annotations

import pytest

from app.engine.feedback import (
    DimensionFeedbackGeneratorImpl,
    RuleBasedDimensionFeedbackGenerator,
)
from app.engine.interfaces import DimensionFeedbackGenerator
from app.engine.model import BertEssayScoringModel, RuleBasedFeedbackGenerator


@pytest.fixture
def generator() -> RuleBasedDimensionFeedbackGenerator:
    """Provide a fresh RuleBasedDimensionFeedbackGenerator instance."""
    return RuleBasedDimensionFeedbackGenerator()


@pytest.fixture
def sample_proficient_essay() -> str:
    """Sample multi-paragraph essay with claims, evidence, transitions, and good grammar."""
    return (
        "In modern society, technological advancement plays a fundamental role in shaping educational paradigms. "
        "I argue that integrating digital literacy into secondary curricula is essential for future workforce readiness.\n\n"
        "First, empirical research demonstrates that students proficient in technology achieve higher problem-solving marks. "
        "For example, recent educational studies indicate that project-based digital classrooms foster collaborative teamwork. "
        "This illustrates how practical digital immersion bridges abstract theory and practical application.\n\n"
        "On the other hand, skeptics argue that screen time may reduce attention spans. "
        "However, structured instructional scaffolding mitigates this risk effectively. "
        "Therefore, balanced curriculum integration remains the most viable pedagogical path."
    )


@pytest.fixture
def sample_flawed_essay() -> str:
    """Sample essay with grammar issues (uncapitalized sentences, duplicate words), poor coherence, and no evidence."""
    return (
        "computers are good for students and and learning things. "
        "we need computers in schools because they help us find information fast. "
        "also teachers like them too and it is fun to play games and and do homework."
    )


def test_interface_compliance(generator: RuleBasedDimensionFeedbackGenerator) -> None:
    """Verify generator conforms to DimensionFeedbackGenerator abstract interface."""
    assert isinstance(generator, DimensionFeedbackGenerator)
    # Verify alias compatibility
    alias_gen = DimensionFeedbackGeneratorImpl()
    assert isinstance(alias_gen, DimensionFeedbackGenerator)
    # Verify model.py RuleBasedFeedbackGenerator compatibility
    model_gen = RuleBasedFeedbackGenerator()
    assert isinstance(model_gen, DimensionFeedbackGenerator)


def test_grammar_feedback_proficient(
    generator: RuleBasedDimensionFeedbackGenerator, sample_proficient_essay: str
) -> None:
    """Verify grammar feedback on well-structured essay acknowledges mechanics."""
    feedback = generator.generate_feedback(sample_proficient_essay, "grammar")
    assert isinstance(feedback, str) and len(feedback) > 20
    assert any(term in feedback.lower() for term in ["mechanic", "conventions", "exemplary", "solid"])


def test_grammar_feedback_flawed(
    generator: RuleBasedDimensionFeedbackGenerator, sample_flawed_essay: str
) -> None:
    """Verify grammar feedback flags capitalization and duplicated words."""
    feedback = generator.generate_feedback(sample_flawed_essay, "grammar")
    assert isinstance(feedback, str)
    # Check for capitalization or repeated word detection
    feedback_lower = feedback.lower()
    assert "capital" in feedback_lower or "repetition" in feedback_lower or "duplicate" in feedback_lower


def test_coherence_feedback_proficient(
    generator: RuleBasedDimensionFeedbackGenerator, sample_proficient_essay: str
) -> None:
    """Verify coherence feedback identifies paragraphs and discourse transitions."""
    feedback = generator.generate_feedback(sample_proficient_essay, "coherence")
    assert isinstance(feedback, str)
    feedback_lower = feedback.lower()
    assert "paragraph" in feedback_lower or "transition" in feedback_lower or "flow" in feedback_lower


def test_coherence_feedback_single_paragraph(
    generator: RuleBasedDimensionFeedbackGenerator,
) -> None:
    """Verify coherence feedback suggests multi-paragraph layout for unsegmented text."""
    long_single_para = (
        "This is an essay about community service. Community service allows youth to give back to society. "
        "It fosters civic responsibility and encourages empathy for marginalized groups. When students engage "
        "in local food drives or shelter volunteering, they witness first-hand the societal gaps that exist. "
        "Furthermore, community engagement develops leadership abilities that are critical for career success. "
        "Students learn how to organize logistical drives, coordinate with diverse team members, and resolve "
        "unexpected operational hurdles. In conclusion, mandatory volunteer programs enrich both communities and students."
    )
    feedback = generator.generate_feedback(long_single_para, "coherence")
    assert "multi-paragraph" in feedback.lower() or "paragraph" in feedback.lower()


def test_argumentation_feedback_with_evidence(
    generator: RuleBasedDimensionFeedbackGenerator, sample_proficient_essay: str
) -> None:
    """Verify argumentation feedback identifies claims and evidence markers."""
    feedback = generator.generate_feedback(sample_proficient_essay, "argumentation")
    assert isinstance(feedback, str)
    feedback_lower = feedback.lower()
    assert "claim" in feedback_lower or "evidence" in feedback_lower or "thesis" in feedback_lower


def test_argumentation_feedback_lacking_evidence(
    generator: RuleBasedDimensionFeedbackGenerator,
) -> None:
    """Verify argumentation feedback prompts for concrete evidence when absent."""
    opinion_only = (
        "Uniforms should definitely be mandatory in high school. Uniforms create discipline and unity among students. "
        "Everyone looks neat and professional every day. When students dress the same, nobody gets bullied for their clothes. "
        "It also saves parents a lot of money because they do not have to buy expensive brand-name fashion."
    )
    feedback = generator.generate_feedback(opinion_only, "argumentation")
    assert "evidence" in feedback.lower() or "examples" in feedback.lower() or "support" in feedback.lower()


def test_generate_all_feedback(
    generator: RuleBasedDimensionFeedbackGenerator, sample_proficient_essay: str
) -> None:
    """Verify generate_all_feedback outputs a full dimension feedback mapping."""
    all_fb = generator.generate_all_feedback(sample_proficient_essay, holistic_band="Proficient")
    assert isinstance(all_fb, dict)
    assert set(all_fb.keys()) == {"grammar", "coherence", "argumentation"}
    for dim, text in all_fb.items():
        assert isinstance(text, str)
        assert len(text) > 10, f"Feedback for {dim} was unexpectedly brief: {text}"


def test_score_dimensions_bounds(
    generator: RuleBasedDimensionFeedbackGenerator, sample_proficient_essay: str
) -> None:
    """Verify score_dimensions modulates holistic score and respects rubric clamping."""
    scores = generator.score_dimensions(
        sample_proficient_essay, holistic_score=8.5, min_score=2.0, max_score=12.0
    )
    assert "grammar" in scores
    assert "coherence" in scores
    assert "argumentation" in scores

    for dim, score in scores.items():
        assert isinstance(score, float)
        assert 2.0 <= score <= 12.0, f"Score for {dim} ({score}) out of [2.0, 12.0] bounds"

    # Test clamping at upper boundary
    max_scores = generator.score_dimensions(
        sample_proficient_essay, holistic_score=12.0, min_score=2.0, max_score=12.0
    )
    for dim, score in max_scores.items():
        assert score <= 12.0

    # Test clamping at lower boundary
    min_scores = generator.score_dimensions(
        sample_proficient_essay, holistic_score=2.0, min_score=2.0, max_score=12.0
    )
    for dim, score in min_scores.items():
        assert score >= 2.0


def test_dimension_aliases_and_case(
    generator: RuleBasedDimensionFeedbackGenerator, sample_proficient_essay: str
) -> None:
    """Verify dimension lookup is case-insensitive and handles synonymous terminology."""
    fb_grammar_upper = generator.generate_feedback(sample_proficient_essay, "GRAMMAR")
    fb_mechanics = generator.generate_feedback(sample_proficient_essay, "mechanics")
    assert len(fb_grammar_upper) > 0
    assert len(fb_mechanics) > 0

    fb_org = generator.generate_feedback(sample_proficient_essay, "Organization")
    fb_flow = generator.generate_feedback(sample_proficient_essay, "flow")
    assert len(fb_org) > 0
    assert len(fb_flow) > 0

    fb_evidence = generator.generate_feedback(sample_proficient_essay, "Evidence")
    assert len(fb_evidence) > 0


def test_unknown_dimension_fallback(
    generator: RuleBasedDimensionFeedbackGenerator, sample_proficient_essay: str
) -> None:
    """Verify unknown dimension returns supportive general guidance."""
    feedback = generator.generate_feedback(sample_proficient_essay, "creativity")
    assert "creativity" in feedback.lower()
    assert "strong effort" in feedback.lower() or "continue developing" in feedback.lower()


def test_edge_cases_empty_and_short(
    generator: RuleBasedDimensionFeedbackGenerator,
) -> None:
    """Verify graceful handling of empty and extremely short text inputs."""
    empty_fb = generator.generate_feedback("", "grammar")
    assert "no text provided" in empty_fb.lower()

    whitespace_fb = generator.generate_feedback("   \n\t  ", "coherence")
    assert "no text provided" in whitespace_fb.lower()

    short_fb = generator.generate_feedback("Technology is good.", "argumentation")
    assert "too brief" in short_fb.lower()


def test_model_predict_essay_integration() -> None:
    """Verify BertEssayScoringModel.predict_essay produces calibrated dimension scores via feedback generator."""
    model = BertEssayScoringModel()
    essay = (
        "In this essay, I argue that public libraries remain indispensable civic pillars. "
        "For example, public libraries offer equitable access to high-speed internet and research archives. "
        "Furthermore, educational workshops hosted by librarians empower underrepresented communities. "
        "Therefore, local governments must prioritize sustained library funding."
    )
    prediction = model.predict_essay(essay, prompt_id="1")
    assert prediction.holistic_score >= 2.0 and prediction.holistic_score <= 12.0
    assert "grammar" in prediction.dimension_scores
    assert "coherence" in prediction.dimension_scores
    assert "argumentation" in prediction.dimension_scores

    for dim, score in prediction.dimension_scores.items():
        assert 2.0 <= score <= 12.0
