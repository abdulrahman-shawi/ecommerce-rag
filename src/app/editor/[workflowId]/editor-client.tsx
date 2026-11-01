// محرر الـ Workflow المرئي — Client Component.
//
// الميزات:
//   - لوحة React Flow لعرض العقد وربطها بخطوط (handles)
//   - إضافة عقد بالسحب من الشريط الجانبي أو بالنقر على +
//   - لوحة إعدادات جانبية عند النقر على عقدة
//   - حفظ تلقائي (debounce 800ms) عبر PATCH /api/workflows/[id]
//   - زر "تشغيل" ينادي /api/workflows/[id]/run ثم يعرض التقدم لحظيًا
//     بالـ polling على /api/runs/[id] كل ثانية مع تلوين العقد

"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Palette } from "./palette";
import { ConfigPanel } from "./config-panel";
import {
  TriggerNode,
  FormNode,
  CanvaNode,
  GenericNode,
  type FlowNodeData,
} from "./nodes";
import type { RunLogEntry, WorkflowDefinition } from "@/lib/workflow-engine";

/** وصف عقدة يأتي من السيرفر (من nodeRegistry) — يتضمن defaultConfig الجاهز */
export interface NodeDescriptor {
  type: string;
  label: string;
  description: string;
  defaultConfig: Record<string, unknown>;
}

type FlowNode = Node<FlowNodeData>;

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  form: FormNode,
  canvaAutofill: CanvaNode,
  canvaExport: CanvaNode,
  storeBuilder: GenericNode,
  publish: GenericNode,
  notification: GenericNode,
};

interface EditorProps {
  workflow: { id: string; name: string; definition: WorkflowDefinition };
  storeName: string;
  descriptors: NodeDescriptor[];
}

export default function WorkflowEditor(props: EditorProps) {
  return (
    <ReactFlowProvider>
      <EditorCanvas {...props} />
    </ReactFlowProvider>
  );
}

function EditorCanvas({ workflow, storeName, descriptors }: EditorProps) {
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(
    workflow.definition.nodes.map((n) => ({
      ...n,
      data: { ...n.data, status: "pending" as const },
    }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(workflow.definition.edges);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<{ status?: string; logs: RunLogEntry[]; error?: string | null }>({
    logs: [],
  });

  const onConnect = useCallback(
    (conn: Connection) => setEdges((eds) => addEdge(conn, eds)),
    [setEdges]
  );

  // ------------------------- الحفظ التلقائي -------------------------
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const save = useCallback(async () => {
    setSaveState("saving");
    // لا نحفظ حقول التشغيل المؤقتة (status) — فقط label + config
    const definition = {
      nodes: nodesRef.current.map((n) => ({
        id: n.id,
        type: n.type!,
        position: { x: n.position.x, y: n.position.y },
        data: { label: n.data.label, config: n.data.config },
      })),
      edges: edgesRef.current.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    const res = await fetch(`/api/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ definition }),
    });
    setSaveState(res.ok ? "saved" : "error");
  }, [workflow.id]);

  useEffect(() => {
    const timer = setTimeout(save, 800);
    return () => clearTimeout(timer);
  }, [nodes, edges, save]);

  // ------------------------- إضافة عقد -------------------------

  const addNode = useCallback(
    (type: string, position?: { x: number; y: number }) => {
      const desc = descriptors.find((d) => d.type === type);
      if (!desc) return;
      const id = `${type}-${Date.now().toString(36)}`;
      setNodes((ns) => [
        ...ns,
        {
          id,
          type,
          position: position ?? { x: 120 + (ns.length % 5) * 60, y: 120 + (ns.length % 5) * 60 },
          data: {
            label: desc.label,
            config: structuredClone(desc.defaultConfig),
            status: "pending" as const,
          },
        },
      ]);
    },
    [descriptors, setNodes]
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/storeflow-node");
      if (!type) return;
      addNode(type, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [addNode, screenToFlowPosition]
  );

  // ------------------------- التشغيل + polling -------------------------

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    []
  );

  const runWorkflow = async () => {
    await save(); // احفظ آخر تعديلات قبل التشغيل
    setRunning(true);
    setRun({ logs: [] });

    const res = await fetch(`/api/workflows/${workflow.id}/run`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setRun({ status: "failed", logs: [], error: data.error ?? "فشل بدء التنفيذ" });
      setRunning(false);
      return;
    }

    const runId = data.runId as string;
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/runs/${runId}`);
      const { run: runRow } = await r.json();
      const logs = (runRow.logs ?? []) as RunLogEntry[];

      setRun({ status: runRow.status, logs, error: runRow.error });
      setNodes((ns) =>
        ns.map((n) => {
          const log = logs.find((l) => l.nodeId === n.id);
          return { ...n, data: { ...n.data, status: log?.status ?? "pending" } };
        })
      );

      if (runRow.status === "success" || runRow.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        setRunning(false);
      }
    }, 1000);
  };

  // ------------------------- تحديث العقد -------------------------

  const updateNode = useCallback(
    (nodeId: string, patch: Partial<FlowNodeData>) =>
      setNodes((ns) =>
        ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n))
      ),
    [setNodes]
  );

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  // ------------------------------ العرض ------------------------------

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm underline">
            ← لوحة التحكم
          </Link>
          <h1 className="font-bold">{workflow.name}</h1>
          <span className="text-xs text-gray-400">{storeName}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            {saveState === "saving" && "جارٍ الحفظ..."}
            {saveState === "saved" && "✓ محفوظ تلقائيًا"}
            {saveState === "error" && "تعذر الحفظ"}
          </span>
          <Link href={`/editor/${workflow.id}/runs`} className="text-sm underline">
            سجل التنفيذ
          </Link>
          <button
            type="button"
            onClick={runWorkflow}
            disabled={running}
            className="bg-green-600 text-white rounded px-4 py-1 text-sm disabled:opacity-50"
          >
            {running ? "يعمل..." : "▶ تشغيل"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <Palette descriptors={descriptors} onAdd={(type) => addNode(type)} />

        {/* اللوحة تعمل LTR داخليًا (React Flow لا يدعم RTL كاملًا) */}
        <div
          className="flex-1"
          dir="ltr"
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} />
            <Controls />
          </ReactFlow>
        </div>

        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onChange={updateNode}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* سجل التنفيذ الحي أثناء التشغيل */}
      {(run.status || run.logs.length > 0) && (
        <footer className="border-t max-h-48 overflow-y-auto p-3 text-xs space-y-1 bg-white" dir="rtl">
          <div className="font-bold">
            حالة التنفيذ: {run.status ?? "قيد البدء..."}
            {run.error && <span className="text-red-600 mr-2">{run.error}</span>}
          </div>
          {run.logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span
                className={
                  log.status === "done"
                    ? "text-green-600"
                    : log.status === "failed"
                      ? "text-red-600"
                      : log.status === "running"
                        ? "text-blue-600"
                        : "text-gray-400"
                }
              >
                {log.status}
              </span>
              <span className="font-medium">{log.label}</span>
              {log.message && <span className="text-gray-500">{log.message}</span>}
              {log.error && <span className="text-red-500">{log.error}</span>}
            </div>
          ))}
        </footer>
      )}
    </div>
  );
}
