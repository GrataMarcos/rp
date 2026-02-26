"""
Interfaz web para el RAG Legal.
Ejecutar con: streamlit run ui/app.py
"""

import os
import sys
import tempfile

import streamlit as st

# Asegurar que el root del proyecto esté en el path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.generation.generator import LegalRAGGenerator
from src.ingestion.chunker import LegalDocumentChunker
from src.ingestion.document_loader import DocumentLoader
from src.retrieval.vector_store import VectorStore

# ── Configuración de página ──────────────────────────────────────────────────

st.set_page_config(
    page_title="RAG Legal",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Recursos cacheados ───────────────────────────────────────────────────────


@st.cache_resource(show_spinner="Inicializando motor RAG...")
def get_generator() -> LegalRAGGenerator:
    return LegalRAGGenerator()


@st.cache_resource(show_spinner="Conectando al repositorio de documentos...")
def get_vector_store() -> VectorStore:
    return VectorStore()


# ── Sidebar ──────────────────────────────────────────────────────────────────

st.sidebar.title("⚖️ RAG Legal")
st.sidebar.caption("Consulta y generación de documentos jurídicos")

mode = st.sidebar.radio(
    "Modo de uso",
    ["Consultar", "Generar Documento", "Cargar Documentos", "Estado del Sistema"],
    index=0,
)

st.sidebar.divider()

DOC_TYPES = ["Todos", "demanda", "ley", "sentencia", "contrato", "escritura", "general"]
selected_type = st.sidebar.selectbox("Filtrar por tipo de documento", DOC_TYPES)
doc_type_filter = None if selected_type == "Todos" else selected_type

k_results = st.sidebar.slider("Fragmentos a consultar (k)", min_value=1, max_value=15, value=5)

# ── Modo: Consultar ──────────────────────────────────────────────────────────

if mode == "Consultar":
    st.title("Consulta Legal")
    st.markdown(
        "Hacé preguntas sobre la base de documentos legales. "
        "El sistema busca los fragmentos más relevantes y genera una respuesta fundamentada."
    )

    question = st.text_area(
        "¿Qué necesitás saber?",
        placeholder=(
            "Ej: ¿Cuáles son los plazos para interponer una demanda por daños y perjuicios?\n"
            "Ej: ¿Qué requisitos debe tener un contrato de locación?\n"
            "Ej: Resumí los fundamentos de la sentencia sobre el caso X."
        ),
        height=120,
    )

    if st.button("Consultar", type="primary", use_container_width=True) and question.strip():
        generator = get_generator()
        chunks = generator.retriever.retrieve(question, k=k_results, doc_type=doc_type_filter)

        if not chunks:
            st.warning(
                "No se encontraron documentos relevantes. "
                "Cargá documentos primero en la sección 'Cargar Documentos'."
            )
        else:
            st.divider()
            st.subheader("Respuesta")

            response_area = st.empty()
            full_text = ""

            with st.spinner("Generando respuesta..."):
                for token in generator.stream_query(
                    question, doc_type=doc_type_filter, k=k_results
                ):
                    full_text += token
                    response_area.markdown(full_text + "▌")

            response_area.markdown(full_text)

            with st.expander(f"📚 Fuentes consultadas ({len(chunks)})", expanded=False):
                for i, chunk in enumerate(chunks, 1):
                    meta = chunk["metadata"]
                    st.markdown(
                        f"**{i}. {meta.get('filename', 'Desconocido')}** "
                        f"· {meta.get('doc_type', '—').capitalize()} "
                        f"· Relevancia: {chunk['score']:.0%}"
                    )
                    with st.expander("Ver fragmento", expanded=False):
                        st.text(chunk["content"][:800] + ("..." if len(chunk["content"]) > 800 else ""))

# ── Modo: Generar Documento ──────────────────────────────────────────────────

elif mode == "Generar Documento":
    st.title("Generar Documento Legal")
    st.markdown(
        "Describí el documento que necesitás. "
        "El sistema busca precedentes en la base y genera el documento con formato legal."
    )

    col1, col2 = st.columns([1, 2])

    with col1:
        doc_type = st.selectbox(
            "Tipo de documento",
            ["demanda", "contrato", "sentencia", "escritura", "ley", "general"],
        )
        k_gen = st.slider("Documentos de referencia", 1, 15, 8)

    with col2:
        description = st.text_area(
            "Descripción del documento",
            placeholder=(
                "Describí con el mayor detalle posible:\n"
                "- Partes involucradas\n"
                "- Hechos o antecedentes\n"
                "- Objeto o pretensión\n"
                "- Legislación aplicable (si la conocés)\n"
                "- Cualquier condición especial"
            ),
            height=220,
        )

    if st.button("Generar Documento", type="primary", use_container_width=True) and description.strip():
        generator = get_generator()

        with st.spinner("Buscando precedentes y generando documento..."):
            result = generator.generate_document(doc_type, description, k=k_gen)

        st.divider()
        st.subheader(f"Documento generado: {doc_type.capitalize()}")
        st.text_area("Resultado", value=result["document"], height=500)

        st.download_button(
            label="Descargar como .txt",
            data=result["document"],
            file_name=f"{doc_type}_generado.txt",
            mime="text/plain",
            use_container_width=True,
        )

# ── Modo: Cargar Documentos ──────────────────────────────────────────────────

elif mode == "Cargar Documentos":
    st.title("Cargar Documentos Legales")
    st.markdown(
        "Subí documentos (PDF, DOCX, TXT) para incorporarlos a la base de conocimiento. "
        "También podés usar el script de línea de comandos para cargas masivas."
    )

    st.code("python scripts/ingest.py /ruta/a/tus/documentos/", language="bash")

    st.divider()

    uploaded_files = st.file_uploader(
        "Seleccioná archivos",
        accept_multiple_files=True,
        type=["pdf", "docx", "txt"],
    )

    if uploaded_files:
        st.info(f"{len(uploaded_files)} archivo(s) seleccionado(s)")

        if st.button("Procesar e Indexar", type="primary", use_container_width=True):
            loader = DocumentLoader()
            chunker = LegalDocumentChunker()
            vector_store = get_vector_store()

            progress = st.progress(0, text="Procesando...")
            all_chunks = []

            for i, uploaded_file in enumerate(uploaded_files):
                progress.progress(
                    (i + 1) / len(uploaded_files),
                    text=f"Procesando: {uploaded_file.name}",
                )
                suffix = "." + uploaded_file.name.rsplit(".", 1)[-1]
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(uploaded_file.read())
                    tmp_path = tmp.name

                try:
                    doc = loader.load_file(tmp_path)
                    if doc:
                        doc["metadata"]["filename"] = uploaded_file.name
                        chunks = chunker.chunk_document(doc)
                        all_chunks.extend(chunks)
                except Exception as e:
                    st.error(f"Error en {uploaded_file.name}: {e}")
                finally:
                    os.unlink(tmp_path)

            progress.progress(1.0, text="Indexando en la base vectorial...")
            added = vector_store.add_documents(all_chunks)

            # Invalidar caché para reflejar nuevos documentos
            get_vector_store.clear()

            st.success(
                f"✓ {len(uploaded_files)} documentos procesados → {added} fragmentos indexados"
            )

# ── Modo: Estado del Sistema ─────────────────────────────────────────────────

elif mode == "Estado del Sistema":
    st.title("Estado del Sistema")

    vector_store = get_vector_store()
    stats = vector_store.get_stats()

    col1, col2 = st.columns(2)
    col1.metric("Fragmentos indexados", stats["total_chunks"])
    col2.metric("Colección activa", stats["collection_name"])

    st.divider()
    st.subheader("Configuración actual")

    from config import settings

    config_items = {
        "Modelo LLM": settings.CLAUDE_MODEL,
        "Modelo de embeddings": settings.EMBEDDING_MODEL,
        "Tamaño de chunk": f"{settings.CHUNK_SIZE} caracteres",
        "Overlap de chunk": f"{settings.CHUNK_OVERLAP} caracteres",
        "Resultados por consulta (k)": settings.TOP_K_RESULTS,
        "Directorio de documentos": settings.DOCUMENTS_PATH,
        "Directorio ChromaDB": settings.CHROMA_DB_PATH,
    }
    for key, val in config_items.items():
        st.text(f"{key}: {val}")

    st.divider()
    st.subheader("Operaciones de mantenimiento")
    if st.button("Vaciar base vectorial", type="secondary"):
        confirm = st.checkbox("Confirmar: esto eliminará TODOS los documentos indexados")
        if confirm:
            vector_store.delete_all()
            get_vector_store.clear()
            st.success("Base vectorial vaciada")
