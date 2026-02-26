"""
Recupera fragmentos relevantes del vector store para una consulta legal.
Formatea el contexto listo para ser consumido por el generador.
"""

import logging
from typing import Any, Dict, List, Optional

from config.settings import TOP_K_RESULTS
from src.retrieval.vector_store import VectorStore

logger = logging.getLogger(__name__)


class LegalRetriever:
    """Busca y formatea contexto legal para el modelo de lenguaje."""

    def __init__(self, vector_store: Optional[VectorStore] = None):
        self.vector_store = vector_store or VectorStore()

    def retrieve(
        self,
        query: str,
        k: int = TOP_K_RESULTS,
        doc_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retorna k fragmentos más relevantes para la consulta."""
        where = {"doc_type": doc_type} if doc_type else None
        results = self.vector_store.search(query, n_results=k, where=where)
        logger.info(f"Recuperados {len(results)} fragmentos para: {query[:60]}...")
        return results

    def build_context(
        self,
        query: str,
        k: int = TOP_K_RESULTS,
        doc_type: Optional[str] = None,
    ) -> str:
        """
        Retorna el contexto formateado como string para incluir en el prompt.
        Incluye fuente, tipo de documento y puntaje de relevancia.
        """
        chunks = self.retrieve(query, k=k, doc_type=doc_type)

        if not chunks:
            return "No se encontraron documentos relevantes en la base de conocimiento."

        parts = []
        for i, chunk in enumerate(chunks, 1):
            meta = chunk["metadata"]
            source = meta.get("filename", "Desconocido")
            dtype = meta.get("doc_type", "general").capitalize()
            score = chunk["score"]
            parts.append(
                f"[Fuente {i}: {source} | Tipo: {dtype} | Relevancia: {score:.0%}]\n"
                f"{chunk['content']}"
            )

        return "\n\n---\n\n".join(parts)
