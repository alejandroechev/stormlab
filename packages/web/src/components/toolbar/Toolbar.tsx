/**
 * Toolbar — project actions (run, save, load, new, undo, redo).
 */
import { useCallback, useRef, useEffect } from "react";
import { useEditorStore } from "../../store/editor-store";
import { runSimulation, validateProject, type Project } from "@stormlab/engine";
import { openPrintReport } from "../reports/PrintReport";
import { LocationSelector } from "./LocationSelector";
import { ImportExportMenu } from "./ImportExportMenu";
import { trackEvent } from "../../analytics";
import { sampleProjects } from "../../samples";
import { showToast } from "../Toast";

export function Toolbar() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);
  const setResults = useEditorStore((s) => s.setResults);
  const setActiveEvent = useEditorStore((s) => s.setActiveEvent);
  const activeEventId = useEditorStore((s) => s.activeEventId);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const theme = useEditorStore((s) => s.theme);
  const toggleTheme = useEditorStore((s) => s.toggleTheme);
  const selectNode = useEditorStore((s) => s.selectNode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const onRun = useCallback(() => {
    if (project.events.length === 0) {
      showToast("No rainfall events defined", "warning");
      return;
    }
    if (project.nodes.length === 0) {
      showToast("Add nodes to the diagram before running simulation", "warning");
      return;
    }

    // Check for subcatchments
    if (!project.nodes.some((n) => n.type === "subcatchment")) {
      showToast("Add at least one Subcatchment to generate runoff", "warning");
      return;
    }

    // Check for disconnected nodes
    if (project.nodes.length > 1 && project.links.length === 0) {
      showToast("Connect nodes with flow links to define the drainage network", "warning");
      return;
    }

    // Validate before running
    const errors = validateProject(project);
    if (errors.length > 0) {
      for (const e of errors) showToast(e, "error");
      return;
    }

    try {
      let firstResults: Map<string, { peakOutflow: number }> | null = null;
      for (const event of project.events) {
        const result = runSimulation(project, event.id);
        setResults(event.id, result.nodeResults);
        if (!firstResults) firstResults = result.nodeResults;
      }
      setActiveEvent(project.events[0].id);

      // Auto-select terminal node (outfall / highest accumulated flow)
      const terminalNodes = project.nodes.filter(
        (n) => !project.links.some((l) => l.from === n.id),
      );
      if (terminalNodes.length > 0 && firstResults) {
        let bestNode = terminalNodes[0];
        let bestFlow = 0;
        for (const tn of terminalNodes) {
          const r = firstResults.get(tn.id);
          if (r && r.peakOutflow > bestFlow) {
            bestFlow = r.peakOutflow;
            bestNode = tn;
          }
        }
        selectNode(bestNode.id);
      }

      showToast("Simulation complete", "success");
      trackEvent({ name: "run_simulation", data: { nodes: project.nodes.length, events: project.events.length } });
    } catch (err: any) {
      showToast(`Simulation error: ${err.message}`, "error");
    }
  }, [project, setResults, setActiveEvent, selectNode]);

  const onSave = useCallback(() => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project]);

  const onLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const proj = JSON.parse(reader.result as string) as Project;
          setProject(proj);
        } catch {
          showToast("Invalid project file", "error");
        }
      };
      reader.readAsText(file);
      // Reset file input so same file can be loaded again
      e.target.value = "";
    },
    [setProject],
  );

  const onNew = useCallback(() => {
    if (
      project.nodes.length > 0 &&
      !confirm("Create a new project? Unsaved changes will be lost.")
    ) {
      return;
    }
    setProject({
      id: crypto.randomUUID(),
      name: "New Project",
      description: "",
      nodes: [],
      links: [],
      events: [
        { id: "25yr", label: "25-Year Storm", stormType: "II", totalDepth: 6.0 },
      ],
    });
  }, [project, setProject]);

  return (
    <div className="toolbar">
      <h1>StormLab</h1>
      <button onClick={onNew}>New</button>
      <button onClick={onLoad}>Open</button>
      <select
        title="Load a sample project"
        value=""
        onChange={(e) => {
          const sample = sampleProjects.find((s) => s.id === e.target.value);
          if (sample) {
            setProject(structuredClone(sample.data));
            trackEvent({ name: "load_sample", data: { sample: sample.id } });
          }
        }}
        style={{
          background: "var(--input-bg)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          padding: "4px 8px",
          borderRadius: 5,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        <option value="" disabled>📂 Samples</option>
        {sampleProjects.map((s) => (
          <option key={s.id} value={s.id} title={s.description}>
            {s.name}
          </option>
        ))}
      </select>
      <button onClick={onSave}>Save</button>
      <ImportExportMenu />
      <button onClick={undo} title="Undo (Ctrl+Z)">↩</button>
      <button onClick={redo} title="Redo (Ctrl+Y)">↪</button>
      <button className="btn-primary" onClick={onRun}>
        ▶ Run Simulation
      </button>
      <button onClick={openPrintReport} title="Generate printable report">
        📄 Report
      </button>

      <LocationSelector />

      {activeEventId && (
        <select
          className="event-selector"
          value={activeEventId}
          onChange={(e) => setActiveEvent(e.target.value)}
          style={{
            background: "var(--input-bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "4px 8px",
            borderRadius: 5,
            fontSize: 12,
          }}
        >
          {project.events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.label}
            </option>
          ))}
        </select>
      )}

      <div className="toolbar-spacer" />
      <a className="btn" href="https://github.com/alejandroechev/stormlab/issues/new" target="_blank" rel="noopener noreferrer" title="Report issue or give feedback">💬 Feedback</a>
      <button
        onClick={() => window.open('/intro.html', '_blank')}
        title="Introduction to stormwater modeling"
      >
        📖 Guide
      </button>
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={onFileChange}
      />
    </div>
  );
}
