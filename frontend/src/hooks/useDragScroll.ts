import { useEffect, useRef } from "react";

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const drag = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      el.scrollLeft += event.deltaY;
      event.preventDefault();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(event: React.PointerEvent) {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = {
      down: true,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(event.pointerId);
    el.style.cursor = "grabbing";
  }

  function onPointerMove(event: React.PointerEvent) {
    const el = ref.current;
    if (!el || !drag.current.down) return;
    const dx = event.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.scrollLeft - dx;
  }

  function onPointerUp(event: React.PointerEvent) {
    const el = ref.current;
    drag.current.down = false;
    if (el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    if (el) el.style.cursor = "";
  }

  function onClickCapture(event: React.MouseEvent) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  return { ref, onPointerDown, onPointerMove, onPointerUp, onClickCapture };
}