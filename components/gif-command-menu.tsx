"use client";

import { HouseIcon, ImageSquareIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { copyGifUrlWithToast } from "@/lib/copy-gif-url";
import { gifs } from "@/lib/gifs";

const GifCommandMenu = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((isOpen) => !isOpen);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <CommandDialog
      description="Search the orc reaction gif catalog."
      onOpenChange={setOpen}
      open={open}
      title="Search gifs"
    >
      <Command>
        <CommandInput placeholder="Search gifs…" />
        <CommandList>
          <CommandEmpty>No matching gifs.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                router.push("/");
              }}
              value="home browse all gifs"
            >
              <HouseIcon data-icon="inline-start" />
              Browse all gifs
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Gifs">
            {gifs.map((gif) => (
              <CommandItem
                key={gif.slug}
                onSelect={() => {
                  setOpen(false);
                  void copyGifUrlWithToast(gif);
                }}
                value={`${gif.title} ${gif.slug} ${gif.tags.join(" ")}`}
              >
                <ImageSquareIcon data-icon="inline-start" />
                {gif.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
};

export { GifCommandMenu };
