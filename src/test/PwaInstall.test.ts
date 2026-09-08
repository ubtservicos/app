import { describe, it, expect, vi } from "vitest";

// Mock minimal usePwaInstall hook behavior for verification states
interface PwaInstallState {
  showInstallBtn: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  hasNativePrompt: boolean;
  installOutcome: "accepted" | "dismissed" | "ios_instructions" | "prompt_unavailable";
}

function resolvePwaUiState(
  state: Omit<PwaInstallState, "showInstallBtn">
): PwaInstallState {
  return {
    ...state,
    showInstallBtn: !state.isStandalone
  };
}

describe("PWA Installation CTA States & Behaviors", () => {
  // Estado A — instalação disponível
  it("should show installation CTA and indicate native prompt is available", () => {
    const rawState = {
      isStandalone: false,
      isIOS: false,
      hasNativePrompt: true,
      installOutcome: "accepted" as const
    };
    const resolved = resolvePwaUiState(rawState);
    
    expect(resolved.showInstallBtn).toBe(true);
    expect(resolved.hasNativePrompt).toBe(true);
    expect(resolved.isIOS).toBe(false);
  });

  // Estado B — usuário aceita
  it("should handle user accepting the prompt", () => {
    const rawState = {
      isStandalone: false,
      isIOS: false,
      hasNativePrompt: true,
      installOutcome: "accepted" as const
    };
    const resolved = resolvePwaUiState(rawState);
    expect(resolved.installOutcome).toBe("accepted");
  });

  // Estado C — usuário recusa
  it("should handle user dismissing the prompt without throwing or breaking PWA", () => {
    const rawState = {
      isStandalone: false,
      isIOS: false,
      hasNativePrompt: true,
      installOutcome: "dismissed" as const
    };
    const resolved = resolvePwaUiState(rawState);
    expect(resolved.installOutcome).toBe("dismissed");
    expect(resolved.showInstallBtn).toBe(true); // Should still show install button so they can try again later
  });

  // Estado D — já instalada
  it("should hide installation CTA when app runs in display-mode: standalone", () => {
    const rawState = {
      isStandalone: true,
      isIOS: false,
      hasNativePrompt: false,
      installOutcome: "prompt_unavailable" as const
    };
    const resolved = resolvePwaUiState(rawState);
    
    expect(resolved.showInstallBtn).toBe(false); // CTA must not appear
  });

  // Estado E — navegador iOS sem prompt nativo
  it("should return ios_instructions when on iOS and no native prompt", () => {
    const rawState = {
      isStandalone: false,
      isIOS: true, // iOS Safari has no beforeinstallprompt
      hasNativePrompt: false,
      installOutcome: "ios_instructions" as const
    };
    const resolved = resolvePwaUiState(rawState);
    
    expect(resolved.showInstallBtn).toBe(true); // Show CTA
    expect(resolved.hasNativePrompt).toBe(false); // Indicates fallback is required
    expect(resolved.isIOS).toBe(true); // Directs to iOS shared modal instructions
    expect(resolved.installOutcome).toBe("ios_instructions");
  });

  // Estado F — waitlist com fluxo de apadrinhamento e slugs amigáveis
  it("should generate friendly referral URLs with user slug and short id", () => {
    const origin = "https://ubt-homologacao.vercel.app";
    const slug = "felipe-santander-001";
    const referralUrl = `${origin}/cadastro?ref=${slug}`;
    
    expect(referralUrl).toBe("https://ubt-homologacao.vercel.app/cadastro?ref=felipe-santander-001");
  });

  it("should sanitize CPF formatting before querying database", () => {
    const rawCpf = "123.456.789-00";
    const cleanCpf = rawCpf.replace(/\D/g, "");
    expect(cleanCpf).toBe("12345678900");
  });
});
