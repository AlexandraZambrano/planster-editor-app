"use client"

import { useCallback, useMemo, useTransition } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  type Node,
  type Edge,
  type OnConnect,
  type NodeDragHandler,
  type OnNodesDelete,
  type OnEdgesDelete,
  type Connection,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  saveBoardElementPosition,
  deleteBoardElement,
  addBoardConnection,
  deleteBoardConnection,
  type BoardElementData,
  type BoardConnectionData,
  type CharacterLinkData,
} from "@/actions/studio"
import { CharacterNode } from "./character-node"
import { LocationNode } from "./location-node"
import { NoteNode } from "./note-node"
import { ImageNode } from "./image-node"
import { BoardSidebar, type CharacterOption, type LocationOption } from "./board-sidebar"

// Defined outside component to prevent re-registration on every render
const NODE_TYPES = {
  characterNode: CharacterNode,
  locationNode: LocationNode,
  noteNode: NoteNode,
  imageNode: ImageNode,
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  ENEMY: "#ef4444",
  LOVER: "#ec4899",
  FRIEND: "#3b82f6",
  FAMILY: "#3b82f6",
  MENTOR: "#6366f1",
  RIVAL: "#f59e0b",
  UNKNOWN: "#6b7280",
  OTHER: "#6b3fa0",
}

function elementToNode(el: BoardElementData, bookId: string): Node {
  const base = { id: el.id, position: { x: el.posX, y: el.posY } }

  switch (el.type) {
    case "CHARACTER":
      return {
        ...base,
        type: "characterNode",
        data: {
          elementId: el.id,
          characterId: el.characterId!,
          bookId,
          name: el.character?.name ?? "Unknown",
          mainImageUrl: el.character?.mainImageUrl ?? null,
          storyRole: el.character?.storyRole ?? "OTHER",
        },
      }
    case "LOCATION":
      return {
        ...base,
        type: "locationNode",
        data: {
          elementId: el.id,
          locationId: el.locationId!,
          bookId,
          name: el.location?.name ?? "Unknown",
          thumbnailUrl: el.location?.images[0] ?? null,
        },
      }
    case "NOTE":
      return {
        ...base,
        type: "noteNode",
        data: {
          elementId: el.id,
          text: (el.content.text as string) ?? "",
          noteColor: (el.content.color as string) ?? "#fef3c7",
        },
      }
    case "IMAGE":
    default:
      return {
        ...base,
        type: "imageNode",
        data: {
          elementId: el.id,
          imageUrl: (el.content.imageUrl as string) ?? "",
        },
      }
  }
}

function buildEdges(
  connections: BoardConnectionData[],
  characterLinks: CharacterLinkData[],
  elements: BoardElementData[]
): Edge[] {
  const manualEdges: Edge[] = connections
    .filter((c) => !c.isAutomatic)
    .map((c) => ({
      id: c.id,
      source: c.fromElementId,
      target: c.toElementId,
      label: c.label ?? undefined,
      style: { stroke: c.color, strokeWidth: 2 },
      data: { isAutomatic: false },
    }))

  // Build characterId → elementId lookup for auto-edges
  const charToElement = new Map<string, string>()
  for (const el of elements) {
    if (el.type === "CHARACTER" && el.characterId) {
      charToElement.set(el.characterId, el.id)
    }
  }

  const autoEdges: Edge[] = []
  const seen = new Set<string>()
  for (const link of characterLinks) {
    const src = charToElement.get(link.characterAId)
    const tgt = charToElement.get(link.characterBId)
    if (!src || !tgt) continue
    const key = [src, tgt].sort().join("|")
    if (seen.has(key)) continue
    seen.add(key)
    autoEdges.push({
      id: `auto-${link.id}`,
      source: src,
      target: tgt,
      label: link.relationshipType,
      style: { stroke: RELATIONSHIP_COLORS[link.relationshipType] ?? "#6b3fa0", strokeWidth: 2 },
      data: { isAutomatic: true },
      deletable: false,
    })
  }

  return [...manualEdges, ...autoEdges]
}

interface BoardCanvasProps {
  bookId: string
  boardId: string
  initialElements: BoardElementData[]
  initialConnections: BoardConnectionData[]
  characterLinks: CharacterLinkData[]
  characters: CharacterOption[]
  locations: LocationOption[]
}

export function BoardCanvas({
  bookId,
  boardId,
  initialElements,
  initialConnections,
  characterLinks,
  characters,
  locations,
}: BoardCanvasProps) {
  const [, startTransition] = useTransition()

  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialElements.map((el) => elementToNode(el, bookId))
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    buildEdges(initialConnections, characterLinks, initialElements)
  )

  const onNodeDragStop: NodeDragHandler = useCallback((_event, node) => {
    startTransition(() => {
      saveBoardElementPosition(node.id, node.position.x, node.position.y)
    })
  }, [])

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const tempId = `temp-${Date.now()}`
      setEdges((eds) =>
        addEdge(
          { ...connection, id: tempId, style: { stroke: "#6b3fa0", strokeWidth: 2 }, data: { isAutomatic: false } },
          eds
        )
      )
      startTransition(async () => {
        const result = await addBoardConnection(boardId, connection.source!, connection.target!)
        if ("connection" in result) {
          setEdges((eds) => eds.map((e) => (e.id === tempId ? { ...e, id: result.connection.id } : e)))
        } else {
          setEdges((eds) => eds.filter((e) => e.id !== tempId))
        }
      })
    },
    [boardId, setEdges]
  )

  const onNodesDelete: OnNodesDelete = useCallback((deleted: Node[]) => {
    for (const node of deleted) {
      startTransition(() => { deleteBoardElement(node.id) })
    }
  }, [])

  const onEdgesDelete: OnEdgesDelete = useCallback((deleted: Edge[]) => {
    for (const edge of deleted) {
      if (!edge.data?.isAutomatic) {
        startTransition(() => { deleteBoardConnection(edge.id) })
      }
    }
  }, [])

  const existingCharacterIds = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "characterNode")
        .map((n) => (n.data as { characterId: string }).characterId),
    [nodes]
  )

  const existingLocationIds = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "locationNode")
        .map((n) => (n.data as { locationId: string }).locationId),
    [nodes]
  )

  function handleElementAdded(element: BoardElementData) {
    setNodes((nds) => [...nds, elementToNode(element, bookId)])
  }

  return (
    <div className="flex-1 relative" style={{ minHeight: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3, minZoom: 0.3, maxZoom: 1.5 }}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode="Shift"
        style={{ width: "100%", height: "100%" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable className="!rounded-lg !border !bg-muted/60" />
      </ReactFlow>

      <BoardSidebar
        boardId={boardId}
        characters={characters}
        locations={locations}
        existingCharacterIds={existingCharacterIds}
        existingLocationIds={existingLocationIds}
        onAdded={handleElementAdded}
      />
    </div>
  )
}
