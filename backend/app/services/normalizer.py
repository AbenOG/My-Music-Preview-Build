"""
Metadata normalization service for consistent searching and grouping.
Handles case normalization, whitespace cleanup, and article prefix handling.
"""

import re
import unicodedata
from typing import Optional, Dict, Any


class MetadataNormalizer:
    """
    Handles normalization of metadata strings for comparison and grouping.
    Original values are preserved; normalized values stored separately.
    """

    # Common article prefixes to move to end for sorting
    ARTICLE_PATTERNS = [
        (r"^the\s+", "the"),
        (r"^a\s+", "a"),
        (r"^an\s+", "an"),
    ]

    # Common punctuation normalization (smart quotes, dashes)
    PUNCTUATION_MAP = {
        "'": "'",
        "'": "'",
        "‚": "'",
        """: '"',
        """: '"',
        "„": '"',
        "–": "-",
        "—": "-",
        "…": "...",
        "×": "x",
        "•": "-",
    }

    # Patterns to clean from titles (featuring, remix info often inconsistent)
    FEATURING_PATTERNS = [
        r"\s*\(?\s*feat\.?\s+[^)]+\)?",
        r"\s*\(?\s*ft\.?\s+[^)]+\)?",
        r"\s*\(?\s*featuring\s+[^)]+\)?",
        r"\s*\(?\s*with\s+[^)]+\)?",
    ]

    def normalize_string(
        self,
        value: Optional[str],
        move_article_to_end: bool = True,
        remove_featuring: bool = False
    ) -> Optional[str]:
        """
        Normalize a string for comparison:
        1. Unicode normalization (NFKC)
        2. Lowercase
        3. Punctuation normalization
        4. Whitespace normalization
        5. Optional: Article prefix handling ("The Beatles" -> "beatles, the")
        6. Optional: Remove featuring info
        """
        if not value:
            return None

        # Unicode normalization (compatibility decomposition + composition)
        normalized = unicodedata.normalize("NFKC", value)

        # Lowercase
        normalized = normalized.lower()

        # Normalize special punctuation
        for old, new in self.PUNCTUATION_MAP.items():
            normalized = normalized.replace(old, new)

        # Remove featuring info if requested
        if remove_featuring:
            for pattern in self.FEATURING_PATTERNS:
                normalized = re.sub(pattern, "", normalized, flags=re.IGNORECASE)

        # Collapse multiple spaces to single space
        normalized = re.sub(r"\s+", " ", normalized)

        # Trim whitespace
        normalized = normalized.strip()

        # Handle article prefixes - move to end for sorting
        if move_article_to_end:
            for pattern, article in self.ARTICLE_PATTERNS:
                match = re.match(pattern, normalized, re.IGNORECASE)
                if match:
                    rest = normalized[match.end():].strip()
                    if rest:  # Only if there's content after the article
                        normalized = f"{rest}, {article}"
                    break

        return normalized if normalized else None

    def normalize_artist(self, artist: Optional[str]) -> Optional[str]:
        """
        Normalize artist name.
        - Moves "The/A/An" to end
        - Normalizes case and whitespace
        """
        return self.normalize_string(artist, move_article_to_end=True)

    def normalize_album(self, album: Optional[str]) -> Optional[str]:
        """
        Normalize album name.
        - Moves "The/A/An" to end
        - Normalizes case and whitespace
        """
        return self.normalize_string(album, move_article_to_end=True)

    def normalize_title(self, title: Optional[str]) -> Optional[str]:
        """
        Normalize track title.
        - Does NOT move articles (song titles often start with The/A/An intentionally)
        - Normalizes case and whitespace
        """
        return self.normalize_string(title, move_article_to_end=False)

    def normalize_for_matching(self, title: Optional[str]) -> Optional[str]:
        """
        Aggressive normalization for duplicate matching.
        Removes featuring info and other variable parts.
        """
        return self.normalize_string(
            title,
            move_article_to_end=False,
            remove_featuring=True
        )

    def calculate_completeness(self, track_data: Dict[str, Any]) -> int:
        """
        Calculate metadata completeness score (0-100).

        Weights:
        - title: 20 (required, but might be from filename)
        - artist: 25 (most important for organization)
        - album: 15
        - year: 10
        - genre: 10
        - artwork: 10
        - track_number: 5
        - bitrate: 5
        """
        score = 0

        # Title (20 points)
        if track_data.get("title"):
            score += 20

        # Artist (25 points)
        if track_data.get("artist"):
            score += 25

        # Album (15 points)
        if track_data.get("album"):
            score += 15

        # Year (10 points)
        if track_data.get("year"):
            score += 10

        # Genre (10 points)
        if track_data.get("genre"):
            score += 10

        # Artwork (10 points)
        if track_data.get("artwork_path"):
            score += 10

        # Track number (5 points)
        if track_data.get("track_number"):
            score += 5

        # Bitrate (5 points) - indicates quality metadata extraction
        if track_data.get("bitrate"):
            score += 5

        return score

    def strings_match(self, str1: Optional[str], str2: Optional[str]) -> bool:
        """Check if two strings match after normalization."""
        norm1 = self.normalize_string(str1)
        norm2 = self.normalize_string(str2)

        if norm1 is None and norm2 is None:
            return True
        if norm1 is None or norm2 is None:
            return False
        return norm1 == norm2

    def get_display_value(
        self,
        normalized: Optional[str],
        original: Optional[str],
        current: Optional[str]
    ) -> Optional[str]:
        """
        Get the best display value for a field.
        Prefers original if different from normalized, otherwise current.
        """
        if original:
            return original
        return current


# Singleton instance
normalizer = MetadataNormalizer()
