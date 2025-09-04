import ELK from 'elkjs/lib/elk.bundled.js';
import { state } from '@/lib/state';
import { FamilyTreeType, getDisplayKanaNameText, getDisplayNameText, PersonType } from '@/lib/tree';
import { useCallback, useLayoutEffect } from 'react';
import { ReactFlow, type Node, type Edge, Panel, ReactFlowProvider, useNodesState, useEdgesState, Background, Controls, type NodeProps, Handle, Position, useReactFlow, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSnapshot } from 'valtio';
import { Box, Button, Stack, Tooltip } from '@mui/material';
import MarriageEdge from './MarriageEdge';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
};

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
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0, pointerEvents: 'none' }} id="left" />
      <Handle type="target" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} id="right" />
      <Handle type="source" position={Position.Left} style={{ opacity: 0, pointerEvents: 'none' }} id="left" />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} id="right" />
    </Box>
  </Tooltip>;
};

const nodeTypes = {
  person: PersonNode,
};

const edgeTypes = {
  marriage: MarriageEdge,
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

    if (person.spouseId && person.isMan)
      initialEdges.push({
        id: `${person.id}-${person.spouseId}`,
        source: person.id,
        sourceHandle: 'left',
        target: person.spouseId,
        targetHandle: 'right',
        type: 'marriage',
      });
  });

  return [initialNodes, initialEdges];
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], options: any = {}) => {
  const marriageGroups: { [groupId: string]: any } = {};
  const usedInMarriage = new Set<string>();

  edges.forEach(edge => {
    if (edge.type === 'marriage') {
      const groupId = `marriage-${edge.source}-${edge.target}`;
      marriageGroups[groupId] = {
        id: groupId,
        children: [
          nodes.find(n => n.id === edge.source),
          nodes.find(n => n.id === edge.target),
        ],
        layoutOptions: { 'elk.groupNode.layout': 'HORIZONTAL' },
      };
      usedInMarriage.add(edge.source);
      usedInMarriage.add(edge.target);
    }
  });

  const elkChildren: any[] = [];
  Object.values(marriageGroups).forEach(group => elkChildren.push(group));
  nodes.forEach(node => {
    if (!usedInMarriage.has(node.id)) elkChildren.push(node);
  });

  const elkEdges = edges.map((edge) => ({
    sources: [edge.source],
    targets: [edge.target],
    ...edge,
  }));

  const graph = {
    id: 'root',
    layoutOptions: options,
    children: elkChildren,
    edges: elkEdges,
  };

  return elk
    .layout(graph)
    .then((layoutedGraph) => ({
      nodes: layoutedGraph.children?.flatMap((node) => {
        if (node.children) {
          return node.children.map((child: any) => ({
            ...child,
            position: { x: child.x ?? 0, y: child.y ?? 0 },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
          }));
        }
        return {
          ...node,
          position: { x: node.x ?? 0, y: node.y ?? 0 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        };
      }),
      edges: layoutedGraph.edges,
    }))
    .catch(console.error);
};

const LayoutFlow = () => {
  const { tree } = useSnapshot(state);
  const [initialNodes, initialEdges] = createInitialFlow(tree as FamilyTreeType);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), []);
  const onLayout = useCallback(
    ({ direction, useInitialNodes = false }: { direction: string, useInitialNodes?: boolean }) => {
      const opts = { 'elk.direction': direction, ...elkOptions };
      const ns = useInitialNodes ? initialNodes : nodes;
      const es = useInitialNodes ? initialEdges : edges;

      getLayoutedElements(ns, es, opts).then((result) => {
        if (result && result.nodes && result.edges) {
          setNodes(result.nodes);
          setEdges(
            result.edges.map((edge: any) => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle,
              type: edge.type,
              ...edge,
            }))
          );
          fitView();
        }
      });
    },
    [nodes, edges],
  );

  // Calculate the initial layout on mount.
  useLayoutEffect(() => {
    onLayout({ direction: 'DOWN', useInitialNodes: true });
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onConnect={onConnect}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
    >
      <Background />
      <Controls />
      <Panel position="top-right">
        <Stack direction="row" spacing={1}>
          <Button variant='outlined' onClick={() => onLayout({ direction: 'DOWN' })}>vertical layout</Button>
          {/*<Button variant='outlined' onClick={() => onLayout({ direction: 'RIGHT' })}>horizontal layout</Button>*/}
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