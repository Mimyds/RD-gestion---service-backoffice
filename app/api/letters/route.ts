import { NextResponse } from "next/server";
import { authenticated, fail, isUuid } from "@/lib/api";
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

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parse(input: LetterInput) {
  const subject = text(input.subject, 200);
  const status = typeof input.status === "string" && statuses.has(input.status) ? input.status : "brouillon";
  const content = input.content;
  if (!subject || !content || typeof content !== "object" || Array.isArray(content)) return null;

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

  let input: LetterInput;
  try {
    input = await request.json();
  } catch {
    return fail("Données invalides.", 400);
  }

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
  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return fail("Courrier introuvable.", 400);
  const { error } = await db.from("letters").delete().eq("id", id).eq("user_id", user);
  return error ? fail("Suppression impossible.", 503) : NextResponse.json({ deleted: true });
}
