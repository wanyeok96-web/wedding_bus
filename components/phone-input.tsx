"use client";

import { useRef } from "react";

const SIZES = [3, 4, 4] as const;
const LABELS = ["연락처 앞자리", "연락처 가운데 자리", "연락처 뒷자리"] as const;
const PLACEHOLDERS = ["010", "0000", "0000"] as const;

export type PhoneParts = [string, string, string];

export function PhoneInput({
  value,
  onChange,
  disabled = false,
}: {
  value: PhoneParts;
  onChange: (next: PhoneParts) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function focusAt(index: number) {
    const input = refs.current[index];
    if (!input) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }

  function fillFrom(index: number, digits: string) {
    const next = [...value] as PhoneParts;
    let rest = digits;
    let last = index;
    for (let i = index; i < SIZES.length && rest.length > 0; i += 1) {
      next[i] = rest.slice(0, SIZES[i]);
      rest = rest.slice(SIZES[i]);
      last = i;
    }
    onChange(next);
    const target = next[last].length === SIZES[last] && last < SIZES.length - 1 ? last + 1 : last;
    window.requestAnimationFrame(() => focusAt(target));
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > SIZES[index]) {
      fillFrom(index, digits);
      return;
    }
    const next = [...value] as PhoneParts;
    next[index] = digits;
    onChange(next);
    if (digits.length === SIZES[index] && index < SIZES.length - 1) {
      window.requestAnimationFrame(() => focusAt(index + 1));
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    if (event.key === "Backspace" && index > 0 && (value[index] === "" || atStart)) {
      event.preventDefault();
      const next = [...value] as PhoneParts;
      next[index - 1] = next[index - 1].slice(0, -1);
      onChange(next);
      window.requestAnimationFrame(() => focusAt(index - 1));
    } else if (event.key === "ArrowLeft" && atStart && index > 0) {
      event.preventDefault();
      focusAt(index - 1);
    } else if (
      event.key === "ArrowRight" &&
      input.selectionStart === input.value.length &&
      index < SIZES.length - 1
    ) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
      refs.current[index + 1]?.setSelectionRange(0, 0);
    }
  }

  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (digits.length <= SIZES[index]) return;
    event.preventDefault();
    fillFrom(index, digits);
  }

  return (
    <div className="phone">
      {SIZES.map((size, index) => (
        <span className="phone-part" key={LABELS[index]}>
          {index > 0 ? <span className="phone-dash" aria-hidden="true">-</span> : null}
          <input
            ref={(node) => {
              refs.current[index] = node;
            }}
            value={value[index]}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={(event) => event.currentTarget.select()}
            inputMode="numeric"
            autoComplete={index === 0 ? "tel" : "off"}
            pattern="[0-9]*"
            maxLength={size + 8}
            placeholder={PLACEHOLDERS[index]}
            aria-label={LABELS[index]}
            disabled={disabled}
          />
        </span>
      ))}
    </div>
  );
}
