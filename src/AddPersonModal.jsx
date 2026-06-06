import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import { normalizeCI } from "./utils/estructuraHelpers";

const ROL_LABEL = {
  coordinador: "Coordinador",
  subcoordinador: "Subcoordinador",
  votante: "Votante",
};

const AddPersonModal = ({ show, onClose, tipo, onAdd, asignadosMap }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  // Reset when modal closes
  useEffect(() => {
    if (!show) {
      setSearchTerm("");
      setResults([]);
      setLoading(false);
    }
  }, [show]);

  // Debounced server search via buscar_padron RPC (only when 2+ chars)
  useEffect(() => {
    if (!show) return;
    const term = searchTerm.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const reqId = ++requestIdRef.current;
      try {
        const { data, error } = await supabase.rpc("buscar_padron", {
          termino_input: term,
        });
        // Ignore stale responses
        if (reqId !== requestIdRef.current) return;
        if (error) {
          console.error("Error buscar_padron:", error);
          setResults([]);
        } else {
          setResults(data || []);
        }
      } catch (e) {
        if (reqId !== requestIdRef.current) return;
        console.error("Error buscar_padron:", e);
        setResults([]);
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, show]);

  // Mark each result as assigned/free using the lightweight asignadosMap
  const decoratedResults = useMemo(() => {
    return (results || []).map((p) => {
      const info = asignadosMap?.get(normalizeCI(p.ci));
      return {
        ...p,
        asignado: !!info,
        asignadoRol: info?.rol || null,
        asignadoPorNombre: info?.asignadoPorNombre || "",
      };
    });
  }, [results, asignadosMap]);

  if (!show) return null;

  const titulo =
    tipo === "coordinador" ? "Agregar Coordinador"
    : tipo === "subcoordinador" ? "Agregar Subcoordinador"
    : "Agregar Votante";

  const termTooShort = searchTerm.trim().length < 2;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-modal overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-brand-100 rounded-lg">
              <UserPlus className="w-4 h-4 text-brand-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">{titulo}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border-0 bg-transparent shadow-none"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              placeholder="Buscar por CI, nombre o apellido..."
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50"
              autoFocus
            />
            {loading ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 animate-spin" />
            ) : searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0 bg-transparent border-0 shadow-none"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
          {!termTooShort && !loading && (
            <p className="text-xs text-slate-500 mt-1.5">
              {decoratedResults.length} resultado{decoratedResults.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {termTooShort ? (
            <div className="text-center py-10">
              <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Escriba al menos 2 caracteres para buscar.</p>
            </div>
          ) : loading ? (
            <div className="text-center py-10">
              <Loader2 className="w-8 h-8 text-brand-300 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-slate-400">Buscando...</p>
            </div>
          ) : decoratedResults.length === 0 ? (
            <div className="text-center py-10">
              <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No se encontraron resultados.</p>
            </div>
          ) : (
            decoratedResults.map((persona) => {
              const bloqueado = persona.asignado === true;
              const asignador = persona.asignadoPorNombre || "Asignado";
              const asignadorRol = ROL_LABEL[persona.asignadoRol] || "";

              return (
                <div
                  key={persona.ci}
                  onClick={() => !bloqueado && onAdd(persona)}
                  className={`p-3 border rounded-xl transition-colors ${
                    bloqueado
                      ? "bg-slate-50 opacity-60 cursor-not-allowed border-slate-200"
                      : "bg-white hover:bg-brand-50 hover:border-brand-200 cursor-pointer border-slate-200 active:bg-brand-100"
                  }`}
                >
                  <p className="font-semibold text-sm text-slate-800 truncate">
                    {(persona.nombre || "").toUpperCase()}{" "}
                    {(persona.apellido || "").toUpperCase()}
                  </p>
                  <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                    <p>CI: {persona.ci}</p>
                    <div className="flex flex-wrap gap-x-3">
                      {persona.seccional && <span>Seccional: {persona.seccional}</span>}
                      {persona.local_votacion && <span className="truncate">Local: {persona.local_votacion}</span>}
                      {persona.mesa && <span>Mesa: {persona.mesa}</span>}
                      {persona.orden && <span>Orden: {persona.orden}</span>}
                    </div>
                  </div>
                  {bloqueado && (
                    <p className="text-xs text-brand-600 mt-1 font-medium truncate">
                      Ya asignado por {asignador}
                      {asignadorRol ? ` (${asignadorRol})` : ""}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
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

export default AddPersonModal;
