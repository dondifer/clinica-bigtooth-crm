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

export default async (req) => {
  if (req.method === "OPTIONS") return json({}, 200);

  const s = store();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const action = url.searchParams.get("action");
  const now = new Date().toISOString();

  // DELETE — borrar paciente individual o todos
  if (req.method === "DELETE") {
    if (!id || id === "all") {
      await s.setJSON("pacientes", []);
      await s.setJSON("facturas", []);
      await s.setJSON("tratamientos", []);
      await s.setJSON("radiografias", []);
      return json({ ok: true, deleted: "all", mensaje: "Todos los pacientes y datos asociados eliminados" });
    }
    const pacientes = (await s.get("pacientes", { type: "json" })) || [];
    const filtered = pacientes.filter(p => p.id !== id);
    // Borrar también datos asociados
    const facturas = ((await s.get("facturas", { type: "json" })) || []).filter(f => f.paciente_id !== id);
    const tratamientos = ((await s.get("tratamientos", { type: "json" })) || []).filter(t => t.paciente_id !== id);
    const radiografias = ((await s.get("radiografias", { type: "json" })) || []).filter(r => r.paciente_id !== id);
    await s.setJSON("pacientes", filtered);
    await s.setJSON("facturas", facturas);
    await s.setJSON("tratamientos", tratamientos);
    await s.setJSON("radiografias", radiografias);
    return json({ ok: true, deleted: id });
  }

  // POST — crear paciente o cargar demo
  if (req.method === "POST") {
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
          { id:'t1', paciente_id:'p1', tipo:'Implante titanio', diente:'21', estado:'fase_2', inicio:'2025-03-15', fin_previsto:'2025-09-15' },
          { id:'t2', paciente_id:'p2', tipo:'Invisalign', diente:'Arcada', estado:'en_curso', inicio:'2025-05-15', fin_previsto:'2025-12-17' },
          { id:'t3', paciente_id:'p3', tipo:'Blanqueamiento LED', diente:'Arcada sup.', estado:'completado', inicio:'2025-06-27', fin_previsto:'2025-06-27' },
          { id:'t4', paciente_id:'p5', tipo:'Diagnóstico', diente:'-', estado:'programado', inicio:'2025-06-27', fin_previsto:'2025-06-27' },
        ],
        radiografias: [
          { id:'r1', paciente_id:'p5', tipo:'Panorámica', dientes:'Arcada completa', fecha:'2025-06-27', notas:'Sin patología visible. Candidata a carillas.' },
          { id:'r2', paciente_id:'p1', tipo:'Periapical', dientes:'21, 22', fecha:'2025-03-14', notas:'Hueso adecuado para implante. Proceder fase 1.' },
          { id:'r3', paciente_id:'p4', tipo:'Aleta mordida', dientes:'16, 17, 26, 27', fecha:'2025-06-27', notas:'Caries interproximal leve en 17. Revisar.' },
        ]
      };
      await s.setJSON("pacientes", demo.pacientes);
      await s.setJSON("facturas", demo.facturas);
      await s.setJSON("tratamientos", demo.tratamientos);
      await s.setJSON("radiografias", demo.radiografias);
      return json({ ok: true, mensaje: "Datos demo cargados", counts: { pacientes:5, facturas:7, tratamientos:4, radiografias:3 } });
    }

    const body = await req.json();
    const pacientes = (await s.get("pacientes", { type: "json" })) || [];
    const nuevo = { id: crypto.randomUUID(), ...body, created_at: now };
    pacientes.push(nuevo);
    await s.setJSON("pacientes", pacientes);
    return json({ ok: true, paciente: nuevo }, 201);
  }

  // PATCH — actualizar paciente
  if (req.method === "PATCH") {
    if (!id) return json({ error: "id requerido" }, 400);
    const body = await req.json();
    const pacientes = (await s.get("pacientes", { type: "json" })) || [];
    const idx = pacientes.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: "paciente no encontrado" }, 404);
    pacientes[idx] = { ...pacientes[idx], ...body, updated_at: now };
    await s.setJSON("pacientes", pacientes);
    return json({ ok: true, paciente: pacientes[idx] });
  }

  // GET — listar pacientes, facturas, tratamientos, radiografías
  if (req.method === "GET") {
    if (action === "all") {
      const pacientes = (await s.get("pacientes", { type: "json" })) || [];
      const facturas = (await s.get("facturas", { type: "json" })) || [];
      const tratamientos = (await s.get("tratamientos", { type: "json" })) || [];
      const radiografias = (await s.get("radiografias", { type: "json" })) || [];
      return json({ pacientes, facturas, tratamientos, radiografias });
    }
    const pacientes = (await s.get("pacientes", { type: "json" })) || [];
    return json(pacientes);
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/pacientes" };
