import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Options = {
  onDropOnBed: (applicationId: string, bedKey: string) => void;
  onDropOnPool: (applicationId: string) => void;
};

export function usePointerBedDrag(options: Options) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overBedKey, setOverBedKey] = useState("");
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!draggingId) return;

    document.body.classList.add("fund-pointer-dragging");

    function onMove(event: PointerEvent) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const bed = target?.closest<HTMLElement>("[data-bed-key]");
      setOverBedKey(bed?.dataset.bedKey ?? "");
    }

    function finish(event: PointerEvent) {
      const applicationId = draggingId;
      setDraggingId(null);
      setOverBedKey("");
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
    setDraggingId(applicationId);
  }

  return { draggingId, overBedKey, beginDrag };
}
