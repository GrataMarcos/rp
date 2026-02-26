# RAG Legal ⚖️

Sistema de **Retrieval-Augmented Generation (RAG)** para documentos jurídicos.
Permite a abogados consultar bases de documentos legales (demandas, leyes, contratos,
sentencias) y generar nuevos escritos fundamentados en evidencia documental.

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                        INTERFAZ                              │
│              Streamlit UI  /  API REST (FastAPI)             │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                     GENERACIÓN (RAG)                         │
│              Claude (claude-opus-4-6) via API                │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                     RECUPERACIÓN                             │
│    sentence-transformers (embeddings multilingual)           │
│    ChromaDB (vector store, persistente en disco)             │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                      INGESTA                                 │
│     PDF (pdfminer/PyPDF2)  ·  DOCX  ·  TXT                  │
│     Chunking con respeto de estructura legal (artículos,     │
│     secciones, capítulos)                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Instalación rápida

### 1. Requisitos
- Python 3.10+
- Clave API de Anthropic → [console.anthropic.com](https://console.anthropic.com)

### 2. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd legal-rag
python -m venv .venv
source .venv/bin/activate        # Linux/Mac
# .venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env y completar ANTHROPIC_API_KEY
```

### 4. Agregar documentos

Copiá tus archivos legales a `data/documents/` o a cualquier directorio.
Formatos soportados: **PDF, DOCX, TXT**.

> **Tip de nomenclatura**: incluir el tipo en el nombre de archivo ayuda a la
> inferencia automática.
> Ejemplos: `demanda_lopez_vs_garcia.pdf`, `ley_26994_codigo_civil.txt`,
> `sentencia_camara_civil_2023.docx`

### 5. Ingestar documentos

```bash
# Directorio completo
python scripts/ingest.py data/documents/

# Archivo individual
python scripts/ingest.py /ruta/archivo.pdf

# Con tamaños personalizados de chunk
python scripts/ingest.py data/documents/ --chunk-size 1500 --chunk-overlap 300
```

### 6. Iniciar la interfaz web

```bash
streamlit run ui/app.py
```

Abrí el navegador en `http://localhost:8501`.

---

## Uso programático (Python)

### Consultar documentos

```python
from src.generation.generator import LegalRAGGenerator

gen = LegalRAGGenerator()

# Respuesta con fuentes
result = gen.query("¿Cuáles son los plazos de prescripción en contratos de obra?")
print(result["answer"])
print(result["sources"])

# Filtrar por tipo de documento
result = gen.query("Causales de nulidad", doc_type="contrato", k=8)

# Streaming (para interfaces)
for token in gen.stream_query("Resumí los artículos sobre responsabilidad civil"):
    print(token, end="", flush=True)
```

### Generar documentos

```python
doc = gen.generate_document(
    doc_type="demanda",
    description="""
        Demanda por daños y perjuicios. Actora: María García.
        Demandado: Constructora S.A.
        Hechos: defectos ocultos en inmueble adquirido en 2022.
        Pretensión: $ 800.000 en concepto de reparaciones.
    """,
    k=10,  # Cantidad de precedentes a consultar
)
print(doc["document"])
```

### Ingestar documentos

```python
from src.ingestion.document_loader import DocumentLoader
from src.ingestion.chunker import LegalDocumentChunker
from src.retrieval.vector_store import VectorStore

loader = DocumentLoader()
chunker = LegalDocumentChunker(chunk_size=1000, chunk_overlap=200)
store = VectorStore()

docs = loader.load_directory("data/documents/")
chunks = chunker.chunk_documents(docs)
store.add_documents(chunks)
```

---

## Estructura del proyecto

```
legal-rag/
├── config/
│   └── settings.py          # Configuración centralizada (lee .env)
├── src/
│   ├── ingestion/
│   │   ├── document_loader.py   # Carga PDF, DOCX, TXT
│   │   └── chunker.py           # Fragmentación respetando estructura legal
│   ├── retrieval/
│   │   ├── embeddings.py        # Generación de embeddings (sentence-transformers)
│   │   ├── vector_store.py      # ChromaDB: indexar y buscar
│   │   └── retriever.py         # Recuperar y formatear contexto
│   └── generation/
│       └── generator.py         # RAG con Claude: consulta y generación
├── ui/
│   └── app.py               # Interfaz Streamlit
├── scripts/
│   └── ingest.py            # CLI de ingesta
├── data/
│   ├── documents/           # Ponés acá tus documentos legales
│   └── chroma_db/           # Base vectorial (generado automáticamente)
├── .env.example
├── requirements.txt
└── README.md
```

---

## Guía de herramientas alternativas

### Base de datos vectorial

| Herramienta | Tipo | Cuándo usarla |
|---|---|---|
| **ChromaDB** ✅ (default) | Local / embebido | Desarrollo, proyectos pequeños-medianos |
| **Qdrant** | Servidor / Cloud | Producción, alto volumen, filtros complejos |
| **Weaviate** | Servidor / Cloud | Búsqueda híbrida (semántica + keyword) |
| **Pinecone** | Cloud managed | Sin infraestructura propia, escala automática |
| **pgvector** | PostgreSQL ext. | Ya tenés Postgres, quierés todo en una BD |
| **FAISS** | Local / en memoria | Experimentos rápidos, no necesitás persistencia |

**Para migrar a Qdrant** (recomendado para producción):
```bash
pip install qdrant-client
```
Reemplazá `VectorStore` con cliente Qdrant en `src/retrieval/vector_store.py`.

---

### Modelos de embeddings

| Modelo | Tamaño | Idioma | Calidad | Velocidad |
|---|---|---|---|---|
| `paraphrase-multilingual-MiniLM-L12-v2` ✅ | 118 MB | Multi | Buena | Rápida |
| `paraphrase-multilingual-mpnet-base-v2` | 280 MB | Multi | Mejor | Media |
| `hiiamsid/sentence_similarity_spanish_es` | 438 MB | Español | Alta | Media |
| `OpenAI text-embedding-3-small` | API | Multi | Muy alta | API call |
| `OpenAI text-embedding-3-large` | API | Multi | Excelente | API call |

Para cambiar el modelo editá `EMBEDDING_MODEL` en `.env`.

---

### Modelos de lenguaje (LLM)

| Modelo | Proveedor | Cuándo usarlo |
|---|---|---|
| `claude-opus-4-6` ✅ | Anthropic | Mejor calidad, razonamiento legal complejo |
| `claude-sonnet-4-6` | Anthropic | Balance calidad/costo |
| `claude-haiku-4-5` | Anthropic | Respuestas rápidas, bajo costo |
| `gpt-4o` | OpenAI | Alternativa de alta calidad |
| `gpt-4o-mini` | OpenAI | Alternativa económica |
| `llama-3.3-70b` | Local (Ollama) | Sin costo de API, privacidad total |

Para usar **Llama local con Ollama**:
```bash
# Instalar Ollama: https://ollama.com
ollama pull llama3.3
```
Luego adaptá el cliente en `generator.py` (Ollama es compatible con la API de OpenAI).

---

### Procesamiento de PDF

| Herramienta | Cuándo usarla |
|---|---|
| `pdfminer.six` ✅ | PDFs digitales (texto seleccionable) |
| `PyPDF2` | Fallback ligero |
| `pymupdf` (fitz) | PDFs complejos, formularios, columnas |
| `pytesseract` + `pdf2image` | PDFs escaneados (OCR) |
| `nougat` (Meta) | Papers académicos, PDFs con fórmulas |

Para PDFs escaneados (documentos físicos digitalizados):
```bash
pip install pytesseract pdf2image
sudo apt install tesseract-ocr tesseract-ocr-spa  # Soporte español
```

---

### Estrategias de chunking avanzadas

| Estrategia | Descripción | Cuándo usar |
|---|---|---|
| **Por estructura** ✅ (default) | Respeta artículos/secciones | Leyes, contratos estructurados |
| **Fixed size** | Tamaño fijo con overlap | Documentos sin estructura clara |
| **Semantic** | Agrupa por coherencia semántica | Documentos narrativos |
| **Hierarchical** | Chunks anidados (small+large) | Consultas de distinto nivel |
| **Parent-child** (LangChain) | Índex pequeño, retorna grande | Balance precisión/contexto |

---

### Mejoras recomendadas para producción

1. **OCR para documentos escaneados**
   ```bash
   pip install pytesseract pdf2image
   ```

2. **Reranking** para mejorar precisión de recuperación
   ```bash
   pip install sentence-transformers
   # Usar CrossEncoder para reordenar resultados
   ```

3. **HyDE (Hypothetical Document Embeddings)**
   Generar un documento hipotético para la query antes de buscar → mejora recall.

4. **Metadata enriquecida**
   Extraer automáticamente: fecha, partes, número de expediente, tribunal.

5. **API REST** (ya incluido, iniciar con):
   ```bash
   # Crear api/main.py con FastAPI para integración con otros sistemas
   uvicorn api.main:app --reload
   ```

6. **Autenticación**
   Agregar login con [Streamlit Authenticator](https://github.com/mkhorasani/Streamlit-Authenticator)
   para controlar el acceso al sistema.

---

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | **Requerida**. API key de Anthropic |
| `CLAUDE_MODEL` | `claude-opus-4-6` | Modelo LLM a usar |
| `EMBEDDING_MODEL` | `paraphrase-multilingual-MiniLM-L12-v2` | Modelo de embeddings |
| `CHROMA_DB_PATH` | `./data/chroma_db` | Directorio del vector store |
| `DOCUMENTS_PATH` | `./data/documents` | Directorio de documentos |
| `COLLECTION_NAME` | `legal_documents` | Nombre de la colección |
| `CHUNK_SIZE` | `1000` | Tamaño máximo de chunk (caracteres) |
| `CHUNK_OVERLAP` | `200` | Solapamiento entre chunks |
| `TOP_K_RESULTS` | `5` | Fragmentos a recuperar por consulta |
