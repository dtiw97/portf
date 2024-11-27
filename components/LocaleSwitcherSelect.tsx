'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import clsx from 'clsx';
import { useTransition } from 'react';
import { Locale } from '@/i18n/config';
import { setUserLocale } from '@/services/locale';

type Props = {
  defaultValue: string;
  items: Array<{ value: string; label: string }>;
  label: string;
};

export default function LocaleSwitcherSelect({
  defaultValue,
  items,
  label
}: Props) {
  const [isPending, startTransition] = useTransition();

  function onChange(value: string) {
    const locale = value as Locale;
    startTransition(() => {
      setUserLocale(locale);
    });
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
          aria-label={label}
        >
          <Button variant="ghost" size={"sm"}>
            <Languages size={20} className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[8rem]">
          <DropdownMenuRadioGroup value={defaultValue} onValueChange={onChange}>
            {items.map((item) => (
              <DropdownMenuRadioItem
                key={item.value}
                value={item.value}
                className="flex gap-2"
              >
                <span className="text-foreground">{item.label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}