"""
Genera respuestas y documentos legales usando RAG + Claude.

Modos:
  - query()           → responde preguntas legales citando fuentes
  - generate_document() → genera un documento nuevo basado en precedentes
  - stream_query()    → versión streaming para la UI
"""

import logging
from typing import Any, Dict, Generator, List, Optional

import anthropic

from config.settings import ANTHROPIC_API_KEY, CLAUDE_MODEL, TOP_K_RESULTS
from src.retrieval.retriever import LegalRetriever

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un asistente jurídico especializado en derecho latinoamericano.
Tu rol es ayudar a abogados a:
1. Analizar y consultar documentos legales (demandas, leyes, contratos, sentencias, escrituras)
2. Encontrar jurisprudencia, legislación y precedentes relevantes
3. Redactar nuevos documentos legales basados en evidencia documental

Reglas estrictas:
- Basá SIEMPRE tus respuestas en los documentos del contexto proporcionado
- Citá la fuente exacta (nombre de archivo) cuando hagas afirmaciones importantes
- Si el contexto no tiene información suficiente, indicalo explícitamente
- Usá lenguaje jurídico preciso y formal en español
- Al generar documentos, respetá la estructura y el formato legal apropiado
- No inventes hechos, fechas, partes ni artículos que no estén en el contexto"""

DOC_TYPE_LABELS = {
    "demanda": "una demanda judicial",
    "contrato": "un contrato",
    "sentencia": "una sentencia o resolución judicial",
    "escritura": "una escritura pública",
    "ley": "un proyecto de ley o regulación normativa",
    "general": "un documento legal",
}


class LegalRAGGenerator:
    """
    Motor RAG para consultas y generación de documentos legales.
    Combina recuperación semántica con Claude para respuestas fundamentadas.
    """

    def __init__(self, retriever: Optional[LegalRetriever] = None):
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        self.retriever = retriever or LegalRetriever()

    def query(
        self,
        question: str,
        doc_type: Optional[str] = None,
        k: int = TOP_K_RESULTS,
    ) -> Dict[str, Any]:
        """
        Responde una pregunta legal usando documentos de la base de conocimiento.

        Returns:
            dict con 'answer', 'sources' y 'model'
        """
        context = self.retriever.build_context(question, k=k, doc_type=doc_type)
        chunks = self.retriever.retrieve(question, k=k, doc_type=doc_type)

        user_message = (
            f"Contexto de documentos legales:\n\n{context}\n\n"
            f"---\n\nPregunta: {question}\n\n"
            "Respondé basándote en los documentos del contexto. Citá las fuentes."
        )

        response = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        return {
            "answer": response.content[0].text,
            "sources": self._format_sources(chunks),
            "model": CLAUDE_MODEL,
        }

    def generate_document(
        self,
        doc_type: str,
        description: str,
        k: int = 8,
    ) -> Dict[str, Any]:
        """
        Genera un nuevo documento legal basado en precedentes del repositorio.

        Args:
            doc_type: Tipo de documento ('demanda', 'contrato', etc.)
            description: Descripción detallada del documento a generar
            k: Cantidad de documentos de referencia a consultar

        Returns:
            dict con 'document', 'doc_type' y 'model'
        """
        search_query = f"{doc_type} {description}"
        context = self.retriever.build_context(search_query, k=k, doc_type=doc_type)
        doc_label = DOC_TYPE_LABELS.get(doc_type, "un documento legal")

        user_message = (
            f"Documentos de referencia:\n\n{context}\n\n"
            f"---\n\n"
            f"Generá {doc_label} con las siguientes características:\n{description}\n\n"
            "Incluí todos los elementos formales necesarios (encabezado, partes, "
            "fundamentos, petitorio, firma) y respetá la estructura legal apropiada. "
            "Basate en los documentos de referencia proporcionados."
        )

        response = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        return {
            "document": response.content[0].text,
            "doc_type": doc_type,
            "model": CLAUDE_MODEL,
        }

    def stream_query(
        self,
        question: str,
        doc_type: Optional[str] = None,
        k: int = TOP_K_RESULTS,
    ) -> Generator[str, None, None]:
        """
        Versión streaming de query() para la interfaz de usuario.
        Yield fragmentos de texto a medida que Claude los genera.
        """
        context = self.retriever.build_context(question, k=k, doc_type=doc_type)

        user_message = (
            f"Contexto de documentos legales:\n\n{context}\n\n"
            f"---\n\nPregunta: {question}\n\n"
            "Respondé basándote en los documentos del contexto. Citá las fuentes."
        )

        with self.client.messages.stream(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    def _format_sources(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [
            {
                "filename": c["metadata"].get("filename", "Desconocido"),
                "doc_type": c["metadata"].get("doc_type", "general"),
                "score": round(c["score"], 4),
            }
            for c in chunks
        ]
