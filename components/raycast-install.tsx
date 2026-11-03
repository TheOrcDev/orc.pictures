import { PlusIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { RAYCAST_STORE_URL } from "@/lib/raycast";

const RaycastInstall = () => (
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
    size="sm"
    variant="outline"
  >
    <PlusIcon data-icon="inline-start" />
    Add to Raycast
  </Button>
);

export { RaycastInstall };
