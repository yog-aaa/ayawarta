import { describe, expect, it } from "vitest";
import { enabledPublishThemes, isSigerPublishEnabled } from "./siger-publish-feature";

const local = "postgresql://postgres:local-only@127.0.0.1:55436/ayawarta_siger";
const approved = {
  AYAWARTA_SIGER_PUBLISH: "enabled",
  DATABASE_URL: local,
  DATABASE_URL_POOLED: local,
  VERCEL_ENV: "preview",
};

describe("Siger publication target gate", () => {
  it("requires the explicit switch and both exact disposable loopback targets", () => {
    expect(isSigerPublishEnabled(approved)).toBe(true);
    expect(enabledPublishThemes(approved)).toEqual(["classic-rose", "siger-priangan"]);
    for (const env of [
      { ...approved, AYAWARTA_SIGER_PUBLISH: undefined },
      { ...approved, DATABASE_URL_POOLED: undefined },
      { ...approved, DATABASE_URL: local.replace("127.0.0.1", "localhost") },
      { ...approved, DATABASE_URL: local.replace("55436", "5432") },
      { ...approved, DATABASE_URL: local.replace("ayawarta_siger", "ayawarta") },
      { ...approved, DATABASE_URL_POOLED: `${local}?host=neon.example` },
      { ...approved, VERCEL_ENV: "production" },
      { ...approved, AYAWARTA_DEPLOYMENT_TARGET: "production" },
    ]) {
      expect(isSigerPublishEnabled(env)).toBe(false);
      expect(enabledPublishThemes(env)).toEqual(["classic-rose"]);
    }
  });
});
