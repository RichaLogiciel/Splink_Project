"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ROIViewContextType {
  showROIView: boolean;
  setShowROIView: (show: boolean) => void;
}

const ROIViewContext = createContext<ROIViewContextType | undefined>(undefined);

export const ROIViewProvider = ({ children }: { children: ReactNode }) => {
  const [showROIView, setShowROIView] = useState(false);

  return (
    <ROIViewContext.Provider value={{ showROIView, setShowROIView }}>
      {children}
    </ROIViewContext.Provider>
  );
};

export const useROIView = () => {
  const context = useContext(ROIViewContext);
  if (context === undefined) {
    throw new Error("useROIView must be used within a ROIViewProvider");
  }
  return context;
};
