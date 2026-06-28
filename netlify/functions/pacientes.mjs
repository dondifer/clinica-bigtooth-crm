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

// Tipos válidos
const TIPOS = ["pacientes", "facturas", "tratamientos", "radiografias"];

export default async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);

  const s = store();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const action = url.searchParams.get("action");
  const tipo = url.searchParams.get("tipo") || "pacientes";
  const now = new Date().toISOString();

  if (!TIPOS.includes(tipo)) return json({ error: "tipo inválido" }, 400);

  // ── DELETE ──
  if (req.method === "DELETE") {
    // Borrar todo (todos los tipos)
    if (!id || id === "all") {
      for (const t of TIPOS) await s.setJSON(t, []);
      return json({ ok: true, deleted: "all" });
    }
    // Borrar item del tipo indicado
    const data = (await s.get(tipo, { type: "json" })) || [];
    const filtered = data.filter(x => x.id !== id);
    await s.setJSON(tipo, filtered);

    // Si es paciente, cascada — borrar sus datos asociados
    if (tipo === "pacientes") {
      for (const t of ["facturas", "tratamientos", "radiografias"]) {
        const items = ((await s.get(t, { type: "json" })) || []).filter(x => x.paciente_id !== id);
        await s.setJSON(t, items);
      }
    }
    return json({ ok: true, deleted: id });
  }

  // ── POST ──
  if (req.method === "POST") {
    // Cargar demo
    if (action === "demo") {
      const demo = {
        pacientes: [
          { id:'p1', nombre:'Miren', apellidos:'Uriarte', fecha_nac:'1987-03-12', telefono:'666 123 456', email:'miren@example.com', zona:'Getxo', estado:'activo', alergias:'', historial:'Implante 21 colocado 03/2025', created_at:now },
          { id:'p2', nombre:'Eneko', apellidos:'Gaztañaga', fecha_nac:'1997-07-05', telefono:'677 234 567', email:'eneko@example.com', zona:'Bilbao', estado:'en_tratamiento', alergias:'Penicilina', historial:'Invisalign fase 3 en curso', created_at:now },
          { id:'p3', nombre:'Ainhoa', apellidos:'Bilbao', fecha_nac:'1979-11-22', telefono:'688 345 678', email:'ainhoa@example.com', zona:'Deusto', estado:'activo', alergias:'', historial:'Blanqueamiento completado 06/2025', created_at:now },
          { id:'p4', nombre:'Jon', apellidos:'Urrutia', fecha_nac:'1973-04-08', telefono:'699 456 789', email:'jon@example.com', zona:'Barakaldo', estado:'presupuesto', alergias:'', historial:'Pendiente aceptar implante unitario 950€', created_at:now },
          { id:'p5', nombre:'Leire', apellidos:'Mendoza', fecha_nac:'1993-09-30', telefono:'611 567 890', email:'leire@example.com', zona:'Leioa', estado:'nuevo', alergias:'', historial:'Primera visita 27/06/2025', created_at:now },
        ],
        facturas: [
          { id:'f1', paciente_id:'p3', numero:'F-2025-089', fecha:'2025-06-27', concepto:'Blanqueamiento LED', importe:320, pagada:true, created_at:now },
          { id:'f2', paciente_id:'p1', numero:'F-2025-088', fecha:'2025-06-26', concepto:'Implante fase 2', importe:580, pagada:true, created_at:now },
          { id:'f3', paciente_id:'p2', numero:'F-2025-085', fecha:'2025-06-17', concepto:'Invisalign pago parcial', importe:800, pagada:false, created_at:now },
          { id:'f4', paciente_id:'p1', numero:'F-2025-080', fecha:'2025-06-10', concepto:'Implante fase 1', importe:870, pagada:true, created_at:now },
          { id:'f5', paciente_id:'p3', numero:'F-2025-075', fecha:'2025-05-28', concepto:'Limpieza profesional', importe:65, pagada:true, created_at:now },
          { id:'f6', paciente_id:'p2', numero:'F-2025-070', fecha:'2025-05-15', concepto:'Invisalign inicial', importe:1200, pagada:true, created_at:now },
          { id:'f7', paciente_id:'p4', numero:'F-2025-068', fecha:'2025-05-10', concepto:'Primera visita + radiografía', importe:55, pagada:true, created_at:now },
        ],
        tratamientos: [
          { id:'t1', paciente_id:'p1', tipo:'Implante titanio', diente:'21', estado:'fase_2', inicio:'2025-03-15', fin_previsto:'2025-09-15', notas:'Osteointegración correcta. Pendiente corona.' },
          { id:'t2', paciente_id:'p2', tipo:'Invisalign', diente:'Arcada', estado:'en_curso', inicio:'2025-05-15', fin_previsto:'2025-12-17', notas:'Aligner 12 de 24.' },
          { id:'t3', paciente_id:'p3', tipo:'Blanqueamiento LED', diente:'Arcada sup.', estado:'completado', inicio:'2025-06-27', fin_previsto:'2025-06-27', notas:'Resultado excelente. Recomendar mantenimiento anual.' },
          { id:'t4', paciente_id:'p5', tipo:'Diagnóstico', diente:'-', estado:'programado', inicio:'2025-06-27', fin_previsto:'2025-06-27', notas:'Primera visita programada.' },
        ],
        radiografias: [
          { id:'r1', paciente_id:'p5', tipo:'Panorámica', dientes:'Arcada completa', fecha:'2025-06-27', notas:'Sin patología visible. Candidata a carillas.', archivos:[] },
          { id:'r2', paciente_id:'p1', tipo:'Periapical', dientes:'21, 22', fecha:'2025-03-14', notas:'Hueso adecuado para implante. Proceder fase 1.', archivos:[] },
          { id:'r3', paciente_id:'p4', tipo:'Aleta mordida', dientes:'16, 17, 26, 27', fecha:'2025-06-27', notas:'Caries interproximal leve en 17. Revisar.', archivos:[] },
        ]
      };
      for (const t of TIPOS) await s.setJSON(t, demo[t]);
      return json({ ok: true, mensaje: "Datos demo cargados" });
    }

    // Crear item (paciente, factura, tratamiento o radiografía)
    const body = await req.json();
    const data = (await s.get(tipo, { type: "json" })) || [];
    const nuevo = { id: crypto.randomUUID(), ...body, created_at: now };
    if (tipo === "radiografias" && !nuevo.archivos) nuevo.archivos = [];
    data.push(nuevo);
    await s.setJSON(tipo, data);
    return json({ ok: true, item: nuevo }, 201);
  }

  // ── PATCH ──
  if (req.method === "PATCH") {
    if (!id) return json({ error: "id requerido" }, 400);
    const body = await req.json();
    const data = (await s.get(tipo, { type: "json" })) || [];
    const idx = data.findIndex(x => x.id === id);
    if (idx === -1) return json({ error: "item no encontrado" }, 404);
    data[idx] = { ...data[idx], ...body, updated_at: now };
    await s.setJSON(tipo, data);
    return json({ ok: true, item: data[idx] });
  }

  // ── GET ──
  if (req.method === "GET") {
    if (action === "all") {
      const result = {};
      for (const t of TIPOS) result[t] = (await s.get(t, { type: "json" })) || [];
      return json(result);
    }
    const data = (await s.get(tipo, { type: "json" })) || [];
    return json(data);
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/pacientes" };
