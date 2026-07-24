import { ForbiddenError, localDev, none, vercelOidc } from "eve/channels/auth";
import { defaultEveAuth, eveChannel } from "eve/channels/eve";

import { isPublicId, SESSION_ID_ATTRIBUTE, SESSION_ID_HEADER } from "@/lib/identity";
import { isModelId, MODEL_HEADER } from "@/lib/models";

export default eveChannel({
  auth: [vercelOidc(), localDev(), none()],
  onMessage(ctx) {
    const auth = defaultEveAuth(ctx);
    if (!auth) return { auth };

    const sessionId = ctx.eve.request.headers.get(SESSION_ID_HEADER);
    if (sessionId !== null && !isPublicId(sessionId)) {
      throw new ForbiddenError({
        code: "invalid_session_id",
        message: "The session id header is invalid.",
      });
    }

    const attributes: Record<string, string | readonly string[]> = {
      ...auth.attributes,
    };
    if (sessionId !== null) attributes[SESSION_ID_ATTRIBUTE] = sessionId;
    const model = ctx.eve.request.headers.get(MODEL_HEADER);
    if (isModelId(model)) attributes.model = model;

    return { auth: { ...auth, attributes } };
  },
});
