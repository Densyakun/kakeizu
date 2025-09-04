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

type PersonNodeData = { person: PersonType };

const PersonNode = ({ data }: NodeProps & { data: PersonNodeData }) => {
  const person: PersonType = data.person;

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

const UnionNode = () => {
  return <>
    <Handle type="target" position={Position.Top} style={{ top: 5, opacity: 0, pointerEvents: 'none' }} />
    <Handle type="source" position={Position.Bottom} style={{ bottom: 5, opacity: 0, pointerEvents: 'none' }} />
  </>;
};

const nodeTypes = {
  person: PersonNode,
  union: UnionNode,
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
  });

  tree.people.forEach(person => {
    // 両親がいる場合は必ず結合ノードを作成（母→父の順）
    if (person.fatherId && person.motherId) {
      const unionId = `union-${person.motherId}-${person.fatherId}`;
      // すでに追加済みでなければ追加
      if (!initialNodes.find(n => n.id === unionId)) {
        initialNodes.push({
          id: unionId,
          type: 'union',
          width: 1,
          height: 1,
          position: { x: 0, y: 0 },
          data: {},
        });

        // 母から結合ノードへのエッジ
        initialEdges.push({
          id: `${person.motherId}-${unionId}`,
          source: person.motherId,
          sourceHandle: 'right',
          target: unionId,
          type: 'step',
        });
        // 父から結合ノードへのエッジ
        initialEdges.push({
          id: `${person.fatherId}-${unionId}`,
          source: person.fatherId,
          sourceHandle: 'left',
          target: unionId,
          type: 'step',
        });
      }
    }
  });

  // 夫婦ペアにmarriageエッジを追加（妻側からのみ）
  tree.people.forEach(person => {
    if (person.spouseId && !person.isMan) {
      initialEdges.push({
        id: `${person.id}-${person.spouseId}`,
        source: person.id,
        sourceHandle: 'right',
        target: person.spouseId,
        targetHandle: 'left',
        type: 'marriage',
      });
    }
  });

  // 子→結合ノードへのエッジ
  tree.people.forEach(person => {
    if (person.fatherId && person.motherId) {
      const unionId = `union-${person.motherId}-${person.fatherId}`;
      initialEdges.push({
        id: `${unionId}-${person.id}`,
        source: unionId,
        target: person.id,
        type: 'step',
      });
    }
  });

  return [initialNodes, initialEdges];
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], options: any = {}) => {
  const parentGroups: any[] = [];
  const spouseGroups: any[] = [];

  // 子ごとに父母グループを作成（母→父の順）
  edges.forEach(edge => {
    if (edge.source.startsWith('union-')) {
      const [_, motherId, fatherId] = edge.source.split('-');
      const motherNode = nodes.find(n => n.id === motherId);
      const fatherNode = nodes.find(n => n.id === fatherId);

      if (motherNode && fatherNode) {
        parentGroups.push({
          id: `parentgroup-${motherId}-${fatherId}-${edge.target}`,
          groupType: 'parent',
          children: [motherNode, fatherNode],
          width: nodeWidth * 2,
          height: nodeHeight,
          layoutOptions: { 'elk.groupNode.layout': 'HORIZONTAL' },
        });
      }
    }
  });

  // 配偶者グループ（夫婦のみ、子がいなくてもグループ化）
  edges.forEach(edge => {
    if (edge.type === 'marriage') {
      const wifeNode = nodes.find(n => !(n.data as PersonNodeData).person.isMan && n.id === edge.source);
      const husbandNode = nodes.find(n => (n.data as PersonNodeData).person.isMan && n.id === edge.target);
      if (wifeNode && husbandNode) {
        spouseGroups.push({
          id: `spousegroup-${wifeNode.id}-${husbandNode.id}`,
          groupType: 'spouse',
          children: [wifeNode, husbandNode], // 妻→夫の順
          width: nodeWidth * 2,
          height: nodeHeight,
          layoutOptions: { 'elk.groupNode.layout': 'HORIZONTAL' },
        });
      }
    }
  });

  const elkChildren: any[] = [];
  parentGroups.forEach(group => elkChildren.push(group));
  spouseGroups.forEach(group => elkChildren.push(group));

  // グループに含まれていないノード（personノードやunionノード）を追加
  const groupedNodeIds = new Set<string>();
  [...parentGroups, ...spouseGroups].forEach(group => {
    group.children.forEach((child: any) => {
      if (child?.id) groupedNodeIds.add(child.id);
    });
  });

  nodes.forEach(node => {
    if (!groupedNodeIds.has(node.id)) {
      elkChildren.push({
        ...node,
        width: node.width ?? nodeWidth,
        height: node.height ?? nodeHeight,
      });
    }
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
        if (node.children)
          return node.children.map((child: any) => ({
            ...child,
            position: { x: child.x ?? 0, y: child.y ?? 0 },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
          }));

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