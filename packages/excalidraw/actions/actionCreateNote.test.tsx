import React from "react";

import { Excalidraw } from "../index";
import { act, render } from "../tests/test-utils";
import { Keyboard } from "../tests/helpers/ui";

import { actionCreateNote } from "./actionCreateNote";

const { h } = window;

describe("actionCreateNote", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("nキーを押したとき付箋が作成される", async () => {
    const initialElementsCount = h.elements.length;

    act(() => {
      Keyboard.keyDown("n");
    });

    expect(h.elements).toHaveLength(initialElementsCount + 1);
    
    const noteElement = h.elements[h.elements.length - 1];
    expect(noteElement.type).toBe("rectangle");
    expect(noteElement.width).toBe(200);
    expect(noteElement.height).toBe(150);
    expect(noteElement.backgroundColor).toBe("#fef3c7");
    expect(noteElement.fillStyle).toBe("solid");
    expect(noteElement.strokeWidth).toBe(2);
    expect(noteElement.roughness).toBe(0);
    expect(noteElement.strokeColor).toBe("#1e1e1e");
    expect(noteElement.opacity).toBe(100);
    
    // ビューポート中央付近に配置されているかチェック
    const expectedCenterX = h.state.scrollX + (h.state.width / 2) / h.state.zoom.value;
    const expectedCenterY = h.state.scrollY + (h.state.height / 2) / h.state.zoom.value;
    expect(noteElement.x).toBeCloseTo(expectedCenterX - 100, 1);
    expect(noteElement.y).toBeCloseTo(expectedCenterY - 75, 1);
  });

  it("作成された付箋が選択状態になる", async () => {
    act(() => {
      Keyboard.keyDown("n");
    });

    const noteElement = h.elements[h.elements.length - 1];
    expect(h.state.selectedElementIds[noteElement.id]).toBe(true);
  });

  it("keyTest関数が正しく動作する", () => {
    const mockEvent = {
      key: "n",
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    };

    const result = actionCreateNote.keyTest(mockEvent as any);
    expect(result).toBe(true);
  });

  it("修飾キーが押されたときkeyTestがfalseを返す", () => {
    const mockEventWithCtrl = {
      key: "n",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    };

    const result = actionCreateNote.keyTest(mockEventWithCtrl as any);
    expect(result).toBe(false);
  });
});