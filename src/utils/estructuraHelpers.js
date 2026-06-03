// ======================= HELPERS DE ESTRUCTURA =======================

// Normaliza CI (solo números)
export const normalizeCI = (ci) =>
  String(ci || "").replace(/\D/g, "");

// Formatear CI con separador de miles (ej: 4321080 -> 4.321.080)
export const formatCI = (ci) => {
  const num = parseInt(normalizeCI(ci), 10);
  if (isNaN(num)) return ci || "";
  return num.toLocaleString("es-PY");
};

// Normaliza texto para búsqueda (sin tildes, minúsculas)
export const normalizeText = (text) =>
  String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// ======================= SUBCOORDINADORES DEL COORD =======================
export const getMisSubcoordinadores = (estructura, currentUser) => {
  if (!currentUser || currentUser.role !== "coordinador") return [];

  return estructura.subcoordinadores.filter(
    (s) => normalizeCI(s.coordinador_ci) === normalizeCI(currentUser.ci)
  );
};

// ======================= VOTANTES DE UN SUBCOORD =======================
export const getVotantesDeSubcoord = (estructura, subCi) => {
  return estructura.votantes.filter(
    (v) => normalizeCI(v.asignado_por) === normalizeCI(subCi)
  );
};

// ======================= MIS VOTANTES =======================
export const getMisVotantes = (estructura, currentUser) => {
  if (!currentUser) return [];

  return estructura.votantes.filter(
    (v) => normalizeCI(v.asignado_por) === normalizeCI(currentUser.ci)
  );
};

// ======================= VOTANTES DIRECTOS DEL COORD =======================
export const getVotantesDirectosCoord = (estructura, coordCi) => {
  return estructura.votantes.filter(
    (v) => normalizeCI(v.asignado_por) === normalizeCI(coordCi)
  );
};

// ======================= PERSONAS DISPONIBLES (Optimized with Sets) =======================
export const getPersonasDisponibles = (padron, estructura) => {
  // Build Sets for O(1) lookup instead of O(n) find()
  const coordinadoresSet = new Set(
    (estructura.coordinadores || []).map((c) => normalizeCI(c.ci))
  );
  const subcoordinadoresMap = new Map();
  (estructura.subcoordinadores || []).forEach((s) => {
    subcoordinadoresMap.set(normalizeCI(s.ci), s);
  });
  const votantesMap = new Map();
  (estructura.votantes || []).forEach((v) => {
    votantesMap.set(normalizeCI(v.ci), v);
  });

  return padron.map((p) => {
    const ci = normalizeCI(p.ci);

    let rol = null;
    let asignadoPorNombre = "";

    if (coordinadoresSet.has(ci)) {
      rol = "coordinador";
    } else if (subcoordinadoresMap.has(ci)) {
      rol = "subcoordinador";
      asignadoPorNombre = subcoordinadoresMap.get(ci)?.asignado_por_nombre || "";
    } else if (votantesMap.has(ci)) {
      rol = "votante";
      asignadoPorNombre = votantesMap.get(ci)?.asignado_por_nombre || "";
    }

    return {
      ...p,
      ci,
      asignado: rol !== null,
      asignadoRol: rol,
      asignadoPorNombre,
    };
  });
};

// ======================= ESTRUCTURA PROPIA =======================
export const getEstructuraPropia = (estructura, currentUser) => {
  if (!currentUser) {
    return {
      isCoord: false,
      misSubcoords: [],
      misVotantes: [],
      votantesIndirectos: 0,
      totalVotos: 0,
    };
  }

  const isCoord = currentUser.role === "coordinador";
  const isSub = currentUser.role === "subcoordinador";

  let misSubcoords = [];
  let misVotantes = [];

  if (isCoord) {
    misSubcoords = getMisSubcoordinadores(estructura, currentUser);
    misVotantes = getMisVotantes(estructura, currentUser);
  } else if (isSub) {
    misVotantes = getMisVotantes(estructura, currentUser);
  }

  const votantesIndirectos = isCoord
    ? misSubcoords.reduce(
        (acc, s) =>
          acc + getVotantesDeSubcoord(estructura, s.ci).length,
        0
      )
    : 0;

  const totalVotos = misVotantes.length + votantesIndirectos;

  return { isCoord, misSubcoords, misVotantes, votantesIndirectos, totalVotos };
};
