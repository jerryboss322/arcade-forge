"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useArcade } from "@/components/providers/ArcadeProvider";
import { validateHtml5BundleEntries } from "@/lib/discovery/algorithms";
import { listZipEntries, readZipEntryText } from "@/lib/upload/zip";
import { STARFIELD_HTML5_BUNDLE } from "@/lib/store/arcade-store";

type Step = 1 | 2 | 3;

export default function UploadPage() {
  const router = useRouter();
  const { publishHtml5Bundle, pushToast } = useArcade();

  const [step, setStep] = useState<Step>(1);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileList, setFileList] = useState<string[]>([]);
  const [srcDoc, setSrcDoc] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("Arcade, Upload");
  const [controls, setControls] = useState("WASD / Arrow keys to move");
  const [testRunning, setTestRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setErrors([]);
    setFileName(file.name);
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".html") || lower.endsWith(".htm")) {
        const res = validateHtml5BundleEntries(["index.html"], file.size);
        if (!res.valid) {
          setErrors(res.errors);
          return;
        }
        setFileList(["index.html"]);
        setSrcDoc(await file.text());
      } else if (lower.endsWith(".zip")) {
        const buf = await file.arrayBuffer();
        const entries = listZipEntries(buf);
        const names = entries.map((e) => e.name);
        const total = entries.reduce((s, e) => s + e.uncompressedSize, 0);
        const res = validateHtml5BundleEntries(names, Math.max(total, file.size));
        setFileList(names);
        if (!res.valid) {
          setErrors(res.errors);
          return;
        }
        const indexEntry = entries.find(
          (e) => e.name.replace(/^\.\//, "").toLowerCase() === "index.html"
        )!;
        setSrcDoc(await readZipEntryText(buf, indexEntry));
      } else {
        setErrors(["Upload a .zip bundle or a single self-contained .html file."]);
        return;
      }
      if (!title) {
        setTitle(file.name.replace(/\.(zip|html?)$/i, "").replace(/[-_]+/g, " "));
      }
      setStep(2);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Could not read file."]);
    }
  };

  const loadSample = () => {
    setErrors([]);
    setFileName("starfield-sample.html");
    setFileList(["index.html"]);
    setSrcDoc(STARFIELD_HTML5_BUNDLE);
    setTitle("Starfield Hyperdrive Remaster");
    setDescription("Sample HTML5 canvas bundle demonstrating the sandboxed iframe and postMessage score bridge.");
    setStep(2);
  };

  const handlePublish = () => {
    const game = publishHtml5Bundle({
      title: title.trim().slice(0, 60) || "Untitled Bundle",
      description: description.trim().slice(0, 500),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5),
      controlsGuide: controls,
      htmlBundleSrcDoc: srcDoc,
      bundleFileList: fileList,
    });
    pushToast(`"${game.title}" is live in the arcade!`, "teal");
    router.push(`/game/${game.slug}`);
  };

  const steps = ["Bundle", "Details", "Test & Publish"];

  return (
    <div className="max-w-[720px] mx-auto px-4 pt-8 space-y-6">
      <div>
        <span className="font-display text-xs uppercase tracking-wider text-accent-2">Indie Dev Portal</span>
        <h1 className="text-3xl font-bold text-text mt-1">Upload an HTML5 Game</h1>
        <p className="text-sm text-text-muted mt-1 max-w-prose">
          Bundles run in a sandboxed iframe with no access to your ArcadeForge session. Max 10 MB.
        </p>
      </div>

      {/* 3-step indicator */}
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const done = step > n;
          return (
            <li
              key={label}
              className={`px-3 py-2 rounded-control border-2 text-xs font-semibold flex items-center gap-2 ${
                active
                  ? "border-accent bg-surface text-text"
                  : done
                  ? "border-accent-2 bg-surface text-accent-2"
                  : "border-border bg-surface text-text-muted"
              }`}
            >
              <span className="font-display">{done ? "✓" : n}</span>
              <span>{label}</span>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <section className="space-y-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) void handleFile(f);
            }}
            className={`h-60 rounded-card border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
              dragOver ? "border-accent bg-surface-2" : "border-border bg-surface hover:border-text-muted"
            }`}
          >
            <span className="font-display text-2xl text-accent">⇪</span>
            <p className="text-sm font-semibold text-text">Drop a .zip or .html file here</p>
            <p className="text-xs text-text-muted">or click to browse • index.html must be at the root</p>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,.html,.htm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </div>

          {errors.length > 0 && (
            <div role="alert" className="p-3 rounded-control border-2 border-danger bg-danger/10 text-danger text-xs space-y-1">
              <p className="font-bold">{fileName} couldn&apos;t be accepted:</p>
              <ul className="list-disc pl-4">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={loadSample}
            className="text-xs font-semibold text-accent-2 hover:underline"
          >
            No bundle handy? Use the sample Starfield game →
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-card border-2 border-border bg-surface p-5 shadow-arcade space-y-4 text-sm">
          <p className="text-xs text-text-muted font-mono">
            {fileName} • {fileList.length} file(s): {fileList.slice(0, 6).join(", ")}
            {fileList.length > 6 ? "…" : ""}
          </p>
          <label className="block">
            <span className="block text-xs font-semibold uppercase text-text-muted mb-1">Title</span>
            <input
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-control bg-surface-2 border-2 border-border focus:border-accent text-text"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold uppercase text-text-muted mb-1">Description</span>
            <textarea
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-control bg-surface-2 border-2 border-border focus:border-accent text-text"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold uppercase text-text-muted mb-1">Tags (max 5)</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full h-10 px-3 rounded-control bg-surface-2 border-2 border-border focus:border-accent text-text"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase text-text-muted mb-1">Controls</span>
              <input
                value={controls}
                onChange={(e) => setControls(e.target.value)}
                className="w-full h-10 px-3 rounded-control bg-surface-2 border-2 border-border focus:border-accent text-text"
              />
            </label>
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-10 px-4 rounded-control border-2 border-border text-xs font-semibold text-text-muted"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={!title.trim()}
              onClick={() => setStep(3)}
              className="h-10 px-4 rounded-control bg-accent disabled:opacity-40 text-bg font-semibold text-xs border-2 border-black shadow-arcade-sm"
            >
              Next: Test →
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <div className="rounded-card border-2 border-border bg-bg overflow-hidden aspect-[4/3] shadow-arcade-lg">
            {testRunning ? (
              <iframe
                title="Bundle test run"
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-pointer-lock"
                className="w-full h-full border-0"
              />
            ) : (
              <button
                type="button"
                onClick={() => setTestRunning(true)}
                className="w-full h-full flex flex-col items-center justify-center gap-2 text-text"
              >
                <span className="h-12 px-6 rounded-control bg-accent-2 text-bg font-display uppercase font-bold flex items-center border-2 border-black shadow-arcade">
                  ▶ Test in Sandbox
                </span>
                <span className="text-xs text-text-muted">Loads only after you click</span>
              </button>
            )}
          </div>
          <p className="text-xs text-text-muted max-w-prose">
            Note: this MVP inlines <code className="font-mono">index.html</code> only. Bundles with external
            assets need the object-storage pipeline (M4) and a separate games origin.
          </p>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => {
                setTestRunning(false);
                setStep(2);
              }}
              className="h-10 px-4 rounded-control border-2 border-border text-xs font-semibold text-text-muted"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handlePublish}
              className="h-10 px-5 rounded-control bg-accent text-bg font-display uppercase font-bold text-xs border-2 border-black shadow-arcade-sm"
            >
              Publish to Arcade →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
