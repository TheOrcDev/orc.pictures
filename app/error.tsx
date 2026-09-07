"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}

const ErrorPage = ({ reset, unstable_retry }: ErrorPageProps) => {
  const retry = unstable_retry ?? reset;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningCircleIcon />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            The picker hit a snag. Retry this page or come back to the catalog.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={retry} type="button">
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
};

export default ErrorPage;
