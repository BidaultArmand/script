from pathlib import Path
from typing import Optional

try:
    from pydub import AudioSegment
except ImportError:  # pragma: no cover
    AudioSegment = None  # type: ignore


def to_wav(input_path: str | Path, output_path: Optional[str | Path] = None, sample_rate: int = 16000, channels: int = 1) -> Path:
    """
    Convert an audio file to WAV format with the given sample rate and channels.

    Args:
        input_path: Path to the input audio file (mp3, m4a, wav, etc.).
        output_path: Optional path for the resulting wav. Defaults to same stem with .wav.
        sample_rate: Target sample rate (default 16000).
        channels: Number of channels (default mono=1).

    Returns:
        Path to the converted wav file.

    Raises:
        RuntimeError: If pydub is not installed.
        FileNotFoundError: If the input file does not exist.
        ValueError: If sample_rate or channels are invalid.
    """
    if AudioSegment is None:
        raise RuntimeError("pydub is required for audio conversion. Install it via `pip install pydub`.")

    src = Path(input_path)
    if not src.exists():
        raise FileNotFoundError(f"Input file not found: {src}")

    if sample_rate <= 0:
        raise ValueError("sample_rate must be positive.")
    if channels not in (1, 2):
        raise ValueError("channels must be 1 (mono) or 2 (stereo).")

    if output_path is None:
        output_path = src.with_suffix(".wav")
    dst = Path(output_path)

    audio = AudioSegment.from_file(src)
    audio = audio.set_frame_rate(sample_rate).set_channels(channels)

    # Ensure parent directories exist
    dst.parent.mkdir(parents=True, exist_ok=True)
    audio.export(dst, format="wav")
    return dst
