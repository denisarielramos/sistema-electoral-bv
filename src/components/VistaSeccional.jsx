// ======================= VISTA SECCIONAL =======================
// Vista plana/tabular de todas las personas por seccional
// Solo para superadmin

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  X,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { normalizeCI, formatCI, normalizeText } from "../utils/estructuraHelpers";

// ======================= STAT CARD =======================
const StatCard = ({ label, value, variant = "default" }) => {
  const variants = {
    default: "bg-white border-slate-200",
    primary: "bg-brand-600 border-brand-600 text-white",
  };
  return (
    <div className={`rounded-xl border p-4 ${variants[variant]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${variant === "primary" ? "text-brand-200" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${variant === "primary" ? "text-white" : "text-slate-800"}`}>
        {value?.toLocaleString("es-PY") ?? 0}
      </p>
    </div>
  );
};

// ======================= BADGE =======================
const RolBadge = ({ rol }) => {
  const colors = {
    Coordinador: "bg-red-50 text-red-700 border-red-200",
    Subcoordinador: "bg-blue-50 text-blue-700 border-blue-200",
    Votante: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[rol] || colors.Votante}`}>
      {rol}
    </span>
  );
};

// ======================= MAIN COMPONENT =======================
const VistaSeccional = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [personas, setPersonas] = useState([]);

  // Filtros
  const [filtroSeccional, setFiltroSeccional] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // ======================= CARGAR DATOS =======================
  const cargarDatos = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("[VistaSeccional] Iniciando carga de datos...");

      // Cargar coordinadores, subcoordinadores y votantes
      const [coordsRes, subsRes, votantesRes] = await Promise.all([
        supabase.from("coordinadores").select("*"),
        supabase.from("subcoordinadores").select("*"),
        supabase.from("votantes").select("*"),
      ]);

      if (coordsRes.error) throw coordsRes.error;
      if (subsRes.error) throw subsRes.error;
      if (votantesRes.error) throw votantesRes.error;

      const coordinadores = coordsRes.data || [];
      const subcoordinadores = subsRes.data || [];
      const votantes = votantesRes.data || [];

      console.log("[VistaSeccional] coordinadores:", coordinadores.length);
      console.log("[VistaSeccional] subcoordinadores:", subcoordinadores.length);
      console.log("[VistaSeccional] votantes:", votantes.length);

      // Recolectar CIs únicos
      const allCIs = new Set();
      coordinadores.forEach((c) => allCIs.add(normalizeCI(c.ci)));
      subcoordinadores.forEach((s) => allCIs.add(normalizeCI(s.ci)));
      votantes.forEach((v) => allCIs.add(normalizeCI(v.ci)));

      const cisArray = Array.from(allCIs);
      console.log("[VistaSeccional] CIs únicos a buscar:", cisArray.length);

      // Consultar padrón en chunks de 500
      const padronMap = new Map();
      const chunkSize = 500;

      for (let i = 0; i < cisArray.length; i += chunkSize) {
        const chunk = cisArray.slice(i, i + chunkSize);
        const { data: padronChunk, error: padronError } = await supabase
          .from("padron")
          .select("*")
          .in("ci", chunk);

        if (padronError) {
          console.error("[VistaSeccional] Error cargando padrón chunk:", padronError);
          continue;
        }

        (padronChunk || []).forEach((p) => {
          padronMap.set(normalizeCI(p.ci), p);
        });
      }

      console.log("[VistaSeccional] padron entries loaded:", padronMap.size);

      // Construir array final de personas
      const personasFinales = [];

      // Agregar coordinadores
      coordinadores.forEach((coord) => {
        const ci = normalizeCI(coord.ci);
        const padron = padronMap.get(ci) || {};
        personasFinales.push({
          ci,
          rol: "Coordinador",
          nombre: padron.nombre || "",
          apellido: padron.apellido || "",
          seccional: padron.seccional || "",
          local_votacion: padron.local_votacion || "",
          mesa: padron.mesa || "",
          orden: padron.orden || "",
          direccion: coord.direccion_override || padron.direccion || "",
          telefono: coord.telefono || "",
        });
      });

      // Agregar subcoordinadores
      subcoordinadores.forEach((sub) => {
        const ci = normalizeCI(sub.ci);
        const padron = padronMap.get(ci) || {};
        personasFinales.push({
          ci,
          rol: "Subcoordinador",
          nombre: padron.nombre || "",
          apellido: padron.apellido || "",
          seccional: padron.seccional || "",
          local_votacion: padron.local_votacion || "",
          mesa: padron.mesa || "",
          orden: padron.orden || "",
          direccion: sub.direccion_override || padron.direccion || "",
          telefono: sub.telefono || "",
        });
      });

      // Agregar votantes
      votantes.forEach((vot) => {
        const ci = normalizeCI(vot.ci);
        const padron = padronMap.get(ci) || {};
        personasFinales.push({
          ci,
          rol: "Votante",
          nombre: padron.nombre || "",
          apellido: padron.apellido || "",
          seccional: padron.seccional || "",
          local_votacion: padron.local_votacion || "",
          mesa: padron.mesa || "",
          orden: padron.orden || "",
          direccion: vot.direccion_override || padron.direccion || "",
          telefono: vot.telefono || "",
        });
      });

      console.log("[VistaSeccional] personas finales:", personasFinales.length);
      setPersonas(personasFinales);
    } catch (err) {
      console.error("[VistaSeccional] Error cargando datos:", err);
      setError(err.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filtroSeccional, filtroRol, busqueda]);

  // ======================= SECCIONALES DISPONIBLES =======================
  const seccionalesDisponibles = useMemo(() => {
    const set = new Set();
    personas.forEach((p) => {
      if (p.seccional) set.add(String(p.seccional));
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [personas]);

  // ======================= FILTRADO =======================
  const personasFiltradas = useMemo(() => {
    let result = personas;

    // Filtro por seccional
    if (filtroSeccional) {
      result = result.filter((p) => String(p.seccional) === filtroSeccional);
    }

    // Filtro por rol
    if (filtroRol) {
      result = result.filter((p) => p.rol === filtroRol);
    }

    // Búsqueda
    if (busqueda.trim()) {
      const tokens = normalizeText(busqueda).split(" ").filter(Boolean);
      result = result.filter((p) => {
        const ci = normalizeText(p.ci);
        const nombre = normalizeText(p.nombre);
        const apellido = normalizeText(p.apellido);
        const fullName = `${nombre} ${apellido}`;
        return tokens.every(
          (t) => ci.includes(t) || nombre.includes(t) || apellido.includes(t) || fullName.includes(t)
        );
      });
    }

    return result;
  }, [personas, filtroSeccional, filtroRol, busqueda]);

  // ======================= CONTADORES =======================
  const contadores = useMemo(() => {
    const total = personasFiltradas.length;
    const coordinadores = personasFiltradas.filter((p) => p.rol === "Coordinador").length;
    const subcoordinadores = personasFiltradas.filter((p) => p.rol === "Subcoordinador").length;
    const votantes = personasFiltradas.filter((p) => p.rol === "Votante").length;
    return { total, coordinadores, subcoordinadores, votantes };
  }, [personasFiltradas]);

  // ======================= PAGINACIÓN =======================
  const totalPages = Math.max(1, Math.ceil(personasFiltradas.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const personasPagina = personasFiltradas.slice(startIdx, endIdx);

  const showingStart = personasFiltradas.length > 0 ? startIdx + 1 : 0;
  const showingEnd = Math.min(endIdx, personasFiltradas.length);

  // ======================= RENDER =======================
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-slate-100 rounded-2xl w-full max-w-6xl shadow-modal overflow-hidden flex flex-col max-h-[95vh] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-brand-100 rounded-lg">
              <Users className="w-4 h-4 text-brand-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Personas por Seccional</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border-0 bg-transparent shadow-none"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error al cargar datos</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
              <button
                onClick={cargarDatos}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reintentar
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Cargando personas...</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!loading && !error && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Personas" value={contadores.total} variant="primary" />
                <StatCard label="Coordinadores" value={contadores.coordinadores} />
                <StatCard label="Subcoordinadores" value={contadores.subcoordinadores} />
                <StatCard label="Votantes" value={contadores.votantes} />
              </div>

              {/* Filtros */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Filtro Seccional */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Seccional
                    </label>
                    <select
                      value={filtroSeccional}
                      onChange={(e) => setFiltroSeccional(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value="">Todas</option>
                      {seccionalesDisponibles.map((s) => (
                        <option key={s} value={s}>
                          Seccional {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro Rol */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Rol
                    </label>
                    <select
                      value={filtroRol}
                      onChange={(e) => setFiltroRol(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value="">Todos</option>
                      <option value="Coordinador">Coordinador</option>
                      <option value="Subcoordinador">Subcoordinador</option>
                      <option value="Votante">Votante</option>
                    </select>
                  </div>

                  {/* Buscador */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Buscar
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="CI, nombre o apellido..."
                        className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                      {busqueda && (
                        <button
                          onClick={() => setBusqueda("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0 bg-transparent border-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                          Seccional
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                          Rol
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                          Nombre y Apellido
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                          CI
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                          Local
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                          Mesa
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                          Orden
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                          Dirección
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {personasPagina.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center">
                            <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">
                              No se encontraron resultados en la estructura.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        personasPagina.map((p, idx) => (
                          <tr
                            key={`${p.ci}-${p.rol}-${idx}`}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs">
                                {p.seccional || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <RolBadge rol={p.rol} />
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-800">
                                {p.nombre || p.apellido
                                  ? `${p.nombre} ${p.apellido}`.trim()
                                  : "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600">
                              {formatCI(p.ci)}
                            </td>
                            <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={p.local_votacion}>
                              {p.local_votacion || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                              {p.mesa || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                              {p.orden || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={p.direccion}>
                              {p.direccion || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {personasFiltradas.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50">
                    <p className="text-xs text-slate-500">
                      Mostrando {showingStart}-{showingEnd} de {personasFiltradas.length} registros
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center gap-1 px-3 h-8 border border-slate-200 rounded-lg text-xs text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-50 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Anterior
                      </button>
                      <span className="text-xs text-slate-500 px-2">
                        Página {page} de {totalPages}
                      </span>
                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="inline-flex items-center gap-1 px-3 h-8 border border-slate-200 rounded-lg text-xs text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-50 transition-colors"
                      >
                        Siguiente
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-white shrink-0">
          <button
            onClick={onClose}
            className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors border-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VistaSeccional;
