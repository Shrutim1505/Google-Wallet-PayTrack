"""
Helpers for file-upload tests.

We avoid a Pillow dependency by shipping a tiny pre-baked PNG byte string
(the smallest valid 1x1 transparent PNG). When tests need genuinely
larger fixtures, use :func:`make_temp_file` to materialise one on disk.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

# Smallest valid 1x1 transparent PNG (67 bytes).
_TINY_PNG: bytes = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
    b"\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

_MINIMAL_PDF: bytes = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f \n"
    b"0000000009 00000 n \n0000000052 00000 n \n0000000098 00000 n \n"
    b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF\n"
)


def tiny_png_bytes() -> bytes:
    """Return the bytes of a minimal but-valid PNG."""
    return _TINY_PNG


def minimal_pdf_bytes() -> bytes:
    """Return the bytes of a minimal but-valid PDF."""
    return _MINIMAL_PDF


def make_temp_file(
    content: bytes,
    *,
    suffix: str = ".png",
    prefix: str = "paytrack-test-",
) -> Path:
    """Write ``content`` to a NamedTemporaryFile and return the Path."""
    fd, path = tempfile.mkstemp(suffix=suffix, prefix=prefix)
    with os.fdopen(fd, "wb") as fh:
        fh.write(content)
    return Path(path)


def make_oversized_file(size_bytes: int, *, suffix: str = ".png") -> Path:
    """
    Create a file slightly larger than ``size_bytes`` for upload-limit tests.

    Uses sparse-write where supported to avoid wasting disk on CI agents.
    """
    path = make_temp_file(_TINY_PNG, suffix=suffix)
    with path.open("ab") as fh:
        fh.write(b"\0" * (size_bytes - len(_TINY_PNG) + 1))
    return path


__all__ = [
    "make_oversized_file",
    "make_temp_file",
    "minimal_pdf_bytes",
    "tiny_png_bytes",
]
