import Dagre from '@dagrejs/dagre';
import { state } from '@/lib/state';
import { FamilyTreeType, getDisplayKanaNameText, getDisplayNameText, PersonType } from '@/lib/tree';
import { useCallback } from 'react';
import { ReactFlow, type Node, type Edge, Panel, ReactFlowProvider, useNodesState, useEdgesState, Background, Controls, type NodeProps, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSnapshot } from 'valtio';
import { Box, Button, Stack, Tooltip } from '@mui/material';

const nodeWidth = 36;
const nodeHeight = 172;

const PersonNode = ({ data }: NodeProps) => {
  const person: PersonType = (data as any).person;

  const tooltip: string[] = [];

  if (person.isMan !== undefined) tooltip.push(`性別: ${person.isMan ? "男" : "女"}`);

  const kana = getDisplayKanaNameText(person);
  if (kana) tooltip.push(` カナ: ${kana}`);

  if (person.description) tooltip.push(` 説明: ${person.description}`);

  return <Tooltip title={tooltip.join(", ")}>
    <Box sx={{
      width: "100%",
      height: "100%",
      justifyContent: "center",
      display: "inline-flex",
      overflowY: "scroll",
      overflowX: "clip",
    }}>
      <Box className="hina-mincho-regular" sx={{
        msWritingMode: "vertical-rl",
        writingMode: "vertical-rl",
        whiteSpace: "nowrap",
        marginX: "auto",
      }}>
        {getDisplayNameText(person) || "（不明）"}
      </Box>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Box>
  </Tooltip>;
};

const nodeTypes = {
  person: PersonNode,
};

function createInitialFlow(tree: FamilyTreeType): [Node[], Edge[]] {
  const initialNodes: Node[] = [];

  const initialEdges: Edge[] = [];

  tree.people.forEach(person => {
    initialNodes.push({
      id: person.id,
      type: 'person',
      width: nodeWidth,
      height: nodeHeight,
      position: { x: 0, y: 0 },
      data: { person },
    });

    if (person.fatherId)
      initialEdges.push({
        id: `${person.fatherId}-${person.id}`,
        source: person.fatherId,
        target: person.id,
        type: 'step',
      });

    if (person.motherId)
      initialEdges.push({
        id: `${person.motherId}-${person.id}`,
        source: person.motherId,
        target: person.id,
        type: 'step',
      });
  });

  return [initialNodes, initialEdges];
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], options: { direction: string }) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: options.direction });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      width: nodeWidth,
      height: nodeHeight,
    }),
  );

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const position = g.node(node.id);
      const x = position.x - (node.measured?.width ?? 0) / 2;
      const y = position.y - (node.measured?.height ?? 0) / 2;

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

const LayoutFlow = () => {
  const { tree } = useSnapshot(state);

  const { nodes: initialNodes, edges: initialEdges } = getLayoutedElements(...createInitialFlow(tree as FamilyTreeType), { direction: 'TB' });

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const onLayout = useCallback(
    (direction: string) => {
      const layouted = getLayoutedElements(nodes, edges, { direction });

      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);
    },
    [nodes, edges],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background />
      <Controls />
      <Panel position="top-right">
        <Stack direction="row" spacing={1}>
          <Button variant='outlined' onClick={() => onLayout('TB')}>vertical layout</Button>
          {/*<Button variant='outlined' onClick={() => onLayout('LR')}>horizontal layout</Button>*/}
        </Stack>
      </Panel>
    </ReactFlow>
  );
};

export default function Tree() {
  return (
    <div style={{ height: '100%', width: '100%', position: 'absolute', left: 0, top: 0 }}>
      <ReactFlowProvider>
        <LayoutFlow />
      </ReactFlowProvider>
    </div>
  );
}