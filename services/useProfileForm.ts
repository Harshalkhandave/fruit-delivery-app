// services/useProfileForm.ts
import { useState } from 'react';

export type Field = 'firstName' | 'lastName' | 'email' | 'phone';

export type ErrorsType = Record<Field, string>;
export type TouchedType = Record<Field, boolean>;

interface UseProfileFormProps {
  initialValues?: Partial<Record<Field, string>>;
  validate?: (field: Field, value: string) => string;
}

export function useProfileForm({ initialValues = {}, validate }: UseProfileFormProps) {
  const [values, setValues] = useState<Record<Field, string>>({
    firstName: initialValues.firstName || '',
    lastName: initialValues.lastName || '',
    email: initialValues.email || '',
    phone: initialValues.phone || '',
  });

  const [errors, setErrors] = useState<ErrorsType>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [touched, setTouched] = useState<TouchedType>({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
  });

  const handleChange = (field: Field, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleBlur = (field: Field) => {
    const value = values[field];
    const error = validate ? validate(field, value) : '';
    setErrors(prev => ({ ...prev, [field]: error }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFormValid = () => {
    return !Object.values(errors).some(e => e !== '');
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    isFormValid,
    setValues,
    setErrors,
    setTouched,
  };
}