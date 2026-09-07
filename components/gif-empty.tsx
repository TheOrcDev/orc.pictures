import { ImageSquare, MagnifyingGlass } from "@phosphor-icons/react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface GifEmptyProps {
  hasQuery: boolean;
}

const GifEmpty = ({ hasQuery }: GifEmptyProps) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        {hasQuery ? <MagnifyingGlass /> : <ImageSquare />}
      </EmptyMedia>
      <EmptyTitle>{hasQuery ? "No matching gifs" : "No gifs yet"}</EmptyTitle>
      <EmptyDescription>
        {hasQuery
          ? "Try another search. Slugs, titles, and tags are all fair game."
          : "The library is empty. Import a reaction pack to fill this grid."}
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

export { GifEmpty };
