import React from "react";

export function useContextMenu(_items: any[] = []) {
  return {
    bind: { onContextMenu: undefined as any },
    menuProps: { items: [], position: null, onClose: () => {} },
  };
}

export function ContextMenu(_props: any) {
  return null;
}
