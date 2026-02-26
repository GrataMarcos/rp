"""
Carga documentos legales desde distintos formatos (PDF, DOCX, TXT).
Infiere el tipo de documento (demanda, ley, sentencia, etc.) a partir del nombre de archivo.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}

DOC_TYPE_KEYWORDS: Dict[str, List[str]] = {
    "demanda": ["demanda", "demand"],
    "ley": ["ley", "law", "codigo", "código", "code", "decreto", "ordenanza"],
    "sentencia": ["sentencia", "fallo", "resolucion", "resolución", "acuerdo"],
    "contrato": ["contrato", "contract", "acuerdo", "convenio"],
    "escritura": ["escritura", "deed", "poder", "testamento"],
}


class DocumentLoader:
    """Carga documentos legales desde PDF, DOCX y TXT."""

    def load_directory(self, directory: str) -> List[Dict[str, Any]]:
        """Carga todos los documentos soportados de un directorio (recursivo)."""
        documents = []
        path = Path(directory)

        if not path.exists():
            logger.warning(f"El directorio no existe: {directory}")
            return documents

        for file_path in sorted(path.rglob("*")):
            if file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                try:
                    doc = self.load_file(str(file_path))
                    if doc:
                        documents.append(doc)
                        logger.info(f"Cargado: {file_path.name}")
                except Exception as e:
                    logger.error(f"Error cargando {file_path}: {e}")

        return documents

    def load_file(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Carga un archivo individual y retorna su contenido con metadatos."""
        path = Path(file_path)
        suffix = path.suffix.lower()

        loaders = {
            ".pdf": self._load_pdf,
            ".docx": self._load_docx,
            ".doc": self._load_docx,
            ".txt": self._load_txt,
        }

        loader = loaders.get(suffix)
        if not loader:
            raise ValueError(f"Formato no soportado: {suffix}")

        return loader(file_path)

    def _load_pdf(self, file_path: str) -> Dict[str, Any]:
        text = ""
        try:
            from pdfminer.high_level import extract_text
            text = extract_text(file_path)
        except Exception:
            try:
                import PyPDF2
                with open(file_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    text = "\n".join(
                        page.extract_text() or "" for page in reader.pages
                    )
            except Exception as e:
                logger.error(f"No se pudo leer el PDF {file_path}: {e}")

        return self._build_doc(text, file_path, "pdf")

    def _load_docx(self, file_path: str) -> Dict[str, Any]:
        from docx import Document
        doc = Document(file_path)
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return self._build_doc(text, file_path, "docx")

    def _load_txt(self, file_path: str) -> Dict[str, Any]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        return self._build_doc(text, file_path, "txt")

    def _build_doc(self, text: str, file_path: str, file_type: str) -> Dict[str, Any]:
        name = Path(file_path).name
        return {
            "content": text,
            "metadata": {
                "source": file_path,
                "filename": name,
                "file_type": file_type,
                "doc_type": self._infer_doc_type(name),
            },
        }

    def _infer_doc_type(self, filename: str) -> str:
        lower = filename.lower()
        for doc_type, keywords in DOC_TYPE_KEYWORDS.items():
            if any(kw in lower for kw in keywords):
                return doc_type
        return "general"
