'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-amber-500 text-white rounded-md font-medium hover:bg-amber-600"
    >
      PDF olarak yazdır (Ctrl+P → Kaydet)
    </button>
  );
}
