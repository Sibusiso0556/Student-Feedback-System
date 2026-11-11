# Handbook-RAG-System

A Retrieval-Augmented Generation (RAG) API that answers student questions using **only** the
ZAIO Full-Stack AI Engineer Bootcamp Handbook, and cites the PDF page it used.

## 1. Overview and objectives
Students ask a question → the app finds the most relevant handbook passages → an LLM writes an
answer from those passages → the API returns the answer plus page citations. If the handbook has
no answer, it returns exactly: `I couldn't find that information in the ZAIO handbook.`

## 2. Features
- Page-by-page PDF extraction (PyMuPDF), conservative cleaning, structure-aware chunking
- Sentence Transformers embeddings stored in a **persistent** ChromaDB
- Repeatable ingestion (re-running never duplicates chunks; changed PDF replaces old chunks)
- Relevance threshold + abstention (the LLM is not called when no evidence is found)
- Citations built by the backend from chunk metadata, never guessed by the LLM
- FastAPI + Pydantic validation, clear 422/503/500 errors, Swagger UI at `/docs`
- n8n-ready JSON API

## 3. Architecture
```
INGESTION  handbook.pdf → extract per page → clean → chunk (keeps pages/section) → embed → ChromaDB (disk)
QUERY      question → validate → embed → ChromaDB search → drop chunks below threshold
             ├─ none left → exact fallback JSON (no LLM call)
             └─ some left → number passages [1],[2].. → LLM → check output → map [n] to real pages → JSON
```
Ingestion and querying are separate: index once, query many times.

## 4. Folder structure
```
app/        main.py (routes) config.py schemas.py ingestion.py embeddings.py
            vector_store.py retrieval.py llm_service.py rag_pipeline.py errors.py
scripts/    ingest_handbook.py  evaluate.py
tests/      test_api.py test_ingestion.py test_retrieval.py test_rag_pipeline.py
            conftest.py eval_questions.json
data/       handbook.pdf (you add this)   chroma_db/ (generated)
```

## 5. Setup (Python 3.11 to 3.14; tests ran on 3.12 and 3.14)
Windows PowerShell:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
macOS/Linux:
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```
Edit `.env` and set `OPENAI_API_KEY`. `OPENAI_MODEL` may stay blank (default `gpt-4o-mini`); use any
model your account can access. For another provider with an OpenAI-compatible API, also set `OPENAI_BASE_URL`.

## 6. Ingest the handbook
Put the official PDF at `data/handbook.pdf` (or set `HANDBOOK_PATH`), then:
```
python -m scripts.ingest_handbook          # skips if this exact PDF is already indexed
python -m scripts.ingest_handbook --force  # rebuild the index
```
It prints pages processed, chunks created/indexed, and warnings for pages with no extractable text.
The first run downloads the embedding model (needs internet).

## 7. Run the API
```
uvicorn app.main:app --reload
```
(Note: `app.main:app`, with the `:app`.) Swagger UI: http://127.0.0.1:8000/docs

## 8. Ask a question
```powershell
curl.exe -X POST http://127.0.0.1:8000/ask -H "Content-Type: application/json" -d "{\"question\": \"What are the tutor support hours?\"}"
```
```bash
curl -X POST http://127.0.0.1:8000/ask -H "Content-Type: application/json" \
  -d '{"question": "What are the tutor support hours?"}'
```
Response shape (illustrative; real values come from your handbook):
```json
{"answer": "...", "source": "Page 20",
 "sources": [{"document": "ZAIO Full-Stack AI Engineer Bootcamp Handbook", "page": 20, "page_end": null, "excerpt": "..."}],
 "status": "answered"}
```
Not found:
```json
{"answer": "I couldn't find that information in the ZAIO handbook.", "source": null, "sources": [], "status": "not_found"}
```
| Code | Meaning |
|---|---|
| 200 | Processed (including `not_found`) |
| 422 | Missing/empty/whitespace/non-string/too-long question, or invalid JSON |
| 503 | Vector DB, embedding model or LLM unavailable (also: index empty, API key missing) |
| 500 | Unexpected error (generic message, no internals) |

**Page numbers are physical PDF pages (1-based)**, which may differ from numbers printed on the pages.

## 9. Relevance threshold (important)
Chroma returns cosine **distance** (`distance = 1 − similarity`). The code converts to
`similarity = 1 − distance` and keeps chunks with `similarity ≥ RELEVANCE_THRESHOLD` (default 0.30).
Raise it if unrelated questions get answered; lower it if real questions return `not_found`.
Tune it with `scripts/evaluate.py` on the real handbook.

## 10. Notes from the real handbook (24-page PDF)
Verified by running ingestion code on the supplied PDF (with a stand-in embedder, see section 11):
24/24 pages have extractable text; 29 chunks are created; a second run is skipped as unchanged.
- **Physical vs printed pages:** printed numbers drift (e.g. Grade Breakdown is printed "13" but is PDF page 14; two pages are printed "04"). The API always reports **physical PDF pages**: fees = 16, grade breakdown = 14, tutor support = 20.
- **Chunks never cross pages** (`CHUNK_ACROSS_PAGES=false`), so every citation is a single exact page. Section titles come from the largest font on the page, because PyMuPDF often returns the title *after* the body text in this PDF.
- Footer markers such as `0 4` are removed during cleaning.
- The Team page (15) extracts names, roles and emails as separate groups, so name-to-email pairing relies on the email's name (`asif@zaio.io`). Check test T12.

## 11. Design notes
- Chunk size is in **words** (default 180/30 overlap), not 500 tokens: `all-MiniLM-L6-v2` truncates input
  at 256 tokens, so larger chunks would be partly invisible to search.
- The system prompt follows the assignment text, with one change: the LLM cites passage numbers `[1]`
  and the backend converts them to real pages (so page numbers can never be invented).
- The LLM receives the handbook text in the user message and the rules in the system message.

## 12. Tests
```
pytest -v
```
**What the automated tests prove:** ingestion, page metadata, deduplication, threshold logic, citations,
fallback, validation and error handling — using a *fake* embedder and *fake* LLM (offline, deterministic).
**What they do NOT prove:** MiniLM retrieval quality on your handbook, or live LLM behaviour.
For that, fill in `tests/eval_questions.json` from the real handbook, then run `python -m scripts.evaluate`
(writes `docs/TEST_REPORT.md`; the 13 cases in `tests/eval_questions.json` are already filled from the handbook). Read each answer against the PDF yourself.

## 13. n8n
Add an **HTTP Request** node: Method `POST`, URL `http://localhost:8000/ask`, Body = JSON, `{"question": "{{ $json.question }}"}`.
Read `answer`, `source`, `status` from the response. `localhost` only works if n8n and the API run on the same
machine/network namespace. If n8n runs in Docker use `http://host.docker.internal:8000/ask`, start the API with
`uvicorn app.main:app --host 0.0.0.0 --port 8000`, and do not expose it publicly without authentication (none is built in).

## 14. Troubleshooting
| Problem | Fix |
|---|---|
| `Handbook PDF not found` | Put the file at `data/handbook.pdf` or set `HANDBOOK_PATH` |
| 503 "index is empty" | Run `python -m scripts.ingest_handbook` |
| 503 "LLM is not configured" | Set `OPENAI_API_KEY` in `.env`, restart the server |
| Everything returns `not_found` | Lower `RELEVANCE_THRESHOLD` (try 0.2) |
| Unrelated questions get answers | Raise `RELEVANCE_THRESHOLD` |
| Embedding model fails to load | Check internet on first run |

## 15. Known limitations
No OCR (scanned pages are reported, not read). Heading detection is a heuristic. No authentication.
Tables may extract as plain lines. The live pipeline (real MiniLM embeddings + real LLM) has been run and returned live answers; see `docs/TEST_REPORT.md` for the evaluation results.

## 16. Screenshots
![Answered question](docs/screenshots/answered.png)
![Question not in handbook](docs/screenshots/not_found.png)
![Invalid request](docs/screenshots/invalid_422.png)
