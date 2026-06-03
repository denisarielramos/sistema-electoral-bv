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

// ======================= PERSONAS DISPONIBLES =======================
export const getPersonasDisponibles = (padron, estructura) => {
  return padron.map((p) => {
    const ci = normalizeCI(p.ci);

    const coord = estructura.coordinadores.find(
      (c) => normalizeCI(c.ci) === ci
    );
    const sub = estructura.subcoordinadores.find(
      (s) => normalizeCI(s.ci) === ci
    );
    const vot = estructura.votantes.find(
      (v) => normalizeCI(v.ci) === ci
    );

    let rol = null;
    if (coord) rol = "coordinador";
    else if (sub) rol = "subcoordinador";
    else if (vot) rol = "votante";

    return {
      ...p,
      ci,
      asignado: rol !== null,
      asignadoRol: rol,
      asignadoPorNombre:
        sub?.asignado_por_nombre || vot?.asignado_por_nombre || "",
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
