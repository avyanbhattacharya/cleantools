---
render: true
title: Local Chat (Local AI Lab)
description: Architecture and operating limits for Local Chat, the first browser-local module in Local AI Lab.
route: /docs/architecture/chatlocal/
index: false
section: Technical documentation
---

# Local Chat (Local AI Lab)

## Product hierarchy

Local Chat is the current ChatLocal route at `/chatlocal/` and the first module in **Local AI Lab** at `/local-ai-lab/`. The Lab landing page groups this experiment with planned local-first modules—Models, Files, Workspace, and Agents—without changing the existing chat route, controls, storage, or runtime contract.

Local AI Lab remains experimental and separate from Clean Local Tools production. It never falls back to cloud inference or sends prompts, conversations, or working files to an application server.

## Purpose

Local Chat is a browser-local chat assistant. It loads a quantized, open-weight instruction model into the visitor's browser and runs inference through WebGPU. It has no application backend, account, API key, prompt upload, or cloud-inference fallback.

## Runtime and model policy

- Runtime: `@mlc-ai/web-llm` version `0.2.85`, loaded from its pinned ESM package URL.
- Execution: a dedicated module Web Worker uses WebLLM's worker engine handler so model loading and token generation do not block the page UI.
- Default: `Phi-3-mini-4k-instruct-q4f16_1-MLC`.
- Optional stronger model: `Mistral-7B-Instruct-v0.3-q4f16_1-MLC`.
- Backend: WebGPU only. ChatLocal deliberately offers no CPU/WASM or remote fallback because a multi-gigabyte chat model would be an unreliable browser experience on those paths.

The model-selection UI makes the first-download size tradeoff explicit. Browser model assets use WebLLM's Cache API backend. A user can remove the selected cached model with the in-product control.

## Data and persistence

The page sends only model/runtime asset requests when it needs to obtain the pinned runtime or model. Conversation messages are passed from the page to the local worker and model; they are not sent to an application server or an AI API.

The active conversation is retained in a same-origin IndexedDB record so it survives a reload. It is capped at 24 messages, is never exported automatically, and has a visible Clear conversation control. The clear-model action affects model assets only and intentionally does not remove conversation history.

## Failure behavior

Before downloading model weights, ChatLocal checks secure context, WebGPU, worker support, IndexedDB availability, and performs a bounded WebGPU adapter probe. It then loads only the pinned runtime metadata and performs a no-download preflight for the selected model: required WebGPU features, declared storage-buffer requirement, browser-reported buffer limits, and compilation of a minimal compute pipeline. The diagnostics record the model's declared GPU-memory estimate alongside the browser-reported limits.

WebGPU intentionally does not reveal total available GPU memory, and a minimal pipeline cannot prove that every complex model shader will compile. The preflight is therefore a conservative hard stop for known incompatibilities—not a guarantee that model initialization will succeed. If the preflight or model initialization fails, ChatLocal leaves chat disabled and says that no cloud fallback will be used. A failed model operation does not delete the conversation already stored in the browser.

On setup failure, the page expands a local diagnostics panel. It records only runtime stages, browser capability flags, and error messages; it deliberately excludes chat messages and never transmits the report. The user can copy it for a bug report.

WebGPU availability is progressive enhancement for this route only; the rest of Clean Local Tools remains usable without it. The current browser tests verify the unsupported state and static tests verify the pinned runtime, worker, cache, streaming, model controls, and persistence contract. Physical-device performance, download duration, and GPU driver behavior remain manual validation items before any production release.
