// يثبت جذر المشروع صراحةً — يمنع Next.js من اعتبار مجلد الأب (`D:\next js`)
// جذرًا للـ workspace بسبب وجود package-lock.json فيه.
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
