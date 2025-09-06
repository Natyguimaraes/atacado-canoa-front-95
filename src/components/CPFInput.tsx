// src/components/CPFInput.tsx

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { formatCpf, validateCpf, unformatCpf } from '@/utils/cpfUtils';
import { cn } from '@/lib/utils';

interface CPFInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  required?: boolean;
  className?: string;
  showValidation?: boolean;
}

const CPFInput: React.FC<CPFInputProps> = ({
  value,
  onChange,
  id = 'cpf',
  label = 'CPF',
  required = false,
  className,
  showValidation = true
}) => {
  const [touched, setTouched] = useState(false);
  
  const isValid = !value || validateCpf(value);
  const showError = touched && showValidation && value && !isValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCpf(e.target.value);
    onChange(formattedValue);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label} {required && '*'}
      </Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="000.000.000-00"
          maxLength={14}
          required={required}
          className={cn(
            showError && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {showError && (
          <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-destructive" />
        )}
      </div>
      {showError && (
        <p className="text-sm text-destructive">
          CPF inválido. Verifique os números digitados.
        </p>
      )}
    </div>
  );
};

export default CPFInput;