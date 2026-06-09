"use client"

import { useState, useTransition } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Trash2, ChevronDown, ChevronRight, MapPin, Users } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteScene, reorderScenes } from "@/actions/studio"
import { SceneFormDialog } from "./scene-form-dialog"
import type { SceneData, CharacterOption, LocationOption } from "./plotting-board"

interface SceneItemProps {
  scene: SceneData
  plotNoteId: string
  characters: CharacterOption[]
  locations: LocationOption[]
  onDeleted: (id: string) => void
  onUpdated: (scene: SceneData) => void
}

function SceneItem({
  scene,
  plotNoteId,
  characters,
  locations,
  onDeleted,
  onUpdated,
}: SceneItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [, startTransition] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const charNames = characters
    .filter((c) => scene.characterIds.includes(c.id))
    .map((c) => c.name)

  function handleDelete() {
    startTransition(async () => {
      await deleteScene(scene.id)
      onDeleted(scene.id)
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-md bg-background"
      data-testid="scene-item"
    >
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left flex items-center gap-1.5 min-w-0"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{scene.title}</span>
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <SceneFormDialog
            plotNoteId={plotNoteId}
            characters={characters}
            locations={locations}
            scene={scene}
            onUpdated={() => {
              // Optimistically update: refresh via parent callback
              onUpdated({ ...scene })
            }}
          />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Delete scene"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete scene?</AlertDialogTitle>
                <AlertDialogDescription>
                  &quot;{scene.title}&quot; will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {expanded && (
        <div className="px-8 pb-3 space-y-1.5 text-xs text-muted-foreground">
          {scene.description && <p className="text-foreground/80">{scene.description}</p>}
          {scene.location && (
            <p className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {scene.location.name}
            </p>
          )}
          {charNames.length > 0 && (
            <p className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {charNames.join(", ")}
            </p>
          )}
          {!scene.description && !scene.location && charNames.length === 0 && (
            <p className="italic">No details added.</p>
          )}
        </div>
      )}
    </div>
  )
}

interface SceneListProps {
  plotNoteId: string
  initialScenes: SceneData[]
  characters: CharacterOption[]
  locations: LocationOption[]
  onScenesChanged: (scenes: SceneData[]) => void
}

export function SceneList({
  plotNoteId,
  initialScenes,
  characters,
  locations,
  onScenesChanged,
}: SceneListProps) {
  const [scenes, setScenes] = useState(initialScenes)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setScenes((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id)
      const newIndex = prev.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex).map((s, i) => ({
        ...s,
        order: i + 1,
      }))

      startTransition(() => {
        reorderScenes(plotNoteId, reordered.map((s) => s.id))
      })

      onScenesChanged(reordered)
      return reordered
    })
  }

  function handleCreated(scene: SceneData) {
    const updated = [...scenes, scene]
    setScenes(updated)
    onScenesChanged(updated)
  }

  function handleDeleted(id: string) {
    const updated = scenes
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i + 1 }))
    setScenes(updated)
    onScenesChanged(updated)
  }

  function handleUpdated(updated: SceneData) {
    // The server revalidates; we keep local state stable
    setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Scenes
          {scenes.length > 0 && (
            <span className="ml-1.5 text-muted-foreground font-normal">
              ({scenes.length})
            </span>
          )}
        </p>
        <SceneFormDialog
          plotNoteId={plotNoteId}
          characters={characters}
          locations={locations}
          onCreated={handleCreated}
        />
      </div>

      {scenes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-2">No scenes yet.</p>
      ) : (
        <DndContext
          id={`scenes-dnd-${plotNoteId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={scenes.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {scenes.map((scene) => (
                <SceneItem
                  key={scene.id}
                  scene={scene}
                  plotNoteId={plotNoteId}
                  characters={characters}
                  locations={locations}
                  onDeleted={handleDeleted}
                  onUpdated={handleUpdated}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
