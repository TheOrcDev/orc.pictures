"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";

import { GifEmpty } from "@/components/gif-empty";
import { GifGrid } from "@/components/gif-grid";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { Gif } from "@/lib/gifs";
import { searchGifs } from "@/lib/gifs";

interface GifPickerProps {
  gifs: Gif[];
}

const GifPicker = ({ gifs }: GifPickerProps) => {
  const [query, setQuery] = useState("");
  const results = searchGifs(query, gifs);
  const hasQuery = query.trim() !== "";

  return (
    <div className="flex flex-col gap-8">
      <FieldGroup>
        <Field>
          <FieldLabel className="sr-only" htmlFor="gif-search">
            Search gifs
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              autoComplete="off"
              id="gif-search"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Search gifs…"
              spellCheck={false}
              type="search"
              value={query}
            />
            <InputGroupAddon>
              <MagnifyingGlass />
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>
      {results.length === 0 ? (
        <GifEmpty hasQuery={hasQuery} />
      ) : (
        <GifGrid gifs={results} />
      )}
    </div>
  );
};

export { GifPicker };
