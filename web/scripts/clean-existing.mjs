/**
 * 对已抓取的 data/articles.json 应用当前清洗规则，无需重抓。
 * 写入前先落一份备份 —— 清洗规则改错时能直接回退，
 * 否则只能重新抓取（四语言约 1000+ 次详情请求）。
 */
import { readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanArticle } from "../lib/clean.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, "");
const FILE = path.join(ROOT, "data", "articles.json");
const BACKUP = path.join(ROOT, "data", "articles.backup.json");

const store = JSON.parse(await readFile(FILE, "utf-8"));
const before = JSON.stringify(store.articles);

store.articles = store.articles.map(cleanArticle);
const after = JSON.stringify(store.articles);

if (before === after) {
  console.log("无变化，未写入");
} else {
  await copyFile(FILE, BACKUP);
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
  console.log(`已清洗 ${store.articles.length} 条（备份: data/articles.backup.json）`);
}
