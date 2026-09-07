import { gifs } from "@/lib/gifs";

export const dynamic = "force-static";

export const GET = (): Response => Response.json(gifs);
