#!/usr/bin/env python3
"""
Script de ingesta de documentos legales al vector store.

Uso:
    # Ingestar un directorio completo
    python scripts/ingest.py data/documents/

    # Ingestar un archivo específico
    python scripts/ingest.py /ruta/al/archivo.pdf

    # Con parámetros personalizados
    python scripts/ingest.py data/documents/ --chunk-size 1500 --chunk-overlap 300
"""

import argparse
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import CHUNK_OVERLAP, CHUNK_SIZE, DOCUMENTS_PATH
from src.ingestion.chunker import LegalDocumentChunker
from src.ingestion.document_loader import DocumentLoader
from src.retrieval.vector_store import VectorStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def ingest(source_path: str, chunk_size: int, chunk_overlap: int) -> int:
    loader = DocumentLoader()
    chunker = LegalDocumentChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    store = VectorStore()

    logger.info(f"Cargando documentos desde: {source_path}")

    if os.path.isfile(source_path):
        doc = loader.load_file(source_path)
        documents = [doc] if doc else []
    elif os.path.isdir(source_path):
        documents = loader.load_directory(source_path)
    else:
        logger.error(f"Ruta no válida: {source_path}")
        return 0

    if not documents:
        logger.warning("No se encontraron documentos para procesar")
        return 0

    logger.info(f"Documentos cargados: {len(documents)}")

    chunks = chunker.chunk_documents(documents)
    logger.info(f"Fragmentos generados: {len(chunks)}")

    added = store.add_documents(chunks)
    stats = store.get_stats()
    logger.info(f"Total en el repositorio: {stats['total_chunks']} fragmentos")

    return added


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingestá documentos legales en el RAG",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=DOCUMENTS_PATH,
        help=f"Archivo o directorio a ingestar (default: {DOCUMENTS_PATH})",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=CHUNK_SIZE,
        help=f"Tamaño máximo de cada fragmento en caracteres (default: {CHUNK_SIZE})",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=CHUNK_OVERLAP,
        help=f"Solapamiento entre fragmentos (default: {CHUNK_OVERLAP})",
    )

    args = parser.parse_args()
    added = ingest(args.path, args.chunk_size, args.chunk_overlap)

    if added:
        print(f"\n✓ {added} fragmentos indexados exitosamente")
    else:
        print("\n✗ No se indexaron fragmentos")
        sys.exit(1)


if __name__ == "__main__":
    main()
