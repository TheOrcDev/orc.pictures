import { PlusIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { RAYCAST_STORE_URL } from "@/lib/raycast";

const RaycastInstall = () => (
  <div className="flex flex-col items-center gap-2">
    <Button
      nativeButton={false}
      render={
        <a
          aria-label="Add to Raycast"
          href={RAYCAST_STORE_URL}
          rel="noreferrer"
          target="_blank"
        />
      }
    >
      <PlusIcon data-icon="inline-start" />
      Add to Raycast
    </Button>
    <p className="text-muted-foreground text-xs">
      Copy the GIF file and paste it into X
    </p>
  </div>
);

export { RaycastInstall };
