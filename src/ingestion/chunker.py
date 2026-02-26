"""
Divide documentos legales en fragmentos (chunks) respetando la estructura jurídica:
artículos, capítulos, títulos, secciones, etc.
"""

import re
import logging
from typing import Any, Dict, List

from config.settings import CHUNK_SIZE, CHUNK_OVERLAP

logger = logging.getLogger(__name__)

# Patrones comunes en documentos legales en español
LEGAL_SPLIT_PATTERNS = [
    r"\n(?=ARTÍCULO\s+\d+)",
    r"\n(?=Artículo\s+\d+)",
    r"\n(?=ART\.\s+\d+)",
    r"\n(?=Art\.\s+\d+)",
    r"\n(?=CAPÍTULO\s+[IVXivx\d]+)",
    r"\n(?=Capítulo\s+[IVXivx\d]+)",
    r"\n(?=TÍTULO\s+[IVXivx\d]+)",
    r"\n(?=Título\s+[IVXivx\d]+)",
    r"\n(?=SECCIÓN\s+\d+)",
    r"\n(?=Sección\s+\d+)",
    r"\n(?=LIBRO\s+[IVXivx\d]+)",
    r"\n\n(?=[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,}:)",  # Encabezados en mayúsculas
]

COMBINED_PATTERN = "|".join(LEGAL_SPLIT_PATTERNS)


class LegalDocumentChunker:
    """
    Divide documentos legales preservando estructura jurídica.
    Intenta mantener artículos/secciones enteras; si son muy largas,
    las subdivide por párrafos o por tamaño.
    """

    def __init__(
        self,
        chunk_size: int = CHUNK_SIZE,
        chunk_overlap: int = CHUNK_OVERLAP,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        chunks = []
        for doc in documents:
            chunks.extend(self.chunk_document(doc))
        logger.info(f"Total de fragmentos generados: {len(chunks)}")
        return chunks

    def chunk_document(self, document: Dict[str, Any]) -> List[Dict[str, Any]]:
        text = document["content"]
        metadata = document["metadata"]

        segments = re.split(COMBINED_PATTERN, text)
        merged = self._merge_and_split(segments)

        chunks = []
        for i, chunk_text in enumerate(merged):
            if chunk_text.strip():
                chunks.append(
                    {
                        "content": chunk_text.strip(),
                        "metadata": {
                            **metadata,
                            "chunk_index": i,
                            "total_chunks": len(merged),
                        },
                    }
                )
        return chunks

    def _merge_and_split(self, segments: List[str]) -> List[str]:
        """
        Fusiona segmentos pequeños hasta chunk_size;
        subdivide los que superen ese límite.
        """
        result: List[str] = []
        current = ""

        for seg in segments:
            seg = seg.strip()
            if not seg:
                continue

            if len(current) + len(seg) + 2 <= self.chunk_size:
                current = (current + "\n\n" + seg) if current else seg
            else:
                if current:
                    result.append(current)
                if len(seg) > self.chunk_size:
                    sub = self._split_by_size(seg)
                    result.extend(sub[:-1])
                    current = sub[-1] if sub else ""
                else:
                    current = seg

        if current:
            result.append(current)

        return result

    def _split_by_size(self, text: str) -> List[str]:
        """Divide texto grande en chunks con overlap, intentando cortar en párrafos."""
        paragraphs = text.split("\n\n")
        chunks: List[str] = []
        current = ""

        for para in paragraphs:
            if len(current) + len(para) + 2 <= self.chunk_size:
                current = (current + "\n\n" + para) if current else para
            else:
                if current:
                    chunks.append(current)
                # Párrafo individual mayor que chunk_size: cortar por caracteres con overlap
                if len(para) > self.chunk_size:
                    start = 0
                    while start < len(para):
                        end = start + self.chunk_size
                        chunks.append(para[start:end])
                        start += self.chunk_size - self.chunk_overlap
                    current = ""
                else:
                    current = para

        if current:
            chunks.append(current)

        return chunks
