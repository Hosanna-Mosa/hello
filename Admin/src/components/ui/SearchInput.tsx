import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";

type Props = { value: string; onChange: (value: string) => void; placeholder: string; label: string };

export function SearchInput({ value, onChange, placeholder, label }: Props) {
  return (
    <Input
      type="search"
      aria-label={label}
      value={value}
      placeholder={placeholder}
      maxLength={60}
      onChange={(e) => onChange(e.target.value)}
      leading={<Icon name="search" size={16} />}
    />
  );
}
