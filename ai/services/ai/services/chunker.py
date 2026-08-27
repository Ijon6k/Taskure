import functools
import hashlib
from dataclasses import dataclass

import tiktoken

_SEPARATORS = ["\n\n", "\n", ". ", "。", " ", ""]


@dataclass
class TextChunk:
    content: str
    index: int
    total: int
    content_hash: str


def hash_chunk(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


@functools.lru_cache(maxsize=4)
def _get_encoder(encoding_name: str = "cl100k_base"):
    return tiktoken.get_encoding(encoding_name)


def _count_tokens(text: str, encoding_name: str = "cl100k_base") -> int:
    if not text:
        return 0
    return len(_get_encoder(encoding_name).encode(text))


def _split_on_separator(text: str, separator: str) -> list[str]:
    if not separator:
        return list(text)
    parts = text.split(separator)
    return [p + separator for p in parts[:-1]] + [parts[-1]]


def chunk_text(
    text: str,
    chunk_size: int = 1024,
    overlap: int = 128,
    encoding_name: str = "cl100k_base",
) -> list[TextChunk]:
    """Chunk text into token-bounded pieces with token-aware overlap."""
    if not text or not text.strip():
        return []

    encoder = _get_encoder(encoding_name)
    tokens = encoder.encode(text)
    if len(tokens) <= chunk_size:
        return [TextChunk(content=text, index=0, total=1, content_hash=hash_chunk(text))]

    raw_chunks: list[str] = []
    _recursive_split(text, _SEPARATORS, chunk_size, raw_chunks, encoding_name)

    if not raw_chunks:
        return []

    # Apply token-aware overlap across adjacent chunks
    final_chunks: list[str] = []
    if overlap > 0 and len(raw_chunks) > 1:
        final_chunks.append(raw_chunks[0])
        for i in range(1, len(raw_chunks)):
            prev_tokens = encoder.encode(raw_chunks[i - 1])
            curr_tokens = encoder.encode(raw_chunks[i])

            overlap_toks = prev_tokens[-overlap:] if len(prev_tokens) >= overlap else prev_tokens
            overlap_prefix = encoder.decode(overlap_toks)

            # Avoid exceeding chunk_size when prepending overlap
            if len(overlap_toks) + len(curr_tokens) <= chunk_size:
                final_chunks.append(overlap_prefix + raw_chunks[i])
            else:
                trimmed_curr = encoder.decode(curr_tokens[: max(1, chunk_size - len(overlap_toks))])
                final_chunks.append(overlap_prefix + trimmed_curr)
    else:
        final_chunks = raw_chunks

    return [
        TextChunk(
            content=c,
            index=i,
            total=len(final_chunks),
            content_hash=hash_chunk(c),
        )
        for i, c in enumerate(final_chunks)
    ]


def _recursive_split(
    text: str,
    separators: list[str],
    chunk_size: int,
    result: list[str],
    encoding_name: str,
) -> None:
    if not separators:
        # Fallback to direct token slicing if all separators are exhausted
        encoder = _get_encoder(encoding_name)
        toks = encoder.encode(text)
        for i in range(0, len(toks), chunk_size):
            result.append(encoder.decode(toks[i : i + chunk_size]))
        return

    separator = separators[0]
    next_separators = separators[1:]

    splits = _split_on_separator(text, separator)
    good_splits: list[str] = []

    for split in splits:
        if not split:
            continue
        if _count_tokens(split, encoding_name) <= chunk_size:
            good_splits.append(split)
        else:
            if good_splits:
                _merge_splits(good_splits, chunk_size, result, encoding_name)
                good_splits = []
            _recursive_split(split, next_separators, chunk_size, result, encoding_name)

    if good_splits:
        _merge_splits(good_splits, chunk_size, result, encoding_name)


def _merge_splits(
    splits: list[str],
    chunk_size: int,
    result: list[str],
    encoding_name: str,
) -> None:
    current_chunk = ""

    for split in splits:
        combined = current_chunk + split
        if _count_tokens(combined, encoding_name) <= chunk_size:
            current_chunk = combined
        else:
            if current_chunk:
                result.append(current_chunk)
            if _count_tokens(split, encoding_name) > chunk_size:
                # Token-slice oversized split directly in chunks
                encoder = _get_encoder(encoding_name)
                toks = encoder.encode(split)
                for i in range(0, len(toks), chunk_size):
                    result.append(encoder.decode(toks[i : i + chunk_size]))
                current_chunk = ""
            else:
                current_chunk = split

    if current_chunk:
        result.append(current_chunk)
