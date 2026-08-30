"use client";

import { useId, type ComponentProps } from "react";
import {
  Controller,
  type Control,
  type FieldPathByValue,
  type FieldValues,
} from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type InputProps = Omit<
  ComponentProps<typeof Input>,
  "defaultValue" | "name" | "onBlur" | "onChange" | "ref" | "value"
>;

interface ControlledInputFieldProps<TFieldValues extends FieldValues>
  extends InputProps {
  control: Control<TFieldValues>;
  name: FieldPathByValue<TFieldValues, string>;
  label: string;
  description?: string;
}

export function ControlledInputField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  id: providedId,
  disabled,
  ...inputProps
}: ControlledInputFieldProps<TFieldValues>) {
  const generatedId = useId();
  const inputId = providedId ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = `${inputId}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const describedBy = [
          descriptionId,
          fieldState.error ? errorId : undefined,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Field data-invalid={fieldState.invalid} data-disabled={disabled}>
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
            <Input
              {...inputProps}
              {...field}
              id={inputId}
              value={field.value ?? ""}
              disabled={disabled}
              aria-invalid={fieldState.invalid || undefined}
              aria-describedby={describedBy || undefined}
              className="h-11 bg-background text-start"
            />
            {description ? (
              <FieldDescription id={descriptionId}>
                {description}
              </FieldDescription>
            ) : null}
            <FieldError id={errorId} errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}
