import { NextResponse } from "next/server";
import { authenticated, fail, isUuid, rateLimited, readJsonBody } from "@/lib/api";
import { localDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type LetterInput = {
  id?: unknown;
  clientId?: unknown;
  subject?: unknown;
  status?: unknown;
  recipient?: unknown;
  recipientAddress?: unknown;
  reference?: unknown;
  date?: unknown;
  content?: unknown;
};

const statuses = new Set(["brouillon", "finalisé", "envoyé", "archivé"]);
const nodeTypes = new Set(["doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "hardBreak", "horizontalRule"]);
const markTypes = new Set(["bold", "italic", "strike", "underline", "code", "link"]);

function validContent(root: unknown) {
  let nodes = 0;
  let textLength = 0;

  function visit(value: unknown, depth: number): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value) || depth > 20 || ++nodes > 2_000) return false;
    const node = value as Record<string, unknown>;
    if (typeof node.type !== "string" || !nodeTypes.has(node.type)) return false;
    if (Object.keys(node).some((key) => !["type", "text", "content", "marks", "attrs"].includes(key))) return false;

    if (node.type === "text") {
      if (typeof node.text !== "string" || (textLength += node.text.length) > 100_000 || node.content !== undefined) return false;
    } else if (node.text !== undefined) {
      return false;
    }

    if (node.attrs !== undefined) {
      if (!node.attrs || typeof node.attrs !== "object" || Array.isArray(node.attrs)) return false;
      const attrs = node.attrs as Record<string, unknown>;
      if (node.type === "heading") {
        if (attrs.level !== 2 || Object.keys(attrs).some((key) => key !== "level")) return false;
      } else if (node.type === "codeBlock") {
        if ((attrs.language !== undefined && attrs.language !== null && typeof attrs.language !== "string") || Object.keys(attrs).some((key) => key !== "language")) return false;
      } else if (Object.keys(attrs).length > 0) {
        return false;
      }
    }

    if (node.marks !== undefined) {
      if (!Array.isArray(node.marks) || node.type !== "text" || node.marks.length > 8) return false;
      for (const rawMark of node.marks) {
        if (!rawMark || typeof rawMark !== "object" || Array.isArray(rawMark)) return false;
        const mark = rawMark as Record<string, unknown>;
        if (typeof mark.type !== "string" || !markTypes.has(mark.type) || Object.keys(mark).some((key) => !["type", "attrs"].includes(key))) return false;
        if (mark.type === "link") {
          if (!mark.attrs || typeof mark.attrs !== "object" || Array.isArray(mark.attrs)) return false;
          const attrs = mark.attrs as Record<string, unknown>;
          if (typeof attrs.href !== "string" || !/^(https?:|mailto:|tel:)/i.test(attrs.href.trim())) return false;
          if (Object.keys(attrs).some((key) => !["href", "target", "rel", "class"].includes(key))) return false;
        } else if (mark.attrs !== undefined && (!mark.attrs || typeof mark.attrs !== "object" || Array.isArray(mark.attrs) || Object.keys(mark.attrs).length > 0)) {
          return false;
        }
      }
    }

    if (node.content === undefined) return ["text", "paragraph", "heading", "blockquote", "codeBlock", "hardBreak", "horizontalRule"].includes(node.type);
    return Array.isArray(node.content) && node.content.length <= 1_000 && node.content.every((child) => visit(child, depth + 1));
  }

  return visit(root, 0) && (root as Record<string, unknown>).type === "doc";
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parse(input: LetterInput) {
  const subject = text(input.subject, 200);
  const status = typeof input.status === "string" && statuses.has(input.status) ? input.status : "brouillon";
  const content = input.content;
  if (!subject || !validContent(content)) return null;

  const payload = {
    recipient: text(input.recipient, 200),
    recipientAddress: text(input.recipientAddress, 1000),
    reference: text(input.reference, 120),
    date: typeof input.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : localDate(),
    content,
  };

  if (JSON.stringify(payload).length > 150_000) return null;
  return { subject, status, payload };
}

export async function GET() {
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "letters:read", 120); if (limited) return limited;

  const { data, error } = await db
    .from("letters")
    .select("id,client_id,subject,status,payload,created_at,updated_at")
    .eq("user_id", user)
    .order("updated_at", { ascending: false });

  if (error) return fail("Impossible de charger les courriers.", 503);
  return NextResponse.json({
    letters: (data || []).map((row) => ({
      ...(row.payload as Record<string, unknown>),
      id: row.id,
      clientId: row.client_id,
      subject: row.subject,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
}

async function write(request: Request, updating: boolean) {
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "letters:write"); if (limited) return limited;
  const body = await readJsonBody<LetterInput>(request, 160_000); if (body.response) return body.response;
  const input = body.data!;

  const parsed = parse(input);
  if (!parsed) return fail("Renseignez l’objet et le contenu du courrier.", 400);
  if (updating && !isUuid(input.id)) return fail("Courrier introuvable.", 400);
  const clientId = isUuid(input.clientId) ? input.clientId : null;
  const values = { client_id: clientId, ...parsed };

  const result = updating
    ? await db.from("letters").update(values).eq("id", input.id).eq("user_id", user).select("id").single()
    : await db.from("letters").insert({ user_id: user, ...values }).select("id").single();

  if (result.error) return fail("Enregistrement du courrier impossible.", 409);
  return NextResponse.json({ letter: { id: result.data.id, clientId, ...parsed.payload, subject: parsed.subject, status: parsed.status } }, { status: updating ? 200 : 201 });
}

export async function POST(request: Request) {
  return write(request, false);
}

export async function PUT(request: Request) {
  return write(request, true);
}

export async function DELETE(request: Request) {
  const { db, user } = await authenticated();
  if (!user) return fail("Connexion requise.", 401);
  const limited = await rateLimited(db, "letters:write"); if (limited) return limited;
  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return fail("Courrier introuvable.", 400);
  const { error } = await db.from("letters").delete().eq("id", id).eq("user_id", user);
  return error ? fail("Suppression impossible.", 503) : NextResponse.json({ deleted: true });
}
