import { useEffect, useRef } from "react";

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const drag = useRef({
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    active: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      el.scrollLeft += event.deltaY;
      event.preventDefault();
    };

    const onMove = (event: PointerEvent) => {
      if (!drag.current.active || event.pointerId !== drag.current.pointerId) return;
      const dx = event.clientX - drag.current.startX;
      if (Math.abs(dx) <= 8) return;
      drag.current.moved = true;
      el.scrollLeft = drag.current.scrollLeft - dx;
      el.style.cursor = "grabbing";
    };

    const onUp = (event: PointerEvent) => {
      if (!drag.current.active || event.pointerId !== drag.current.pointerId) return;
      drag.current.active = false;
      el.style.cursor = "";
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function onPointerDown(event: React.PointerEvent) {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
      active: true,
    };
  }

  function onClickCapture(event: React.MouseEvent) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  return { ref, onPointerDown, onClickCapture };
}