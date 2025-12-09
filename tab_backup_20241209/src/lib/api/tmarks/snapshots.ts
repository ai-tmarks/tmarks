/**
 * TMarks Snapshots API
 * 网页快照相关接口
 */

import { TMarksClient } from './client';

export interface Snapshot {
  id: string;
  version: number;
  file_size: number;
  content_hash: string;
  snapshot_title: string;
  is_latest: boolean;
  created_at: string;
}

export interface CreateSnapshotRequest {
  html_content: string;
  title: string;
  url: string;
  force?: boolean;
}

export interface SnapshotsListResponse {
  data: {
    snapshots: Snapshot[];
    total: number;
  };
}

export interface CreateSnapshotResponse {
  data: {
    snapshot: Snapshot;
  };
}

export class SnapshotsAPI extends TMarksClient {
  /**
   * 创建书签快照
   * POST /api/tab/bookmarks/:id/snapshots
   */
  async createSnapshot(bookmarkId: string, data: CreateSnapshotRequest): Promise<CreateSnapshotResponse> {
    return this.post<CreateSnapshotResponse>(`/tab/bookmarks/${bookmarkId}/snapshots`, data);
  }

  /**
   * 获取书签的快照列表
   * GET /api/tab/bookmarks/:id/snapshots
   */
  async getSnapshots(bookmarkId: string): Promise<SnapshotsListResponse> {
    return this.get<SnapshotsListResponse>(`/tab/bookmarks/${bookmarkId}/snapshots`);
  }

  /**
   * 删除快照
   * DELETE /api/tab/bookmarks/:id/snapshots/:snapshotId
   */
  async deleteSnapshot(bookmarkId: string, snapshotId: string): Promise<void> {
    return this.delete<void>(`/tab/bookmarks/${bookmarkId}/snapshots/${snapshotId}`);
  }
}
