---
render: true
title: ChatLocal
description: Architecture and operating limits for browser-local ChatLocal conversations.
route: /docs/architecture/chatlocal/
index: false
section: Technical documentation
---

# ChatLocal

## Purpose

ChatLocal is a browser-local chat assistant. It loads a quantized, open-weight instruction model into the visitor's browser and runs inference through WebGPU. It has no application backend, account, API key, prompt upload, or cloud-inference fallback.

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

Before downloading the runtime, ChatLocal checks secure context, WebGPU, worker support, IndexedDB availability, and performs a bounded WebGPU adapter probe. If the probe or model initialization fails, it leaves chat disabled and says that no cloud fallback will be used. A failed model operation does not delete the conversation already stored in the browser.

On setup failure, the page expands a local diagnostics panel. It records only runtime stages, browser capability flags, and error messages; it deliberately excludes chat messages and never transmits the report. The user can copy it for a bug report.

WebGPU availability is progressive enhancement for this route only; the rest of Clean Local Tools remains usable without it. The current browser tests verify the unsupported state and static tests verify the pinned runtime, worker, cache, streaming, model controls, and persistence contract. Physical-device performance, download duration, and GPU driver behavior remain manual validation items before any production release.
