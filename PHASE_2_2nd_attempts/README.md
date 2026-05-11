# Phase 2 CV Extraction Prototype

Put a generated reference image at:

```text
PHASE_2_2nd_attempts/input/reference.png
```

Install dependencies with `uv`:

```bash
cd PHASE_2_2nd_attempts
uv sync
```

Run:

```bash
cd PHASE_2_2nd_attempts
UV_CACHE_DIR=../.tmp/uv-cache uv run python extract_layers.py \
  input/reference.png \
  --out output/reference
```

If dependencies are already installed in `.venv` and the environment has no network access, run with `--no-sync`:

```bash
cd PHASE_2_2nd_attempts
UV_CACHE_DIR=../.tmp/uv-cache uv run --no-sync python extract_layers.py \
  input/reference.png \
  --out output/reference
```

Outputs:

- `foreground_mask.png`
- `branches_mask.png`
- `text_mask.png`
- `doodles_mask.png`
- `debug_overlay.png`
- `segmentation.json`
- `doodles/*.png`

OCR is optional in this first prototype. If PaddleOCR is installed, pass `--ocr paddle`; otherwise the script uses a black-ink fallback.

Run with PaddleOCR:

```bash
cd PHASE_2_2nd_attempts
PADDLE_PDX_CACHE_HOME=../.tmp/paddlex \
PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True \
HF_HOME=../.tmp/huggingface \
MODELSCOPE_CACHE=../.tmp/modelscope \
UV_CACHE_DIR=../.tmp/uv-cache \
uv run --no-sync python extract_layers.py \
  input/reference.png \
  --out output/reference_ocr \
  --ocr paddle
```

The first OCR run downloads PaddleOCR model files into `../.tmp/paddlex`. Later runs use the cached models.

Smoke test without a real GPT Image 2 reference:

```bash
cd PHASE_2_2nd_attempts
UV_CACHE_DIR=../.tmp/uv-cache uv run --no-sync python make_synthetic_reference.py
UV_CACHE_DIR=../.tmp/uv-cache uv run --no-sync python extract_layers.py \
  input/synthetic_reference.png \
  --out output/synthetic
```

Repair doodle masks after OCR subtraction:

```bash
cd PHASE_2_2nd_attempts
UV_CACHE_DIR=../.tmp/uv-cache uv run --no-sync python refine_doodles.py \
  input/reference.png \
  output/reference_ocr \
  --out output/reference_ocr_refined_doodles
```

See `sam2_adapter.md` for the planned hosted SAM2 refinement step.
See `TECH_DECISIONS.md` for the Replicate SAM2 automatic-mask evaluation result.

Build Figma-like visual groups using the original source structure:

```bash
cd PHASE_2_2nd_attempts
UV_CACHE_DIR=../.tmp/uv-cache uv run --no-sync python build_groups.py \
  output/reference_ocr_v2 \
  --refined-doodles-dir output/reference_ocr_v2_refined_doodles \
  --source-image input/reference.png \
  --structure source_structure.json \
  --out output/reference_groups
```

Run a Replicate SAM2 probe on a selected crop:

```bash
cd PHASE_2_2nd_attempts
REPLICATE_API_TOKEN=... \
UV_CACHE_DIR=../.tmp/uv-cache \
uv run --no-sync python run_replicate_sam2.py \
  output/reference_ocr/doodles/doodle_017.png \
  --out output/sam2_probe/doodle_017
```
