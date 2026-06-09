"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Trash2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createBoard, deleteBoard, type BoardElementData, type BoardConnectionData, type CharacterLinkData } from "@/actions/studio"
import { BoardCanvas } from "./board-canvas"
import type { CharacterOption, LocationOption } from "./board-sidebar"

type BoardMeta = { id: string; name: string }

interface BoardViewProps {
  bookId: string
  boards: BoardMeta[]
  activeBoardId: string
  initialElements: BoardElementData[]
  initialConnections: BoardConnectionData[]
  characterLinks: CharacterLinkData[]
  characters: CharacterOption[]
  locations: LocationOption[]
}

export function BoardView({
  bookId,
  boards: initialBoards,
  activeBoardId,
  initialElements,
  initialConnections,
  characterLinks,
  characters,
  locations,
}: BoardViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [boards, setBoards] = useState(initialBoards)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<BoardMeta | null>(null)
  const [isCreating, startCreate] = useTransition()

  const activeBoard = boards.find((b) => b.id === activeBoardId) ?? boards[0]

  function switchBoard(boardId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("boardId", boardId)
    router.push(`/write/${bookId}/studio/board?${params.toString()}`)
  }

  function handleCreate() {
    if (!newName.trim()) return
    startCreate(async () => {
      const result = await createBoard(bookId, newName.trim())
      if ("board" in result) {
        setBoards((prev) => [...prev, result.board])
        setCreateOpen(false)
        setNewName("")
        switchBoard(result.board.id)
      }
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    startTransition(async () => {
      const result = await deleteBoard(id)
      if ("success" in result) {
        const remaining = boards.filter((b) => b.id !== id)
        setBoards(remaining)
        if (activeBoardId === id && remaining.length > 0) {
          switchBoard(remaining[0].id)
        } else if (remaining.length === 0) {
          router.push(`/write/${bookId}/studio/board`)
        }
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board selector bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-background shrink-0">
        {boards.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 max-w-[220px]">
                <span className="truncate">{activeBoard?.name ?? "Select board"}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {boards.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  className="justify-between gap-2"
                  onSelect={() => switchBoard(b.id)}
                >
                  <span className="truncate">{b.name}</span>
                  {b.id === activeBoard?.id && (
                    <span className="text-xs text-muted-foreground shrink-0">active</span>
                  )}
                </DropdownMenuItem>
              ))}
              {boards.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => activeBoard && setDeleteTarget(activeBoard)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete current board
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <Plus className="h-4 w-4" />
              New board
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Create board</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Board name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                maxLength={60}
              />
              <Button onClick={handleCreate} disabled={!newName.trim() || isCreating}>
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Canvas or empty state */}
      {boards.length === 0 || !activeBoard ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <p className="text-sm">No boards yet. Create one to start visualising your story.</p>
          <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create your first board
          </Button>
        </div>
      ) : (
        <BoardCanvas
          key={activeBoard.id}
          bookId={bookId}
          boardId={activeBoard.id}
          initialElements={initialElements}
          initialConnections={initialConnections}
          characterLinks={characterLinks}
          characters={characters}
          locations={locations}
        />
      )}

      {/* Delete board confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot; and all its elements. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
