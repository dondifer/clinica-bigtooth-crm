import { getStore } from "@netlify/blobs";

function store() { return getStore({ name: "bigtooth-data", consistency: "strong" }); }
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}

// Entidades válidas (clave en blob storage)
const ENTIDADES = ['tratamientos', 'facturas', 'radiografias'];

export default async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const id = url.searchParams.get("id");

  if (!tipo || !ENTIDADES.includes(tipo)) {
    return json({ error: `tipo debe ser uno de: ${ENTIDADES.join(', ')}` }, 400);
  }

  const s = store();
  const now = new Date().toISOString();

  // GET — listar todos de una entidad
  if (req.method === "GET") {
    const items = (await s.get(tipo, { type: "json" })) || [];
    return json(items);
  }

  // POST — crear nuevo
  if (req.method === "POST") {
    const body = await req.json();
    const items = (await s.get(tipo, { type: "json" })) || [];
    const nuevo = { id: crypto.randomUUID(), ...body, created_at: now };
    items.push(nuevo);
    await s.setJSON(tipo, items);
    return json({ ok: true, item: nuevo }, 201);
  }

  // PATCH — actualizar
  if (req.method === "PATCH") {
    if (!id) return json({ error: "id requerido" }, 400);
    const body = await req.json();
    const items = (await s.get(tipo, { type: "json" })) || [];
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return json({ error: "no encontrado" }, 404);
    items[idx] = { ...items[idx], ...body, updated_at: now };
    await s.setJSON(tipo, items);
    return json({ ok: true, item: items[idx] });
  }

  // DELETE — borrar uno o todos
  if (req.method === "DELETE") {
    if (!id || id === "all") {
      await s.setJSON(tipo, []);
      return json({ ok: true, deleted: "all" });
    }
    const items = (await s.get(tipo, { type: "json" })) || [];
    const filtered = items.filter(i => i.id !== id);
    await s.setJSON(tipo, filtered);
    return json({ ok: true, deleted: id });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/datos" };
