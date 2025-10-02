import { useState, useMemo } from 'react';

interface ViolationTransaction {
  invoiceNumber: string;
  invoiceDate: Date;
  location: string;
  quantity: number;
  unitPrice: number;
  overspendAmount: number;
}

interface AgreementViolationData {
  violations: ViolationTransaction[];
  totalOverspend: number;
  hasViolations: boolean;
}

interface UseAgreementViolationsProps {
  transactions: Array<{
    invoiceNumber: string;
    invoiceDate: Date;
    location: string;
    quantity: number;
    unitPrice: number;
    unitType: string;
  }>;
  priceAgreement?: {
    price: number;
    unitType: string;
  };
}

export const useAgreementViolations = ({
  transactions,
  priceAgreement,
}: UseAgreementViolationsProps) => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [hasShownAlert, setHasShownAlert] = useState(false);

  const violationData = useMemo((): AgreementViolationData => {
    if (!priceAgreement || transactions.length === 0) {
      return {
        violations: [],
        totalOverspend: 0,
        hasViolations: false,
      };
    }

    const violations: ViolationTransaction[] = [];
    let totalOverspend = 0;

    transactions.forEach(transaction => {
      // Only check violations for the same unit type as the agreement
      if (transaction.unitType === priceAgreement.unitType) {
        if (transaction.unitPrice > priceAgreement.price) {
          const overspendAmount = (transaction.unitPrice - priceAgreement.price) * transaction.quantity;
          
          violations.push({
            invoiceNumber: transaction.invoiceNumber,
            invoiceDate: transaction.invoiceDate,
            location: transaction.location,
            quantity: transaction.quantity,
            unitPrice: transaction.unitPrice,
            overspendAmount,
          });
          
          totalOverspend += overspendAmount;
        }
      }
    });

    return {
      violations,
      totalOverspend,
      hasViolations: violations.length > 0,
    };
  }, [transactions, priceAgreement]);

  // Auto-show alert when violations are detected (only once per session)
  const shouldShowAlert = violationData.hasViolations && !hasShownAlert && !isAlertOpen;

  const openAlert = () => {
    setIsAlertOpen(true);
  };

  const closeAlert = () => {
    setIsAlertOpen(false);
    setHasShownAlert(true);
  };

  const resetAlert = () => {
    setHasShownAlert(false);
    setIsAlertOpen(false);
  };

  return {
    violationData,
    isAlertOpen,
    shouldShowAlert,
    openAlert,
    closeAlert,
    resetAlert,
  };
};
