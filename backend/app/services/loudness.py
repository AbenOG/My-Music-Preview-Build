"""
Loudness analysis service using pyloudnorm for EBU R128 compliant measurements.
Analyzes audio files and calculates gain needed for normalization.
"""
import numpy as np
from typing import Dict, Any, Optional
from pathlib import Path

try:
    import soundfile as sf
    import pyloudnorm as pyln
    LOUDNESS_AVAILABLE = True
except ImportError:
    LOUDNESS_AVAILABLE = False
    print("Warning: pyloudnorm/soundfile not available. Loudness analysis disabled.")


class LoudnessAnalyzer:
    """
    Analyzes audio files for loudness according to EBU R128 standard.

    Default target: -14 LUFS (Spotify standard)
    Alternative targets: -16 LUFS (Apple Music), -23 LUFS (broadcast)
    """

    DEFAULT_TARGET_LUFS = -14.0  # Spotify target
    TRUE_PEAK_CEILING = -1.0     # dBTP ceiling for limiter

    def __init__(self, target_lufs: float = DEFAULT_TARGET_LUFS):
        self.target_lufs = target_lufs

    def analyze(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze a single audio file for loudness.

        Returns dict with:
        - integrated: Integrated loudness in LUFS
        - true_peak: True peak in dBTP
        - range: Loudness range in LU (optional)
        - gain: Calculated gain to reach target LUFS
        """
        if not LOUDNESS_AVAILABLE:
            return {
                "integrated": None,
                "true_peak": None,
                "range": None,
                "gain": None,
            }

        try:
            # Load audio file
            data, rate = sf.read(file_path)

            # Handle mono audio
            if len(data.shape) == 1:
                data = data.reshape(-1, 1)

            # Create meter
            meter = pyln.Meter(rate)

            # Measure integrated loudness
            loudness = meter.integrated_loudness(data)

            # Calculate true peak
            true_peak = self._calculate_true_peak(data)

            # Calculate loudness range (simplified)
            loudness_range = self._calculate_loudness_range(data, rate)

            # Calculate required gain to reach target
            if loudness != float('-inf') and loudness is not None:
                gain = self.target_lufs - loudness

                # Limit gain to avoid clipping (respect true peak ceiling)
                # If applying full gain would exceed ceiling, reduce it
                max_gain = self.TRUE_PEAK_CEILING - true_peak
                gain = min(gain, max_gain)

                # Clamp gain to reasonable range (-20 to +12 dB)
                gain = max(-20.0, min(12.0, gain))
            else:
                gain = 0.0

            return {
                "integrated": round(loudness, 2) if loudness != float('-inf') else None,
                "true_peak": round(true_peak, 2),
                "range": round(loudness_range, 2) if loudness_range else None,
                "gain": round(gain, 2),
            }

        except Exception as e:
            print(f"Error analyzing loudness for {file_path}: {e}")
            return {
                "integrated": None,
                "true_peak": None,
                "range": None,
                "gain": None,
            }

    def _calculate_true_peak(self, data: np.ndarray) -> float:
        """Calculate true peak in dBTP."""
        try:
            # Find max absolute sample across all channels
            max_sample = np.max(np.abs(data))

            # Convert to dBTP
            if max_sample > 0:
                return float(20 * np.log10(max_sample))
            return -96.0
        except Exception:
            return -96.0

    def _calculate_loudness_range(
        self, data: np.ndarray, rate: int
    ) -> Optional[float]:
        """
        Simplified loudness range calculation.
        Measures the dynamic range of the audio.
        """
        try:
            meter = pyln.Meter(rate)
            # Use 3 second blocks for short-term loudness
            block_size = int(rate * 3)

            samples = len(data)

            if samples < block_size:
                return None

            loudness_values = []
            for i in range(0, samples - block_size, block_size // 2):  # 50% overlap
                block = data[i:i + block_size]
                try:
                    loud = meter.integrated_loudness(block)
                    if loud != float('-inf') and loud > -70:
                        loudness_values.append(loud)
                except Exception:
                    pass

            if len(loudness_values) < 2:
                return None

            # LRA is roughly the range between 10th and 95th percentile
            p10 = np.percentile(loudness_values, 10)
            p95 = np.percentile(loudness_values, 95)
            return float(p95 - p10)

        except Exception:
            return None

    def set_target_lufs(self, target: float):
        """Update the target loudness level."""
        self.target_lufs = target


# Singleton instance
loudness_analyzer = LoudnessAnalyzer()
