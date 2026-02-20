/**
 * Import/Export menu — supports CSV, SWMM, HEC-HMS, GeoJSON formats.
 */
import { useState, useCallback, useRef } from "react";
import { useEditorStore } from "../../store/editor-store";
import {
  parseSubcatchmentCSV,
  csvRowsToSubcatchmentNodes,
  exportSubcatchmentsCSV,
  exportAllResultsCSV,
  importSWMM,
  exportSWMM,
  importHECHMS,
  exportHECHMS,
  importGeoJSON,
  exportGeoJSON,
} from "@stormlab/engine";

const formats = [
  { id: "csv-sub", label: "CSV — Subcatchments", ext: ".csv", hasImport: true, hasExport: true },
  { id: "csv-results", label: "CSV — Results", ext: ".csv", hasImport: false, hasExport: true },
  { id: "swmm", label: "EPA SWMM (.inp)", ext: ".inp", hasImport: true, hasExport: true },
  { id: "hechms", label: "HEC-HMS (.basin)", ext: ".basin", hasImport: true, hasExport: true },
  { id: "geojson", label: "GeoJSON", ext: ".geojson", hasImport: true, hasExport: true },
] as const;

export function ImportExportMenu() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);
  const results = useEditorStore((s) => s.results);
  const addNode = useEditorStore((s) => s.addNode);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFormat, setPendingFormat] = useState<string>("");

  const doImport = useCallback(
    (formatId: string, text: string) => {
      try {
        switch (formatId) {
          case "csv-sub": {
            const rows = parseSubcatchmentCSV(text);
            const nodes = csvRowsToSubcatchmentNodes(rows);
            if (project.nodes.length === 0) {
              setProject({ ...project, nodes });
            } else {
              for (const n of nodes) addNode(n);
            }
            break;
          }
          case "swmm":
            setProject(importSWMM(text));
            break;
          case "hechms":
            setProject(importHECHMS(text));
            break;
          case "geojson":
            setProject(importGeoJSON(text));
            break;
        }
        setOpen(false);
      } catch (err: any) {
        alert(`Import error: ${err.message}`);
      }
    },
    [project, setProject, addNode],
  );

  const doExport = useCallback(
    (formatId: string) => {
      let content: string;
      let filename: string;
      let mime = "text/plain";

      switch (formatId) {
        case "csv-sub":
          content = exportSubcatchmentsCSV(project);
          filename = `${project.name}-subcatchments.csv`;
          mime = "text/csv";
          break;
        case "csv-results":
          content = exportAllResultsCSV(project, results);
          filename = `${project.name}-results.csv`;
          mime = "text/csv";
          break;
        case "swmm":
          content = exportSWMM(project);
          filename = `${project.name}.inp`;
          break;
        case "hechms":
          content = exportHECHMS(project);
          filename = `${project.name}.basin`;
          break;
        case "geojson":
          content = exportGeoJSON(project);
          filename = `${project.name}.geojson`;
          mime = "application/geo+json";
          break;
        default:
          return;
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.replace(/\s+/g, "-").toLowerCase();
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    },
    [project, results],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !pendingFormat) return;
      const reader = new FileReader();
      reader.onload = () => doImport(pendingFormat, reader.result as string);
      reader.readAsText(file);
      e.target.value = "";
    },
    [pendingFormat, doImport],
  );

  const triggerImport = (formatId: string) => {
    setPendingFormat(formatId);
    fileRef.current?.click();
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}>
        ↔ Import/Export
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 8,
            zIndex: 100,
            width: 280,
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
            Import / Export
          </div>

          {formats.map((fmt) => (
            <div
              key={fmt.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "5px 6px",
                borderBottom: "1px solid var(--border)",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>{fmt.label}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {fmt.hasImport && (
                  <button
                    onClick={() => triggerImport(fmt.id)}
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: 3,
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    Import
                  </button>
                )}
                {fmt.hasExport && (
                  <button
                    onClick={() => doExport(fmt.id)}
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: 3,
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    Export
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => setOpen(false)}
            style={{
              marginTop: 6,
              width: "100%",
              fontSize: 10,
              padding: "3px",
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.inp,.basin,.met,.geojson,.json"
        style={{ display: "none" }}
        onChange={onFileChange}
      />
    </div>
  );
}
