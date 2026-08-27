from pathlib import Path


class DocumentParseError(Exception):
    def __init__(self, message: str, file_path: str, cause: Exception | None = None):
        super().__init__(message)
        self.file_path = file_path
        self.cause = cause


def parse_document(file_path: str) -> str:
    path = Path(file_path)
    if not path.exists():
        raise DocumentParseError(f"File not found: {file_path}", file_path)

    suffix = path.suffix.lower()
    handlers = {
        ".pdf": _parse_pdf,
        ".docx": _parse_docx,
        ".md": _parse_plain,
        ".txt": _parse_plain,
    }

    handler = handlers.get(suffix)
    if handler is None:
        raise DocumentParseError(f"Unsupported file type: {suffix}", file_path)

    try:
        return handler(path)
    except DocumentParseError:
        raise
    except Exception as exc:
        raise DocumentParseError(f"Failed to parse {suffix} document", file_path, exc) from exc


def _parse_pdf(path: Path) -> str:
    from PyPDF2 import PdfReader

    reader = PdfReader(str(path))
    parts: list[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n\n".join(parts)


def _parse_docx(path: Path) -> str:
    from docx import Document

    doc = Document(str(path))
    parts: list[str] = []
    for para in doc.paragraphs:
        if para.text:
            parts.append(para.text)
    return "\n\n".join(parts)


def _parse_plain(path: Path) -> str:
    return path.read_text(encoding="utf-8")
