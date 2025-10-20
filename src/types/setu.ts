export type SetuCreateDQRResponse = {
  id: string;
  merchantId: string;
  merchantReferenceId: string;
  refId: string;
  shortLink: string;
  intentLink: string;
  qrCode: string;
  merchantVpa: string;
  amount: number;
  minAmount?: number;
  transactionNote: string;
  metadata: {
    paymentId: string;
  };
  status: string;
  reason?: {
    code: string;
    desc: string;
    npciRespCode?: string;
  };
  createdAt: string;
  expiryDate: string;
  closedAt?: string;
};

export type SetuGetDQRResponse = {
  id: string;
  merchantId: string;
  merchantReferenceId: string;
  refId: string;
  shortLink: string;
  intentLink: string;
  qrCode: string;
  merchantVpa: string;
  amount: number;
  minAmount?: number;
  transactionNote: string;
  metadata: {
    paymentId: string;
  };
  status: string;
  reason?: {
    code: string;
    desc: string;
    npciRespCode?: string;
  };
  createdAt: string;
  expiryDate: string;
  closedAt?: string;
};
