# React for AI Engineering

A hands-on introduction to building AI interfaces with React. Includes a reusable chat widget and a deterministic demo transport. **The default app does not call an AI model.** A real AI backend is an extension exercise, described below.

## Run locally

Install Node.js 22.12 or newer, then:

```sh
git clone https://github.com/JCZY999/react-ai-engineering.git
cd react-ai-engineering
npm install
npm run dev
```

Open the local URL printed by Vite. Ask about `state` or `RAG`. Type `error` to try failure recovery, or click Cancel while a response is pending.

```sh
npm run build
npm run preview
```

## 1. Understand React's role

React manages the interface: inputs, conversation history, loading indicators, and feedback. A backend owns model credentials, retrieval, authorization, and tool execution. The browser should never receive a provider secret.

```text
React widget -> POST /api/chat -> your backend -> model / retrieval / tools
React widget <- { reply }     <- your backend <- generated answer
```

## 2. Read the widget

Start in `src/main.jsx`. `ChatWidget` is a function component; its JSX describes what the user sees. `messages`, `draft`, `busy`, and `error` are state. Event handlers update state, and React renders the result. Message IDs provide stable list keys. The request controller lives in a ref because it must survive renders without causing a render itself.

Follow `send`: prevent form navigation, validate input, append the user's turn, await a transport, then add the assistant response. A synchronous ref guard prevents duplicate requests. The UI disables submission while waiting. Cancellation restores the draft; errors provide an edit-and-retry path. Responses render as plain text rather than injected HTML.

## 3. Separate UI from inference

The `reply` prop is an asynchronous function receiving conversation history and an AbortSignal. `demoReply` implements this contract with canned responses. This lets you build and debug UI without provider costs or credentials. Exported `serverReply` implements the same contract with fetch.

To use your backend, replace `<ChatWidget/>` in the final render with:

```jsx
<ChatWidget reply={serverReply}/>
```

Implement a same-origin `POST /api/chat` endpoint (not included in this starter):

```json
{ "messages": [{ "role": "user", "content": "Explain RAG" }] }
```

Return HTTP 200 and:

```json
{ "reply": "RAG combines retrieval with generation." }
```

On the server, validate the request schema, bound message count and length, accept only user/assistant roles, and set your own system instructions. Load the model key from server environment variables. Call your chosen provider and map its response into `{ reply }`. Return non-2xx status codes for failures without leaking provider credentials or internal error details.

For local development, run your backend on port 3001 and add `vite.config.js`:

```js
import { defineConfig } from 'vite';
export default defineConfig({
  server: { proxy: { '/api': 'http://localhost:3001' } },
});
```

Vite's proxy is development-only. In production, serve `/api/chat` from your application backend or configure your hosting reverse proxy. `vite preview` alone will not provide that endpoint. Do not put secrets in `VITE_*` variables: those are exposed to browser code.

## 4. Build AI engineering features

| Exercise | Frontend responsibility | Backend responsibility |
| --- | --- | --- |
| Streaming | Append text chunks; display partial completion | Stream provider output; propagate disconnects |
| RAG | Render answer plus validated source links | Retrieve documents the user can access; attach citations |
| Tool calls | Show proposed actions and confirmation state | Validate arguments, enforce permissions, execute tools |
| Feedback | Collect rating and a response identifier | Store feedback with privacy controls and evaluate quality |

The starter uses complete JSON responses, not streaming. For streaming, define a protocol such as SSE or NDJSON and handle partial frames, UTF-8 boundaries, cancellation, and terminal errors explicitly. Client cancellation does not guarantee provider billing stops; your backend must propagate it.

## 5. Verify behavior

- Empty/whitespace messages cannot be sent.
- `state` and `RAG` return distinct demo responses.
- `error` shows an alert; Edit and retry restores the prompt without duplicating it.
- Cancel restores the original draft and removes the pending turn.
- Clear resets the conversation; rapid clicks do not send duplicate requests.
- Keyboard users can reach all controls; narrow screens remain usable.

Before a public deployment with real inference, add authentication, server-side rate limits, request timeouts, usage limits, and a deliberate conversation retention policy. This educational starter has no persistence, backend, or production access controls.

## Learn more

- [React quick start](https://react.dev/learn)
- [Vite guide](https://vite.dev/guide/)
- [Vite environment variables](https://vite.dev/guide/env-and-mode)
- [assistant-ui: React AI chat components](https://github.com/assistant-ui/assistant-ui)

Suggested learning order: run the demo, read the state transitions, change the appearance, implement the API contract, then add retrieval or streaming.
