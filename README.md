# Automated Essay Scoring (AES) Platform
**BERT + Regression Head Essay Scorer & Rubric-Aligned Feedback Platform**

* **Author:** Raj Aryan
* **Roll No:** 240410700141
* **Track:** Generative AI / EdTech AI
* **Domain:** EdTech / Educational Assessment
* **Reference Architecture:** *“A Neural Approach to Automated Essay Scoring”* (EMNLP 2016)

---

## 1. Project Overview

The Automated Essay Scoring platform is an end-to-end AI system designed to score free-response student essays based on the ASAP (Automated Student Assessment Prize) dataset. It predicts holistic scores rescaled to prompt-specific rubric scales and produces multi-dimensional feedback across Grammar, Coherence, and Argumentation.

## 2. Monorepo Repository Structure

```text
automated-essay-scoring/
├─ frontend/          # React + Tailwind CSS + Axios (Vite-based)
├─ backend/           # FastAPI application (Python 3.11)
│  ├─ app/api/v1/     # REST API endpoint routers
│  ├─ app/core/       # Settings, security, and DB connection
│  ├─ app/models/     # SQLAlchemy ORM models
│  ├─ app/schemas/    # Pydantic validation schemas
│  └─ app/services/   # Storage, job management, scoring services
├─ inference/         # PyTorch + Hugging Face Transformers
│  ├─ app/engine/     # BERT + regression head inference wrappers
│  ├─ app/dataset/    # ASAP dataset adapters & tokenization
│  ├─ app/eval/       # QWK evaluation metric calculation
│  └─ configs/        # Model & training YAML configs
├─ docker-compose.yml # Container orchestration (Postgres, MinIO, Backend, Worker, Frontend)
├─ .env.example       # Sample environment configuration
└─ README.md          # Project documentation
```

## 3. Technology Stack

* **Frontend:** React 18, Vite, Tailwind CSS, Axios, TypeScript
* **Backend:** FastAPI (Python 3.11), SQLAlchemy, Pydantic, Alembic
* **ML / NLP:** PyTorch, Hugging Face Transformers (BERT), PEFT/LoRA, ONNX Runtime, scikit-learn
* **Database:** PostgreSQL (with atomic `SKIP LOCKED` worker queues)
* **Object Storage:** MinIO / AWS S3 compatible object storage
* **Evaluation:** Quadratic Weighted Kappa (QWK) per ASAP prompt

## 4. Requirements

### Hardware & Acceleration
* **Target Environment:** GPU-enabled training and inference environment.
* **Minimum GPU:** NVIDIA GPU with CUDA Compute Capability $\ge$ 7.0 (e.g., NVIDIA T4, RTX 2060, GTX 1660) with at least 4 GB dedicated VRAM.
* **Recommended GPU:** NVIDIA RTX 3060 / 4060, A10G, or V100 with $\ge$ 8 GB VRAM for batch fine-tuning (LoRA/PEFT) and low-latency inference.
* **Inference Latency Target:** $\le 300\text{ ms}$ per essay on modern Tensor-core GPUs with ONNX Runtime.
* **CPU Fallback:** The inference worker supports graceful fallback to CPU compute when no CUDA GPU is detected. Note that CPU inference latency will be higher (~1.5–3.0 s per essay).
* **Hardware Verification:** Run the provided verification script:
  ```bash
  python inference/check_env.py
  ```

### Software Prerequisites
* **Python:** Version 3.11+
* **CUDA Toolkit:** CUDA 12.1 (or 11.8+) with compatible NVIDIA Drivers ($\ge 525.xx$)
* **Node.js:** Node.js v18+ LTS and npm
* **Containerization:** Docker & Docker Compose (for PostgreSQL, MinIO, and multi-service staging)
* **Storage & DB:** PostgreSQL 15+ and MinIO (or AWS S3 compatible object storage)

## 5. Quickstart (Development)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Launch infrastructure using Docker Compose:
   ```bash
   docker compose up -d postgres minio
   ```
3. Run backend service:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
4. Run frontend application:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
