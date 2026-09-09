import { describe, it, expect } from "vitest";
import { calculatePaymentWithFee, DEFAULT_FEE_SETTINGS, type GatewayFeeSettings } from "@/services/FinancialFeeService";

describe("FinancialFeeService", () => {
  it("calculates fee correctly for PIX (default 0%)", () => {
    const calc = calculatePaymentWithFee(12.50, "pix", DEFAULT_FEE_SETTINGS);
    expect(calc.basePrice).toBe(12.50);
    expect(calc.feePct).toBe(0.0);
    expect(calc.feeAmount).toBe(0.0);
    expect(calc.totalAmount).toBe(12.50);
    expect(calc.paymentMethod).toBe("pix");
  });

  it("calculates fee correctly for Credit Card (default 2.99%)", () => {
    const calc = calculatePaymentWithFee(100.00, "card", DEFAULT_FEE_SETTINGS);
    expect(calc.basePrice).toBe(100.00);
    expect(calc.feePct).toBe(2.99);
    expect(calc.feeAmount).toBe(2.99);
    expect(calc.totalAmount).toBe(102.99);
    expect(calc.paymentMethod).toBe("card");
  });

  it("handles custom dynamic settings from database", () => {
    const customSettings: GatewayFeeSettings = {
      taxaPixPct: 0.99,
      taxaCardPct: 3.49,
      source: "database",
    };

    const pixCalc = calculatePaymentWithFee(50.00, "pix", customSettings);
    expect(pixCalc.feePct).toBe(0.99);
    expect(pixCalc.feeAmount).toBe(0.50);
    expect(pixCalc.totalAmount).toBe(50.50);

    const cardCalc = calculatePaymentWithFee(50.00, "card", customSettings);
    expect(cardCalc.feePct).toBe(3.49);
    expect(cardCalc.feeAmount).toBe(1.75);
    expect(cardCalc.totalAmount).toBe(51.75);
  });
});
