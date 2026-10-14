import React from "react";
import { PaymentTransaction, UserProfile } from "../types";
import { NotificationCenter } from "./NotificationCenter";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  userUid?: string;
  isAdmin?: boolean;
  onSelectTransactionForReceipt?: (tx: PaymentTransaction) => void;
  onOpenReceipt?: (tx: PaymentTransaction) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  user,
  userUid = "",
  isAdmin,
  onSelectTransactionForReceipt,
  onOpenReceipt,
  onUnreadCountChange,
}) => {
  if (!isOpen) return null;

  return (
    <NotificationCenter
      isOpen={isOpen}
      onClose={onClose}
      user={user}
      userUid={userUid || user?.uid || user?.id}
      isAdmin={isAdmin}
      onSelectTransactionForReceipt={onSelectTransactionForReceipt}
      onOpenReceipt={onOpenReceipt}
      onUnreadCountChange={onUnreadCountChange}
      variant="modal"
    />
  );
};

export default NotificationModal;
