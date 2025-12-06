import fs from "fs-extra";
import path from "path";
import unzipper from "unzipper";
import { EventEmitter } from "events";
import FileEntry from "../models/FileEntry.js";
import Session from "../models/Session.js";

class UploadService extends EventEmitter {
  constructor() {
    super();
    this.uploadStatus = new Map();
  }

  // ... (subscribe 등 기존 코드와 동일) ...
  subscribe(uploadId, res) {
    const onProgress = (data) => {
      res.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const onDone = (data) => {
      res.write(`event: done\ndata: ${JSON.stringify(data)}\n\n`);
      res.end();
      this.cleanupListeners(uploadId, onProgress, onDone, onError);
    };
    const onError = (data) => {
      res.write(`event: error\ndata: ${JSON.stringify(data)}\n\n`);
      res.end();
      this.cleanupListeners(uploadId, onProgress, onDone, onError);
    };

    this.on(`progress:${uploadId}`, onProgress);
    this.on(`done:${uploadId}`, onDone);
    this.on(`error:${uploadId}`, onError);

    res.on("close", () => {
      this.cleanupListeners(uploadId, onProgress, onDone, onError);
    });
  }

  cleanupListeners(uploadId, onProgress, onDone, onError) {
    this.removeListener(`progress:${uploadId}`, onProgress);
    this.removeListener(`done:${uploadId}`, onDone);
    this.removeListener(`error:${uploadId}`, onError);
  }

  async processUpload(uploadId, sessionId, zipFilePath) {
    try {
      console.log(`[Start] Upload processing for Session: ${sessionId}`); // 로그 추가

      this.emit(`progress:${uploadId}`, {
        message: "Initializing...",
        percent: 0,
      });
      await Session.findByIdAndUpdate(sessionId, { status: "uploading" });

      const sessionDir = path.join(
        process.cwd(),
        "data",
        "uploads",
        "sessions",
        sessionId.toString()
      );
      await fs.ensureDir(sessionDir);
      await fs.emptyDir(sessionDir);
      await FileEntry.deleteMany({ session: sessionId });

      const directory = await unzipper.Open.file(zipFilePath);
      const totalFiles = directory.files.length;
      let processedCount = 0;

      const fileEntriesBatch = [];
      const createdDirs = new Set();

      console.log(`[Info] Total files in zip: ${totalFiles}`); // 로그 추가

      for (const file of directory.files) {
        // 경로 정규화 (Windows 역슬래시 \ -> /)
        let relativePath = file.path.replace(/\\/g, "/");

        // 디버깅: 실제 파일 경로가 어떻게 들어오는지 확인
        console.log(
          `[File Found] Original: ${file.path} -> Normalized: ${relativePath} (Type: ${file.type})`
        );

        // 끝에 / 가 있으면 제거
        if (relativePath.endsWith("/")) {
          relativePath = relativePath.slice(0, -1);
        }

        // __MACOSX 등 숨김 폴더/파일 무시
        if (
          relativePath.startsWith("__MACOSX") ||
          relativePath.includes("/.")
        ) {
          continue;
        }

        const fullPath = path.join(sessionDir, relativePath);
        if (!fullPath.startsWith(sessionDir)) continue;

        // 1. 폴더인 경우 (명시적)
        if (file.type === "Directory") {
          if (!createdDirs.has(relativePath)) {
            console.log(
              `[Action] Creating Explicit Directory: ${relativePath}`
            ); // 로그 추가
            await fs.ensureDir(fullPath);
            fileEntriesBatch.push({
              session: sessionId,
              path: relativePath,
              name: path.basename(relativePath),
              isDirectory: true,
              storageKey: fullPath,
            });
            createdDirs.add(relativePath);
          }
        }
        // 2. 파일인 경우
        else {
          // 암시적 부모 폴더 생성
          this.collectParentDirs(
            sessionId,
            relativePath,
            sessionDir,
            createdDirs,
            fileEntriesBatch
          );

          await fs.ensureDir(path.dirname(fullPath));

          // 파일 저장
          const readStream = file.stream();
          const writeStream = fs.createWriteStream(fullPath);
          await new Promise((resolve, reject) => {
            readStream
              .pipe(writeStream)
              .on("finish", resolve)
              .on("error", reject);
          });

          fileEntriesBatch.push({
            session: sessionId,
            path: relativePath,
            name: path.basename(relativePath),
            isDirectory: false,
            size: file.uncompressedSize,
            storageKey: fullPath,
            language: path.extname(relativePath).slice(1),
          });
        }

        processedCount++;
        if (processedCount % 10 === 0 || processedCount === totalFiles) {
          const percent = Math.round((processedCount / totalFiles) * 100);
          this.emit(`progress:${uploadId}`, {
            message: `Processing... (${percent}%)`,
            percent,
          });
        }
      }

      // DB 저장
      if (fileEntriesBatch.length > 0) {
        console.log(
          `[DB] Inserting ${fileEntriesBatch.length} entries to DB...`
        ); // 로그 추가
        await FileEntry.insertMany(fileEntriesBatch);
        console.log(`[DB] Insert complete.`); // 로그 추가
      } else {
        console.warn(`[Warning] No files were prepared for DB insertion!`);
      }

      await Session.findByIdAndUpdate(sessionId, { status: "ready" });
      await fs.remove(zipFilePath);

      this.emit(`done:${uploadId}`, { message: "Complete", percent: 100 });
    } catch (error) {
      console.error("Upload processing error:", error);
      await Session.findByIdAndUpdate(sessionId, { status: "error" });
      this.emit(`error:${uploadId}`, { message: error.message });
    }
  }

  collectParentDirs(sessionId, filePath, sessionDir, createdDirs, batchArray) {
    const parts = filePath.split("/");
    parts.pop(); // 파일명 제거

    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!createdDirs.has(currentPath)) {
        console.log(
          `[Action] Creating Implicit Directory: ${currentPath} (derived from ${filePath})`
        ); // 로그 추가

        const fullDirPath = path.join(sessionDir, currentPath);

        batchArray.push({
          session: sessionId,
          path: currentPath,
          name: part,
          isDirectory: true,
          storageKey: fullDirPath,
        });
        createdDirs.add(currentPath);
      }
    }
  }
}

export const uploadService = new UploadService();
