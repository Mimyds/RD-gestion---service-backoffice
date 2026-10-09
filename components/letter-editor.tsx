"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Check,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  RemoveFormatting,
  SpellCheck2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { useRef, useState } from "react";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/utils";

export type ProofreadMatch = {
  message: string;
  offset: number;
  length: number;
  replacements: string[];
  ruleId: string;
  category: string;
};

type LetterEditorProps = {
  content: JSONContent;
  onChange: (content: JSONContent) => void;
};

const toolClass = "inline-grid size-9 place-items-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40";

function ToolbarButton({
  active = false,
  label,
  onClick,
  disabled = false,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return <button type="button" aria-label={label} title={label} aria-pressed={active} disabled={disabled} onClick={onClick} className={cn(toolClass, active && "bg-accent text-foreground")}>{children}</button>;
}

function documentIndex(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n", "\n");
  const positions: number[] = [];
  let cursor = 0;

  editor.state.doc.descendants((node, position) => {
    if (!node.isText || !node.text) return;
    const index = text.indexOf(node.text, cursor);
    if (index < 0) return;
    for (let offset = 0; offset < node.text.length; offset += 1) positions[index + offset] = position + offset;
    cursor = index + node.text.length;
  });

  return { text, positions };
}

export function LetterEditor({ content, onChange }: LetterEditorProps) {
  const [matches, setMatches] = useState<ProofreadMatch[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const preserveMatchesOnUpdate = useRef(false);
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "min-h-[360px] px-5 py-4 text-[15px] leading-7 text-foreground outline-none",
        spellcheck: "true",
        lang: "fr",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON());
      if (preserveMatchesOnUpdate.current) preserveMatchesOnUpdate.current = false;
      else setMatches([]);
      setError("");
    },
  });

  async function proofread() {
    if (!editor) return;
    const { text } = documentIndex(editor);
    if (!text.trim()) {
      setError("Rédigez le contenu du courrier avant de lancer la vérification.");
      return;
    }

    setChecking(true);
    setError("");
    try {
      const response = await apiFetch("/api/proofread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Correction indisponible.");
      setMatches(result.matches || []);
    } catch (cause) {
      setMatches([]);
      setError(cause instanceof Error ? cause.message : "Correction indisponible.");
    } finally {
      setChecking(false);
    }
  }

  function apply(match: ProofreadMatch, replacement: string) {
    if (!editor) return;
    const { positions } = documentIndex(editor);
    const from = positions[match.offset];
    const last = positions[match.offset + match.length - 1];
    if (from === undefined || last === undefined) {
      setError("Le texte a changé. Relancez la vérification.");
      return;
    }
    const changedEnd = match.offset + match.length;
    const offsetDelta = replacement.length - match.length;
    const remainingMatches = matches.flatMap((candidate) => {
      if (candidate === match) return [];
      const candidateEnd = candidate.offset + candidate.length;
      if (candidateEnd <= match.offset) return [candidate];
      if (candidate.offset >= changedEnd) return [{ ...candidate, offset: candidate.offset + offsetDelta }];
      return [];
    });
    preserveMatchesOnUpdate.current = true;
    editor.view.dispatch(editor.state.tr.insertText(replacement, from, last + 1));
    editor.commands.focus();
    setMatches(remainingMatches);
  }

  if (!editor) return <div className="min-h-[420px] animate-pulse rounded-xl border bg-muted/40" />;

  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
    <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
        <ToolbarButton label="Annuler" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17}/></ToolbarButton>
        <ToolbarButton label="Rétablir" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17}/></ToolbarButton>
        <span className="mx-1 h-6 w-px bg-border"/>
        <ToolbarButton label="Paragraphe" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow size={17}/></ToolbarButton>
        <ToolbarButton label="Titre" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17}/></ToolbarButton>
        <ToolbarButton label="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17}/></ToolbarButton>
        <ToolbarButton label="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17}/></ToolbarButton>
        <ToolbarButton label="Barré" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={17}/></ToolbarButton>
        <ToolbarButton label="Liste à puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17}/></ToolbarButton>
        <ToolbarButton label="Liste numérotée" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17}/></ToolbarButton>
        <ToolbarButton label="Effacer la mise en forme" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={17}/></ToolbarButton>
        <button type="button" onClick={proofread} disabled={checking} className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          <SpellCheck2 size={17}/>{checking ? "Vérification…" : "Vérifier"}
        </button>
      </div>
      <EditorContent editor={editor} className="[&_.ProseMirror_h2]:my-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_ol]:my-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-7 [&_.ProseMirror_p]:my-3 [&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-7"/>
    </div>
    <aside className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">Suggestions</h3>
        {matches.length > 0 ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{matches.length}</span> : null}
      </div>
      {error ? <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : matches.length === 0 ? <div className="py-8 text-center text-sm leading-6 text-muted-foreground">
        <SpellCheck2 className="mx-auto mb-3" size={28}/>
        Cliquez sur « Vérifier » pour analyser l’orthographe et la grammaire.
      </div> : <div className="max-h-[430px] space-y-3 overflow-auto pr-1">
        {matches.map((match, index) => <article key={`${match.ruleId}-${match.offset}-${index}`} className="rounded-lg border p-3 text-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{match.category}</p>
          <p className="mb-3 leading-5">{match.message}</p>
          {match.replacements.length > 0 ? <div className="flex flex-wrap gap-2">{match.replacements.map((replacement) => <button key={replacement} type="button" onMouseDown={(event) => { event.preventDefault(); apply(match, replacement); }} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 font-semibold hover:bg-accent"><Check size={14}/>{replacement || "Supprimer"}</button>)}</div> : <p className="text-xs text-muted-foreground">Aucune correction automatique proposée.</p>}
        </article>)}
      </div>}
    </aside>
  </div>;
}
