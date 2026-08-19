import { GuestAsk } from "../../../src/components/GuestAsk.tsx";
import { createProjectionPage } from "../../../src/projection-page.ts";

export const dynamic = "force-dynamic";
export default createProjectionPage(GuestAsk);
