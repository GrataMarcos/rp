"""
Generación de embeddings usando sentence-transformers.
El modelo por defecto es multilingüe (soporta español).

Modelos recomendados (ver TOOLS.md para más opciones):
  - paraphrase-multilingual-MiniLM-L12-v2  (rápido, liviano)
  - paraphrase-multilingual-mpnet-base-v2  (mayor calidad)
"""

import logging
from typing import List

from config.settings import EMBEDDING_MODEL

logger = logging.getLogger(__name__)


class EmbeddingGenerator:
    """Genera embeddings para chunks de documentos legales."""

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        from sentence_transformers import SentenceTransformer

        logger.info(f"Cargando modelo de embeddings: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.dimension: int = self.model.get_sentence_embedding_dimension()
        logger.info(f"Dimensión de embeddings: {self.dimension}")

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Genera embeddings para una lista de textos."""
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=len(texts) > 50,
            convert_to_numpy=True,
        )
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        """Genera embedding para una consulta."""
        return self.model.encode(query, convert_to_numpy=True).tolist()
