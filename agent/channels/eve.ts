import { ForbiddenError, localDev, none, vercelOidc } from "eve/channels/auth";
import { defaultEveAuth, eveChannel } from "eve/channels/eve";

import { isPublicId, SESSION_ID_ATTRIBUTE, SESSION_ID_HEADER } from "@/lib/identity";

export default eveChannel({
  auth: [vercelOidc(), localDev(), none()],
  onMessage(ctx) {
    const auth = defaultEveAuth(ctx);
    if (!auth) return { auth };

    const sessionId = ctx.eve.request.headers.get(SESSION_ID_HEADER);
    if (sessionId === null) return { auth };
    if (!isPublicId(sessionId)) {
      throw new ForbiddenError({
        code: "invalid_session_id",
        message: "The session id header is invalid.",
      });
    }

    const attributes = {
      ...auth.attributes,
      [SESSION_ID_ATTRIBUTE]: sessionId,
    };
    return { auth: { ...auth, attributes } };
  },
});
