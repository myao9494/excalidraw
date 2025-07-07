import { newElement, CaptureUpdateAction } from "@excalidraw/element";
import { viewportCoordsToSceneCoords } from "@excalidraw/common";

import { register } from "./register";

export const actionCreateNote = register({
  name: "createNote",
  label: "labels.createNote",
  icon: null,
  viewMode: false,
  trackEvent: {
    category: "element",
    action: "create",
  },
  keyTest: (event) => {
    return event.key === "n" && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
  },
  perform: (elements, appState, _value, app) => {
    // カーソルの最後の位置を取得
    const lastPointerPosition = app.lastViewportPosition;
    
    let x: number, y: number;
    
    if (lastPointerPosition) {
      // カーソル位置をシーン座標に変換
      const sceneCoords = viewportCoordsToSceneCoords(
        { 
          clientX: lastPointerPosition.x, 
          clientY: lastPointerPosition.y 
        },
        appState,
      );
      x = sceneCoords.x;
      y = sceneCoords.y;
    } else {
      // フォールバック: ビューポート中央
      x = appState.scrollX + (appState.width / 2) / appState.zoom.value;
      y = appState.scrollY + (appState.height / 2) / appState.zoom.value;
    }

    const newNoteElement = newElement({
      type: "rectangle",
      x: x - 100, // 付箋の中央をカーソル位置に
      y: y - 75,  // 付箋の中央をカーソル位置に
      width: 200,
      height: 150,
      strokeColor: "#1e1e1e",
      backgroundColor: "#fef3c7",
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 0,
      opacity: 100,
    });

    return {
      elements: [...elements, newNoteElement],
      appState: {
        ...appState,
        selectedElementIds: {
          ...appState.selectedElementIds,
          [newNoteElement.id]: true,
        },
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
});