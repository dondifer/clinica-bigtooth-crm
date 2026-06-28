import { getStore } from "@netlify/blobs";

function store() { return getStore({ name: "bigtooth-citas", consistency: "strong" }); }
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}

export default async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);

  const s = store();
  const now = new Date().toISOString();

  // POST = nueva solicitud de cita desde la web pública
  if (req.method === "POST") {
    const body = await req.json();
    if (!body.nombre || !body.telefono) {
      return json({ error: "nombre y telefono son obligatorios" }, 400);
    }

    const citas = (await s.get("citas", { type: "json" })) || [];
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
    return json({ ok: true, cita: nuevaCita, mensaje: "Cita registrada correctamente" }, 201);
  }

  // GET = listar todas las citas (lo usa el CRM)
  if (req.method === "GET") {
    const citas = (await s.get("citas", { type: "json" })) || [];
    return json(citas);
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/citas" };
