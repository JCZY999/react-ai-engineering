import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

// Swap this function for a server transport without rewriting the widget.
async function demoReply(messages, { signal }) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 600);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Cancelled', 'AbortError'));
    }, { once: true });
  });
  const prompt = messages.at(-1).content.toLowerCase();
  if (prompt.includes('error')) throw new Error('Demo error. Try another message.');
  if (prompt.includes('rag')) return 'RAG retrieves relevant documents on your server, adds that context to a model request, and returns an answer with sources. React displays the answer and source links.';
  if (prompt.includes('state')) return 'React state stores the message list, draft, loading status, and errors. Updating state causes the widget to render the current conversation.';
  return 'This is a simulated reply, not a model response. Try asking about state or RAG, or type error to exercise failure handling. Read the tutorial to connect your own AI backend.';
}

export async function serverReply(messages, { signal }) {
  const response = await fetch('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })) }), signal,
  });
  if (!response.ok) throw new Error(`Chat request failed (${response.status}).`);
  const data = await response.json();
  if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('The server returned an invalid reply.');
  return data.reply;
}

export function ChatWidget({ reply = demoReply }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function send(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || controller.current) return;
    const request = new AbortController();
    controller.current = request;
    const next = [...messages, { id: crypto.randomUUID(), role: 'user', content }];
    setBusy(true); setError(''); setMessages(next); setDraft('');
    try {
      const answer = await reply(next, { signal: request.signal });
      if (!request.signal.aborted) setMessages([...next, { id: crypto.randomUUID(), role: 'assistant', content: answer }]);
    } catch (err) {
      if (!request.signal.aborted) setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      // Cancelled turns are removed; failed turns remain until Edit and retry.
      if (request.signal.aborted) { setMessages(messages); setDraft(content); }
      controller.current = null; setBusy(false);
    }
  }
  function retry() {
    const last = messages.at(-1);
    if (last?.role === 'user') { setDraft(last.content); setMessages(messages.slice(0,-1)); }
    setError('');
  }
  return <section className="widget" aria-label="AI chat demo">
    <div className="messages" role="log" aria-live="polite" aria-relevant="additions text">
      {!messages.length && <p className="empty">Ask about React state or RAG to get started.</p>}
      {messages.map(message => <article key={message.id} className={message.role}><strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong><p>{message.content}</p></article>)}
    </div>
    <p role="status">{busy ? 'Preparing a reply…' : 'Ready'}</p>
    {error && <div role="alert">{error} <button onClick={retry}>Edit and retry</button></div>}
    <form onSubmit={send}>
      <label htmlFor="prompt">Your message</label>
      <textarea id="prompt" value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000} disabled={busy || !!error} rows={3}/>
      <div className="actions"><button disabled={busy || !!error || !draft.trim()}>Send</button>{busy && <button type="button" onClick={() => controller.current?.abort()}>Cancel</button>}<button type="button" disabled={busy} onClick={() => { setMessages([]); setDraft(''); setError(''); }}>Clear</button></div>
    </form>
  </section>;
}

createRoot(document.getElementById('root')).render(<main><span className="eyebrow">REACT × AI ENGINEERING</span><h1>Your first AI interface.</h1><p>Learn components, state, async requests, and the boundary between your UI and AI backend.</p><p className="badge">Demo mode · No API key · No messages leave your browser</p><ChatWidget/></main>);
