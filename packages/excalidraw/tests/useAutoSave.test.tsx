/**
 * useAutoSave フックのテスト
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { useAutoSave } from "../hooks/useAutoSave";

import type { AppState, BinaryFiles } from "../types";

// FileSystemManagerのモック
vi.mock("../data/fileSystemManager", () => ({
  FileSystemManager: vi.fn().mockImplementation(() => ({
    saveToFolder: vi.fn().mockResolvedValue(undefined),
    getErrorMessage: vi.fn().mockReturnValue("テストエラー"),
  })),
}));

// urlParamsのモック
vi.mock("../utils/urlParams", () => ({
  getUrlFileParams: vi.fn().mockReturnValue({}),
  watchUrlParams: vi.fn().mockImplementation((callback) => {
    callback({ folder: "test", file: "test.excalidraw" });
    return () => {};
  }),
  getFullFilePath: vi.fn().mockReturnValue("test/test.excalidraw"),
  generateSafeFileName: vi.fn().mockImplementation((name) => name),
}));

describe("useAutoSave", () => {
  const mockElements: readonly ExcalidrawElement[] = [
    {
      id: "test-1",
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      angle: 0,
      strokeColor: "#000",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      roundness: null,
      seed: 123,
      versionNonce: 456,
      isDeleted: false,
      boundElements: null,
      updated: 1,
      link: null,
      locked: false,
      frameId: null,
      index: "a0" as any,
      customData: null,
      // 不足していたプロパティを追加
      version: 1,
    } as unknown as ExcalidrawElement,
  ];

  const mockAppState: AppState = {
    viewBackgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: 0,
    zoom: { value: 1 },
  } as AppState;

  const mockFiles: BinaryFiles = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("フックが正常に初期化される", () => {
    const mockOnSaveSuccess = vi.fn();
    const mockOnSaveError = vi.fn();

    const { result } = renderHook(() =>
      useAutoSave({
        elements: mockElements,
        appState: mockAppState,
        files: mockFiles,
        onSaveSuccess: mockOnSaveSuccess,
        onSaveError: mockOnSaveError,
      }),
    );

    expect(result.current.manualSave).toBeDefined();
    expect(typeof result.current.manualSave).toBe("function");
    expect(result.current.isAutoSaveEnabled).toBeDefined();
  });

  it("デバウンス機能が動作する", async () => {
    const mockOnSaveSuccess = vi.fn();

    renderHook(() =>
      useAutoSave({
        elements: mockElements,
        appState: mockAppState,
        files: mockFiles,
        onSaveSuccess: mockOnSaveSuccess,
        debounceDelay: 1000,
      }),
    );

    // デバウンス時間内は保存されない
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockOnSaveSuccess).not.toHaveBeenCalled();

    // デバウンス時間後に保存される
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 非同期処理を待つ
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockOnSaveSuccess).toHaveBeenCalled();
  });

  it("手動保存が実行される", async () => {
    const mockOnSaveSuccess = vi.fn();

    const { result } = renderHook(() =>
      useAutoSave({
        elements: mockElements,
        appState: mockAppState,
        files: mockFiles,
        onSaveSuccess: mockOnSaveSuccess,
      }),
    );

    await act(async () => {
      await result.current.manualSave();
    });

    expect(mockOnSaveSuccess).toHaveBeenCalled();
  });
});
