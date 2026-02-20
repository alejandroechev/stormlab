/**
 * Toolbar — project actions (run, save, load, new, undo, redo).
 */
import { useCallback, useRef, useEffect } from "react";
import { useEditorStore } from "../../store/editor-store";
import { runSimulation, validateProject, type Project } from "@hydrocad/engine";

export function Toolbar() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);
  const setResults = useEditorStore((s) => s.setResults);
  const setActiveEvent = useEditorStore((s) => s.setActiveEvent);
  const activeEventId = useEditorStore((s) => s.activeEventId);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      alert("No rainfall events defined");
      return;
    }
    if (project.nodes.length === 0) {
      alert("No nodes in the project");
      return;
    }

    // Validate before running
    const errors = validateProject(project);
    if (errors.length > 0) {
      alert("Validation errors:\n" + errors.map((e) => `• ${e}`).join("\n"));
      return;
    }

    try {
      for (const event of project.events) {
        const result = runSimulation(project, event.id);
        setResults(event.id, result.nodeResults);
      }
      setActiveEvent(project.events[0].id);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    }
  }, [project, setResults, setActiveEvent]);

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
          alert("Invalid project file");
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
      <h1>HydroCAD Web</h1>
      <button onClick={onNew}>New</button>
      <button onClick={onLoad}>Open</button>
      <button onClick={onSave}>Save</button>
      <button onClick={undo} title="Undo (Ctrl+Z)">↩</button>
      <button onClick={redo} title="Redo (Ctrl+Y)">↪</button>
      <button className="btn-primary" onClick={onRun}>
        ▶ Run Simulation
      </button>

      {activeEventId && (
        <select
          value={activeEventId}
          onChange={(e) => setActiveEvent(e.target.value)}
          style={{
            marginLeft: "auto",
            background: "#16213e",
            color: "#eee",
            border: "1px solid #2a2a4a",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: 13,
          }}
        >
          {project.events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.label}
            </option>
          ))}
        </select>
      )}

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
