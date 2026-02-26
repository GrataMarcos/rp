"""
Base de datos vectorial usando ChromaDB (persistente en disco).
Gestiona la indexación y búsqueda de fragmentos de documentos legales.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional

from config.settings import CHROMA_DB_PATH, COLLECTION_NAME
from src.retrieval.embeddings import EmbeddingGenerator

logger = logging.getLogger(__name__)


class VectorStore:
    """
    Almacén vectorial para fragmentos de documentos legales.
    Usa ChromaDB con similitud coseno y embeddings multilingües.
    """

    def __init__(
        self,
        persist_directory: str = CHROMA_DB_PATH,
        collection_name: str = COLLECTION_NAME,
    ):
        import chromadb

        self.embedder = EmbeddingGenerator()
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection_name = collection_name
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            f"VectorStore listo — colección '{collection_name}' "
            f"con {self.collection.count()} fragmentos"
        )

    def add_documents(self, chunks: List[Dict[str, Any]]) -> int:
        """Indexa una lista de chunks con sus embeddings."""
        if not chunks:
            return 0

        texts = [c["content"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]
        ids = [str(uuid.uuid4()) for _ in chunks]

        logger.info(f"Generando embeddings para {len(texts)} fragmentos...")
        embeddings = self.embedder.embed_texts(texts)

        self.collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids,
        )
        logger.info(f"Indexados {len(chunks)} fragmentos")
        return len(chunks)

    def search(
        self,
        query: str,
        n_results: int = 5,
        where: Optional[Dict] = None,
    ) -> List[Dict[str, Any]]:
        """
        Busca fragmentos relevantes para una consulta.

        Args:
            query: Texto de búsqueda
            n_results: Cantidad de resultados a retornar
            where: Filtro de metadatos (ej. {"doc_type": "demanda"})

        Returns:
            Lista de dicts con 'content', 'metadata' y 'score' (0-1).
        """
        query_embedding = self.embedder.embed_query(query)

        kwargs: Dict[str, Any] = dict(
            query_embeddings=[query_embedding],
            n_results=min(n_results, max(1, self.collection.count())),
            include=["documents", "metadatas", "distances"],
        )
        if where:
            kwargs["where"] = where

        results = self.collection.query(**kwargs)

        formatted = []
        for i in range(len(results["documents"][0])):
            formatted.append(
                {
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "score": 1.0 - results["distances"][0][i],
                }
            )
        return formatted

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_chunks": self.collection.count(),
            "collection_name": self.collection_name,
        }

    def delete_all(self) -> None:
        """Elimina todos los documentos de la colección (sin borrar la colección)."""
        self.client.delete_collection(self.collection_name)
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.warning("Colección vaciada")
