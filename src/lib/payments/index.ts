export type PaymentMethod = {
  id: string;
  label: string;
  description: string;
};

export const PAYMENT_METHODS: Record<string, PaymentMethod> = {
  card: {
    id: "card",
    label: "Credit / Debit Card",
    description: "Visa, Mastercard, Amex supported.",
  },
  stripe: {
    id: "stripe",
    label: "Stripe",
    description: "Secure checkout with Stripe.",
  },
  paypal: {
    id: "paypal",
    label: "PayPal",
    description: "Pay with your PayPal account.",
  },
  upi: {
    id: "upi",
    label: "UPI",
    description: "Instant UPI payments.",
  },
  razorpay: {
    id: "razorpay",
    label: "Razorpay",
    description: "Indian payments via Razorpay.",
  },
};

export const isIndianRegion = (locale: string) =>
  locale.toLowerCase().includes("in");

export const getPaymentMethodsForLocale = (locale: string) => {
  if (isIndianRegion(locale)) {
    return [PAYMENT_METHODS.upi, PAYMENT_METHODS.razorpay, PAYMENT_METHODS.card];
  }
  return [
    PAYMENT_METHODS.card,
    PAYMENT_METHODS.stripe,
    PAYMENT_METHODS.paypal,
  ];
};
