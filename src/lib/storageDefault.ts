/* 앱 전체가 함께 쓰는 Storage 접근 한 벌.
   순수 로직은 storage.ts 에 있고, 여기서 실제 클라이언트를 붙인다.
   (storage.ts 를 불러오는 것만으로 Supabase 클라이언트가 생기지 않게) */
import { createStorage } from "./storage";
import { sb, MEDIA_BUCKET } from "./supabase";

const lazy = () => createStorage(
  { storage: { from: (b: string) => sb().storage.from(b) } },
  MEDIA_BUCKET,
);

let instance: ReturnType<typeof createStorage> | null = null;
const get = () => (instance ??= lazy());

export const signPaths: ReturnType<typeof createStorage>["signPaths"] = (p) => get().signPaths(p);
export const signOne: ReturnType<typeof createStorage>["signOne"] = (p) => get().signOne(p);
export const fetchSigned: ReturnType<typeof createStorage>["fetchSigned"] = (p) => get().fetchSigned(p);
export const removeFiles: ReturnType<typeof createStorage>["removeFiles"] = (p) => get().removeFiles(p);
export const clearSignedUrlCache = (): void => get().clearSignedUrlCache();
