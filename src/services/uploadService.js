import fs from "fs-extra";
import path from "path";
import unzipper from "unzipper";
import { EventEmitter } from "events";
import FileEntry from "../models/FileEntry.js";
import Session from "../models/Session.js";

class UploadService extends EventEmitter {
  constructor() {
    super();
    // 진행 중인 업로드의 상태 저장 (메모리)
    // 실무에서는 Redis 등을 사용하여 다중 인스턴스 대응 필요
    this.uploadStatus = new Map();
  }

  // 업로드 ID에 대한 이벤트 리스너 등록 헬퍼
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

    // 클라이언트 연결 종료 시 정리
    res.on("close", () => {
      this.cleanupListeners(uploadId, onProgress, onDone, onError);
    });
  }

  cleanupListeners(uploadId, onProgress, onDone, onError) {
    this.removeListener(`progress:${uploadId}`, onProgress);
    this.removeListener(`done:${uploadId}`, onDone);
    this.removeListener(`error:${uploadId}`, onError);
  }

  // 비동기 파일 처리 시작
  async processUpload(uploadId, sessionId, zipFilePath) {
    try {
      this.emit(`progress:${uploadId}`, {
        message: "Initializing extraction...",
        percent: 0,
      });

      // 1. 세션 상태 업데이트
      await Session.findByIdAndUpdate(sessionId, { status: "uploading" });

      // 2. 압축 해제 및 인덱싱
      const sessionDir = path.join(
        process.cwd(),
        "data",
        "uploads",
        "sessions",
        sessionId.toString()
      );
      await fs.ensureDir(sessionDir);

      // 기존 파일 정리 (덮어쓰기 정책)
      await FileEntry.deleteMany({ session: sessionId });
      await fs.emptyDir(sessionDir);

      const directory = await unzipper.Open.file(zipFilePath);
      const totalFiles = directory.files.length;
      let processedCount = 0;

      for (const file of directory.files) {
        const relativePath = file.path; // ZIP 내부 경로
        const fullPath = path.join(sessionDir, relativePath);

        // 보안: 상위 디렉토리 접근(Zip Slip) 방지
        if (!fullPath.startsWith(sessionDir)) continue;

        if (file.type === "Directory") {
          await fs.ensureDir(fullPath);
          await FileEntry.create({
            session: sessionId,
            path: relativePath,
            name: path.basename(relativePath),
            isDirectory: true,
            storageKey: fullPath,
          });
        } else {
          // 파일 저장
          // unzipper의 extract는 stream 처리가 까다로울 수 있어 buffer나 stream 사용
          // 여기서는 stream -> pipe 방식을 사용
          await fs.ensureDir(path.dirname(fullPath));

          const readStream = file.stream();
          const writeStream = fs.createWriteStream(fullPath);

          await new Promise((resolve, reject) => {
            readStream
              .pipe(writeStream)
              .on("finish", resolve)
              .on("error", reject);
          });

          await FileEntry.create({
            session: sessionId,
            path: relativePath,
            name: path.basename(relativePath),
            isDirectory: false,
            size: file.uncompressedSize,
            storageKey: fullPath,
            // 확장자 추출로 언어 추정 (간단 구현)
            language: path.extname(relativePath).slice(1),
          });
        }

        processedCount++;
        // 진행률 전송 (너무 잦으면 부하가 되므로 10개 단위로 전송 등 최적화 가능)
        const percent = Math.round((processedCount / totalFiles) * 100);
        this.emit(`progress:${uploadId}`, {
          message: `Processing ${relativePath}`,
          percent,
        });
      }

      // 3. 완료 처리
      await Session.findByIdAndUpdate(sessionId, { status: "ready" });

      // 임시 ZIP 파일 삭제
      await fs.remove(zipFilePath);

      this.emit(`done:${uploadId}`, {
        message: "Upload and processing complete",
        percent: 100,
      });
    } catch (error) {
      console.error("Upload processing error:", error);
      await Session.findByIdAndUpdate(sessionId, { status: "error" });
      this.emit(`error:${uploadId}`, { message: error.message });
    }
  }
}

export const uploadService = new UploadService();
