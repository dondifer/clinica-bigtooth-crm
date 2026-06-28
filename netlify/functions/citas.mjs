import { getStore } from "@netlify/blobs";

function store() { return getStore({ name: "bigtooth-citas", consistency: "strong" }); }
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}

export default async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);

  const s = store();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const now = new Date().toISOString();

  // POST = nueva cita desde la web
  if (req.method === "POST") {
    const body = await req.json();
    if (!body.nombre || !body.telefono) {
      return json({ error: "nombre y telefono son obligatorios" }, 400);
    }
    const citas = (await s.get("citas", { type: "json" })) || [];

    // Anti-duplicado: si en los últimos 60s ya hay una cita con mismo nombre+telefono, no la añadimos
    const dup = citas.find(c => c.nombre === body.nombre && c.telefono === body.telefono
      && (new Date(now).getTime() - new Date(c.created_at).getTime()) < 60000);
    if (dup) {
      return json({ ok: true, cita: dup, mensaje: "Cita ya registrada (duplicado evitado)" }, 200);
    }

    const nuevaCita = {
      id: crypto.randomUUID(),
      nombre: body.nombre,
      telefono: body.telefono,
      email: body.email || "",
      tratamiento: body.tratamiento || "Primera visita",
      mensaje: body.mensaje || "",
      estado: "pendiente",
      origen: body.origen || "web",
      created_at: now,
    };
    citas.push(nuevaCita);
    await s.setJSON("citas", citas);
    return json({ ok: true, cita: nuevaCita }, 201);
  }

  // GET = listar
  if (req.method === "GET") {
    const citas = (await s.get("citas", { type: "json" })) || [];
    return json(citas);
  }

  // DELETE = borrar una o todas
  if (req.method === "DELETE") {
    if (!id || id === "all") {
      await s.setJSON("citas", []);
      return json({ ok: true, deleted: "all" });
    }
    const citas = (await s.get("citas", { type: "json" })) || [];
    const filtered = citas.filter(c => c.id !== id);
    await s.setJSON("citas", filtered);
    return json({ ok: true, deleted: id });
  }

  // PATCH = actualizar estado
  if (req.method === "PATCH") {
    if (!id) return json({ error: "id requerido" }, 400);
    const body = await req.json();
    const citas = (await s.get("citas", { type: "json" })) || [];
    const idx = citas.findIndex(c => c.id === id);
    if (idx === -1) return json({ error: "cita no encontrada" }, 404);
    citas[idx] = { ...citas[idx], ...body, updated_at: now };
    await s.setJSON("citas", citas);
    return json({ ok: true, cita: citas[idx] });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/citas" };
