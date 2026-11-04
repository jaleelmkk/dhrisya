"use client";

import { useEffect, useMemo, useState } from "react";

type Art = { id: string; src: string; prompt: string; style: string; createdAt: number };

const DB_NAME = "dhrisya-gallery";
const STORE_NAME = "images";

function openGalleryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open image gallery."));
  });
}

async function readGallery(): Promise<Art[]> {
  const db = await openGalleryDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as Art[]).sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error || new Error("Could not read saved images."));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

async function writeGallery(items: Art[]): Promise<void> {
  const db = await openGalleryDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    for (const item of items.slice(0, 40)) store.put(item);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error("Could not save gallery.")); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error("Gallery save was cancelled.")); };
  });
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [style, setStyle] = useState("Realistic");
  const [count, setCount] = useState(1);
  const [ratio, setRatio] = useState("1:1");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [gallery, setGallery] = useState<Art[]>([]);
  const [galleryReady, setGalleryReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "gallery">("create");

  useEffect(() => {
    let cancelled = false;
    readGallery()
      .then(items => {
        if (!cancelled) {
          setGallery(items.slice(0, 40));
          setGalleryReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("Could not open the local gallery in this browser.");
          setGalleryReady(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!galleryReady) return;
    writeGallery(gallery).catch(() => {
      setStatus("The browser could not save all gallery images. Download any images you want to keep.");
    });
  }, [gallery, galleryReady]);

  const ready = useMemo(() => prompt.trim().length > 2 && !busy, [prompt, busy]);

  async function generate() {
    if (!ready) return;
    setBusy(true);
    setStatus("Preparing your images…");
    const created: Art[] = [];
    try {
      for (let i = 0; i < count; i++) {
        setStatus(`Generating image ${i + 1} of ${count}…`);
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, negativePrompt: negative, style, aspectRatio: ratio })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Image generation failed.");
        created.push({
          id: crypto.randomUUID(),
          src: payload.image,
          prompt,
          style,
          createdAt: Date.now()
        });
      }
      setGallery(current => [...created, ...current].slice(0, 40));
      setStatus(`${created.length} image${created.length === 1 ? "" : "s"} added to your gallery.`);
      setActiveTab("gallery");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong.");
      if (created.length) setGallery(current => [...created, ...current].slice(0, 40));
    } finally {
      setBusy(false);
    }
  }

  function download(art: Art) {
    const link = document.createElement("a");
    link.href = art.src;
    link.download = `dhrisya-${art.id}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function clearGallery() {
    if (confirm("Clear all images saved in this browser?")) setGallery([]);
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="border-b border-[#22283a]">
        <div className="shell flex items-center justify-between py-5">
          <a href="#" className="flex items-center gap-3 no-underline text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl font-black">D</span>
            <span><strong className="block text-lg tracking-wide">Dhrisya</strong><span className="text-xs muted">AI IMAGE STUDIO</span></span>
          </a>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Free access · No account</span>
        </div>
      </header>

      <section className="shell pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 text-xs font-bold uppercase tracking-[.28em] text-violet-300">Your imagination, rendered</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">Create something<br/><span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">worth seeing.</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 muted">Generate images from a prompt. Choose a visual style, refine what to avoid, and save your results.</p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          <div className="mb-4 flex gap-2">
            <button className={`pill ${activeTab === "create" ? "active" : ""}`} onClick={() => setActiveTab("create")}>Create</button>
            <button className={`pill ${activeTab === "gallery" ? "active" : ""}`} onClick={() => setActiveTab("gallery")}>Gallery ({gallery.length})</button>
          </div>

          {activeTab === "create" ? (
            <section className="panel p-5 sm:p-7">
              <label className="mb-2 block text-sm font-semibold">Describe your image</label>
              <textarea className="field min-h-32 resize-y" maxLength={1600} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="A quiet Kyoto street after rainfall, glowing paper lanterns, cinematic composition, intricate details…" />
              <div className="mt-1 text-right text-xs muted">{prompt.length}/1600</div>

              <div className="mt-6">
                <label className="mb-3 block text-sm font-semibold">Visual style</label>
                <div className="flex flex-wrap gap-2">
                  {["Realistic", "Anime"].map(item => <button key={item} onClick={() => setStyle(item)} className={`pill ${style === item ? "active" : ""}`}>{item}</button>)}
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold">Negative prompt <span className="font-normal muted">(optional)</span></label>
                <textarea className="field min-h-20 resize-y" maxLength={700} value={negative} onChange={e => setNegative(e.target.value)} placeholder="Things to avoid: blurry, text, watermark, distorted hands…" />
                <p className="mt-2 text-xs muted">Dhrisya passes exclusions as prompt guidance. The selected fast model may not support native negative-prompt conditioning.</p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold">Images</label>
                  <select className="field" value={count} onChange={e => setCount(Number(e.target.value))}>
                    {[1,2,3,4].map(n => <option key={n} value={n}>{n} image{n > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Aspect ratio</label>
                  <select className="field" value={ratio} onChange={e => setRatio(e.target.value)}>
                    <option>1:1</option><option>16:9</option><option>9:16</option>
                  </select>
                </div>
              </div>

              <button className="primary mt-7 w-full" disabled={!ready} onClick={generate}>{busy ? "Generating…" : "Generate images"}</button>
              {status && <p role="status" className="mt-4 text-center text-sm muted">{status}</p>}
              <p className="mt-4 text-center text-xs muted">Generation availability depends on the configured inference provider and its free quota.</p>
            </section>
          ) : (
            <section className="panel p-5 sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div><h2 className="text-xl font-bold">Your gallery</h2><p className="mt-1 text-xs muted">Saved in this browser only.</p></div>
                {gallery.length > 0 && <button className="pill text-xs" onClick={clearGallery}>Clear gallery</button>}
              </div>
              {gallery.length === 0 ? <div className="rounded-xl border border-dashed border-[#343c50] p-12 text-center text-sm muted">Your generated images will appear here.</div> :
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {gallery.map(art => <article key={art.id} className="overflow-hidden rounded-xl border border-[#2b3245] bg-[#0b0f19]">
                    <div className="aspect-square bg-[#171c2a]"><img className="gallery-image" src={art.src} alt={art.prompt} /></div>
                    <div className="p-3"><div className="mb-2 text-xs text-violet-300">{art.style}</div><p className="mb-3 line-clamp-2 text-xs muted">{art.prompt}</p><button className="pill w-full text-sm" onClick={() => download(art)}>Download PNG</button></div>
                  </article>)}
                </div>}
            </section>
          )}
        </div>
      </section>
      <footer className="shell mt-14 border-t border-[#22283a] pt-6 text-center text-xs muted">Dhrisya · Free image creation · Images stay in your browser gallery</footer>
    </main>
  );
}