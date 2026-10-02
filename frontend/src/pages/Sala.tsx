import { useEffect, useRef, useState, type FormEvent, type UIEvent } from "react";
import { fetchChat, sendChat, type ChatMessage } from "@/lib/api";
import { isInsideTelegram } from "@/lib/telegram";
import { useTelegramBackButton } from "@/hooks/useTelegram";

const EMOJIS = ["😀", "😂", "🔥", "❤️", "👍", "👏", "😮", "😢", "✨", "🎉", "👀", "💀", "🤝", "📚", "⭐", "✅"];

function lastIdOf(messages: ChatMessage[]) {
  return messages.length ? messages[messages.length - 1].id : 0;
}

function atEnd(el: HTMLElement | null) {
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

export default function Sala() {
  useTelegramBackButton(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [me, setMe] = useState("…");
  const [banned, setBanned] = useState(false);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);
  const followRef = useRef(true);

  function scrollToEnd() {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  function onListScroll(event: UIEvent<HTMLDivElement>) {
    const following = atEnd(event.currentTarget);
    followRef.current = following;
    if (following) setUnseen(false);
  }

  useEffect(() => {
    if (!followRef.current) return;
    scrollToEnd();
  }, [messages]);

  useEffect(() => {
    if (!isInsideTelegram()) {
      setReady(true);
      return;
    }
    let stop = false;

    async function load(after: number) {
      const data = await fetchChat(after);
      if (stop) return;
      setMe(data.me.nickname);
      setBanned(data.banned);

      const follow = atEnd(scrollerRef.current);
      followRef.current = follow;
      setMessages((current) => {
        const map = new Map(current.map((item) => [item.id, item]));
        let added = false;
        for (const item of data.messages) {
          if (!map.has(item.id)) added = true;
          map.set(item.id, item);
        }
        if (!added && after > 0) return current;
        if (added && !follow) setUnseen(true);
        return [...map.values()].sort((a, b) => a.id - b.id);
      });

      const newest = lastIdOf(data.messages);
      if (newest > lastId.current) lastId.current = newest;
    }

    load(0)
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao abrir a sala."))
      .finally(() => setReady(true));

    const timer = window.setInterval(() => {
      load(lastId.current).catch(() => {});
    }, 4000);

    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || banned) return;
    const replyId = reply?.id ?? null;
    setDraft("");
    setReply(null);
    setEmojiOpen(false);
    followRef.current = true;
    setUnseen(false);
    try {
      await sendChat(text, replyId);
      const data = await fetchChat(lastId.current);
      setMessages((current) => {
        const map = new Map(current.map((item) => [item.id, item]));
        for (const item of data.messages) map.set(item.id, item);
        return [...map.values()].sort((a, b) => a.id - b.id);
      });
      const newest = lastIdOf(data.messages);
      if (newest > lastId.current) lastId.current = newest;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não enviou.");
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col pb-[calc(4.25rem+var(--tg-safe-bottom,0px))]">
      <header className="shrink-0 bg-bg/95 px-4 pb-3 pt-[max(1rem,var(--tg-safe-top))] backdrop-blur">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Sala</h1>
        <p className="mt-1 text-[13px] leading-snug text-muted">
          Seu nome aqui é aleatório. Ninguém vê seu Telegram.
          {me !== "…" ? ` Você é ${me}.` : ""}
        </p>
      </header>

      {!isInsideTelegram() ? (
        <p className="px-4 text-[14px] text-muted">Abra pelo bot do Telegram para escrever na sala.</p>
      ) : (
        <div ref={scrollerRef} onScroll={onListScroll} className="min-h-0 flex-1 overflow-y-auto px-4">
          {!ready ? (
            <p className="text-[14px] text-muted">Abrindo a sala…</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {messages.length === 0 && (
                <li className="text-[14px] text-muted">Ninguém falou ainda. Manda a primeira.</li>
              )}
              {messages.map((msg) => (
                <li key={msg.id} className={msg.mine ? "flex justify-end" : "flex"}>
                  <div className="max-w-[78%]">
                    <p className={`mb-1 text-[12px] text-muted ${msg.mine ? "text-right" : ""}`}>
                      {msg.mine ? `Você · ${msg.nickname}` : msg.nickname}
                    </p>
                    <div
                      className={
                        msg.mine
                          ? "rounded-2xl rounded-br-md bg-ink px-3 py-2 text-[14px] leading-relaxed text-bg"
                          : "rounded-2xl rounded-bl-md border border-border bg-surface px-3 py-2 text-[14px] leading-relaxed text-ink"
                      }
                    >
                      {msg.reply && (
                        <p className="mb-1 line-clamp-2 border-l-2 border-current/40 pl-2 text-[12px] opacity-80">
                          {msg.reply.nickname}: {msg.reply.body}
                        </p>
                      )}
                      <p>{msg.body}</p>
                    </div>
                    {!banned && (
                      <button
                        type="button"
                        onClick={() => setReply(msg)}
                        className={`mt-1 text-[11px] text-muted ${msg.mine ? "block w-full text-right" : ""}`}
                      >
                        Responder
                      </button>
                    )}
                  </div>
                </li>
              ))}
              <div ref={endRef} />
            </ul>
          )}
        </div>
      )}

      {error && <p className="px-4 py-2 text-[13px] text-red-400">{error}</p>}

      {isInsideTelegram() && (
        <form onSubmit={submit} className="shrink-0 border-t border-border bg-bg/95 px-3 py-2">
          {unseen && (
            <button
              type="button"
              onClick={() => {
                followRef.current = true;
                setUnseen(false);
                scrollToEnd();
              }}
              className="mx-auto mb-2 block rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-bg"
            >
              Novas mensagens
            </button>
          )}
          {reply && (
            <div className="mx-auto mb-2 flex max-w-md items-start justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2">
              <p className="min-w-0 text-[12px] text-muted">
                <span className="block font-semibold text-ink">Respondendo a {reply.nickname}</span>
                <span className="line-clamp-1">{reply.body}</span>
              </p>
              <button type="button" onClick={() => setReply(null)} className="shrink-0 text-[12px] text-ink">
                Cancelar
              </button>
            </div>
          )}
          {emojiOpen && (
            <div className="mx-auto mb-2 grid max-w-md grid-cols-8 gap-1 rounded-card border border-border bg-surface p-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="flex h-10 items-center justify-center text-[20px]"
                  onClick={() => setDraft((value) => value + emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <div className="mx-auto flex max-w-md gap-2">
            <button
              type="button"
              aria-label="Emojis"
              onClick={() => setEmojiOpen((open) => !open)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 10h.01M15 10h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={banned}
              placeholder={banned ? "Você não pode escrever" : "Escrever na sala"}
              className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-[14px] text-ink outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={banned || !draft.trim()}
              className="h-11 rounded-full bg-ink px-4 text-[14px] font-semibold text-bg disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}