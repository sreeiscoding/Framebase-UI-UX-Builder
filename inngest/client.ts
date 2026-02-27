import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "framebase",
  signingKey: process.env.INNGEST_SIGNING_KEY,
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export const inngestEnabled = Boolean(process.env.INNGEST_EVENT_KEY);
