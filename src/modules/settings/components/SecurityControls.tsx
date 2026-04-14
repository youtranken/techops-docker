'use client';

/**
 * Reusable control components cho Security settings
 */

// Toggle switch
interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${checked ? 'bg-primary' : 'bg-muted'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
      `}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform
        ${checked ? 'translate-x-6' : 'translate-x-1'}
      `} />
    </button>
  );
}

// Number input
interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  unit?: string;
}

export function NumberInput({ value, onChange, min, max, disabled, unit }: NumberInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        disabled={disabled}
        className="w-full px-3 py-1.5 text-sm border rounded-md bg-background text-right
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {unit && <span className="text-xs text-muted-foreground shrink-0">{unit}</span>}
    </div>
  );
}
