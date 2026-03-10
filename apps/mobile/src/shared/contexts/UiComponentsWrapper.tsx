import { ToastContainer } from '@/shared/contexts/toast';
import React from 'react';
import { DialogContainer } from './dialog';
import { BottomSheetContainer } from './bottom-sheet';
const UiComponentsWrapper: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return (
    <>
      <DialogContainer />
      <ToastContainer />
      <BottomSheetContainer />
      {children}
    </>
  );
};

export default UiComponentsWrapper;
