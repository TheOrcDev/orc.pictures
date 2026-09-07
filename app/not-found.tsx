"use client";

import { ImageSquareIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const NotFound = () => (
  <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ImageSquareIcon />
        </EmptyMedia>
        <EmptyTitle>Gif not found</EmptyTitle>
        <EmptyDescription>
          That slug is not in the catalog. Search the library or pick another
          reaction.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          nativeButton={false}
          render={<Link aria-label="Browse gifs" href="/" />}
        >
          Browse gifs
        </Button>
      </EmptyContent>
    </Empty>
  </main>
);

export default NotFound;
