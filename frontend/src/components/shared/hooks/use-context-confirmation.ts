"use client";

import { useState } from "react";

/** Acknowledgement belongs to one reviewed context, never to its replacement. */
export function useContextConfirmation(contextKey: string | null) {
  const [state, setState] = useState({ contextKey, confirmed: false });
  if (state.contextKey !== contextKey) {
    setState({ contextKey, confirmed: false });
  }
  return {
    confirmed: contextKey !== null && state.contextKey === contextKey && state.confirmed,
    setConfirmed: (confirmed: boolean) => setState({ contextKey, confirmed }),
  };
}
