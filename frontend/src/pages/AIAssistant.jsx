import { useEffect, useState } from "react";
import { Bot, Sparkles, BookOpenCheck, Layers3, AlertTriangle, Send, Loader2 } from "lucide-react";
import Topbar from "../components/Topbar";
import Loader from "../components/Loader";
import { api } from "../lib/api";
import { cx } from "../lib/utils";

const TABS = [
  { key: "chat", label: "Chat", icon: Bot },
  { key: "plan", label: "Study Plan", icon: Sparkles },
  { key: "explain", label: "Explain", icon: BookOpenCheck },
  { key: "flashcards", label: "Flashcards", icon: Layers3 },
  { key: "weak", label: "Weak Areas", icon: AlertTriangle },
];

export default function AIAssistant() {
  const [tab, setTab] = useState("chat");
  const [aiEnabled, setAiEnabled] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Study plan state
  const [days, setDays] = useState(7);
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Explain state
  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [explainLoading, setExplainLoading] = useState(false);

  // Flashcards state
  const [fcTopic, setFcTopic] = useState("");
  const [cards, setCards] = useState(null);
  const [fcLoading, setFcLoading] = useState(false);

  // Weak areas
  const [weak, setWeak] = useState(null);

  useEffect(() => {
    if (tab === "weak" && !weak) {
      api.get("/api/ai/weak-areas").then((d) => setWeak(d.weak_topics));
    }
  }, [tab, weak]);

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await api.post("/api/ai/chat", { message: userMsg });
      setAiEnabled(res.ai_generated);
      setMessages((m) => [...m, { role: "ai", text: res.reply }]);
    } finally {
      setChatLoading(false);
    }
  };

  const genPlan = async () => {
    setPlanLoading(true);
    try {
      const res = await api.post("/api/ai/study-plan", { days });
      setAiEnabled(res.ai_generated);
      setPlan(res);
    } finally {
      setPlanLoading(false);
    }
  };

  const genExplain = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setExplainLoading(true);
    try {
      const res = await api.post("/api/ai/explain", { topic });
      setAiEnabled(res.ai_generated);
      setExplanation(res.explanation);
    } finally {
      setExplainLoading(false);
    }
  };

  const genFlashcards = async (e) => {
    e.preventDefault();
    if (!fcTopic.trim()) return;
    setFcLoading(true);
    try {
      const res = await api.post("/api/ai/flashcards", { topic: fcTopic, count: 6 });
      setAiEnabled(res.ai_generated);
      setCards(res.flashcards);
    } finally {
      setFcLoading(false);
    }
  };

  return (
    <>
      <Topbar title="AI Assistant" subtitle="Study plans, explanations, flashcards, and more." />

      <div className="px-4 lg:px-8 py-6 max-w-3xl space-y-4">
        {aiEnabled === false && (
          <div className="rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs px-3.5 py-2.5">
            Running in offline mode — set <code className="font-mono">ANTHROPIC_API_KEY</code> in the backend's{" "}
            <code className="font-mono">.env</code> for real AI-generated responses.
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cx(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
                tab === key ? "bg-accent text-white" : "bg-surface-sunken text-ink-muted hover:text-ink"
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {tab === "chat" && (
          <div className="card p-4 flex flex-col h-[55vh]">
            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
              {messages.length === 0 && (
                <p className="text-sm text-ink-faint text-center pt-10">Ask anything about your studies.</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cx(
                      "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                      m.role === "user" ? "bg-accent text-white" : "bg-surface-sunken"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-sunken rounded-2xl px-3.5 py-2.5">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={sendChat} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Ask your study assistant…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="btn-primary !px-3.5" disabled={chatLoading}>
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {tab === "plan" && (
          <div className="card p-5">
            <div className="flex items-end gap-3 mb-4">
              <div className="flex-1">
                <label className="label">Plan length (days)</label>
                <input type="number" min="1" max="30" className="input" value={days} onChange={(e) => setDays(parseInt(e.target.value) || 7)} />
              </div>
              <button className="btn-primary" onClick={genPlan} disabled={planLoading}>
                {planLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                Generate
              </button>
            </div>
            {plan?.plan_text && <p className="text-sm whitespace-pre-line leading-relaxed">{plan.plan_text}</p>}
            {plan?.plan && (
              <div className="space-y-2.5">
                {plan.plan.map((d, i) => (
                  <div key={i} className="rounded-xl bg-surface-sunken p-3">
                    <p className="text-xs font-mono text-ink-muted mb-1">{d.day}</p>
                    <ul className="text-sm list-disc list-inside space-y-0.5">
                      {d.focus.map((f, j) => (
                        <li key={j}>{f}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "explain" && (
          <div className="card p-5">
            <form onSubmit={genExplain} className="flex gap-2 mb-4">
              <input className="input flex-1" placeholder="e.g. Binary search trees" value={topic} onChange={(e) => setTopic(e.target.value)} />
              <button type="submit" className="btn-primary !px-3.5" disabled={explainLoading}>
                {explainLoading ? <Loader2 size={15} className="animate-spin" /> : <BookOpenCheck size={15} />}
              </button>
            </form>
            {explanation && <p className="text-sm leading-relaxed whitespace-pre-line">{explanation}</p>}
          </div>
        )}

        {tab === "flashcards" && (
          <div className="space-y-4">
            <div className="card p-5">
              <form onSubmit={genFlashcards} className="flex gap-2">
                <input className="input flex-1" placeholder="e.g. TCP/IP layers" value={fcTopic} onChange={(e) => setFcTopic(e.target.value)} />
                <button type="submit" className="btn-primary !px-3.5" disabled={fcLoading}>
                  {fcLoading ? <Loader2 size={15} className="animate-spin" /> : <Layers3 size={15} />}
                </button>
              </form>
            </div>
            {cards && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cards.map((c, i) => (
                  <FlashcardTile key={i} front={c.front} back={c.back} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "weak" && (
          <div className="card p-5">
            {!weak ? (
              <Loader />
            ) : weak.length === 0 ? (
              <p className="text-sm text-ink-faint">No weak areas detected — nice work!</p>
            ) : (
              <div className="space-y-2.5">
                {weak.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-ink-muted">{t.subject_name}</p>
                    </div>
                    <span className="text-xs font-mono text-rose-500">{t.confidence_level}% confidence</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function FlashcardTile({ front, back }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      className="card p-5 text-left min-h-[110px] flex items-center hover:shadow-soft transition-shadow"
    >
      <p className="text-sm font-medium">{flipped ? back : front}</p>
    </button>
  );
}
