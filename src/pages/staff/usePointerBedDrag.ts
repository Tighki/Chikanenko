import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Options = {
  onDropOnBed: (applicationId: string, bedKey: string) => void;
  onDropOnPool: (applicationId: string) => void;
};

export function usePointerBedDrag(options: Options) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overBedKey, setOverBedKey] = useState("");
  const [overPool, setOverPool] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!draggingId) return;

    document.body.classList.add("fund-pointer-dragging");

    function onMove(event: PointerEvent) {
      setDragPos({ x: event.clientX, y: event.clientY });
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const bed = target?.closest<HTMLElement>("[data-bed-key]");
      const pool = target?.closest<HTMLElement>("[data-student-pool]");
      setOverBedKey(bed?.dataset.bedKey ?? "");
      setOverPool(Boolean(pool) && !bed);
    }

    function finish(event: PointerEvent) {
      const applicationId = draggingId;
      setDraggingId(null);
      setOverBedKey("");
      setOverPool(false);
      setDragPos(null);
      document.body.classList.remove("fund-pointer-dragging");

      const target = document.elementFromPoint(event.clientX, event.clientY);
      const bed = target?.closest<HTMLElement>("[data-bed-key]");
      const pool = target?.closest<HTMLElement>("[data-student-pool]");
      if (!applicationId) return;
      if (bed?.dataset.bedKey) {
        optionsRef.current.onDropOnBed(applicationId, bed.dataset.bedKey);
      } else if (pool) {
        optionsRef.current.onDropOnPool(applicationId);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.body.classList.remove("fund-pointer-dragging");
    };
  }, [draggingId]);

  function beginDrag(applicationId: string, event: ReactPointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    setDragPos({ x: event.clientX, y: event.clientY });
    setDraggingId(applicationId);
  }

  return { draggingId, overBedKey, overPool, dragPos, beginDrag };
}
