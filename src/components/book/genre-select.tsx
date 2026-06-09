"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { BOOK_GENRES } from "@/lib/constants"

interface GenreSelectProps {
  value: string[]
  onChange: (genres: string[]) => void
}

export function GenreSelect({ value = [], onChange }: GenreSelectProps) {
  const [open, setOpen] = useState(false)

  function toggle(genre: string) {
    onChange(value.includes(genre) ? value.filter((g) => g !== genre) : [...value, genre])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 flex-wrap gap-1 font-normal"
        >
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {value.map((g) => (
                <Badge key={g} variant="secondary" className="text-xs">
                  {g}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">Select genres…</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search genres…" />
          <CommandEmpty>No genre found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {BOOK_GENRES.map((genre) => (
              <CommandItem key={genre} value={genre} onSelect={() => toggle(genre)}>
                <Check
                  className={cn("mr-2 h-4 w-4", value.includes(genre) ? "opacity-100" : "opacity-0")}
                />
                {genre}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
