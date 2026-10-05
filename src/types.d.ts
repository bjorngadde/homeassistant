// Types for things the cards use that no library declares.

/** Replaced with the package.json version by scripts/build.mjs. */
declare const __VERSION__: string;

/** One entry of the card picker list that Home Assistant reads from window.customCards. */
interface CustomCardEntry {
  type: string;
  name: string;
  description?: string;
  preview?: boolean;
}

interface Window {
  customCards?: CustomCardEntry[];
}
