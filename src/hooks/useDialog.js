import { useState } from 'react';

export function useDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogData, setDialogData] = useState({});

  const openDialog = (data = {}) => {
    setDialogData(data);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setTimeout(() => setDialogData({}), 300); // Limpiar después de la animación
  };

  return {
    isOpen,
    dialogData,
    openDialog,
    closeDialog
  };
}
