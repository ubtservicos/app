import { AlertCircle, CheckCircle2, Eye, EyeOff, Key, Lock, Mail, Phone, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthTopBar from "@/components/auth/AuthTopBar";
import FormField from "@/components/auth/FormField";
import PrimaryButton from "@/components/auth/PrimaryButton";
import { useSimpleToast } from "@/hooks/useToast2";
import Toast from "@/components/auth/Toast";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/services/AnalyticsService";
import { logSystem } from "@/services/LoggingService";
import { maskPhone } from "@/utils/masks";

interface LeadValidationResult {
  valid: boolean;
  lead_id?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  perfil?: string[] | string[][];
  status?: string;
  bairro_moradia?: string;
  bairro_trabalho?: string;
  cidade?: string;
  error?: string;
  message?: string;
}

type Strength = "fraca" | "razoavel" | "forte";

const getStrength = (senha: string): Strength | null => {
  if (!senha) return null;
  if (senha.length < 8) return "fraca";
  const hasDigit = /\d/.test(senha);
  const hasLetter = /[a-zA-Z]/.test(senha);
  if (hasDigit && hasLetter) return "forte";
  return "razoavel";
};

export default function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { toast, showToast } = useSimpleToast();

  const [validating, setValidating] = useState(true);
  const [leadInfo, setLeadInfo] = useState<LeadValidationResult | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [completedSuccess, setCompletedSuccess] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);

  // 1. Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setValidating(false);
        setLeadInfo({
          valid: false,
          error: "NO_TOKEN",
          message: "Nenhum token de convite fornecido na URL.",
        });
        return;
      }

      try {
        setValidating(true);
        const { data, error } = await supabase.rpc("validate_onboarding_token", {
          p_token: token,
        });

        if (error) throw error;

        const result = data as LeadValidationResult;
        setLeadInfo(result);

        if (result.valid) {
          trackEvent("onboarding_token_validated", { lead_id: result.lead_id });
        }
      } catch (err: any) {
        console.error("Erro ao validar token de onboarding:", err);
        setLeadInfo({
          valid: false,
          error: "RPC_ERROR",
          message: err.message || "Erro de conexão ao verificar seu convite.",
        });
      } finally {
        setValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const validateForm = () => {
    const nextErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      nextErrors.password = "Informe sua senha de acesso";
    } else if (password.length < 8) {
      nextErrors.password = "A senha deve ter pelo menos 8 caracteres";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirme sua senha";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !leadInfo || !leadInfo.email) return;

    setSubmitting(true);
    const startTime = Date.now();
    logSystem("INFO", "AUTH", "onboarding_submit", "started", undefined, undefined, undefined, {
      email: leadInfo.email,
      lead_id: leadInfo.lead_id,
    });

    try {
      // 1. Register with Supabase Auth
      let authUserId: string | null = null;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: leadInfo.email,
        password: password,
        options: {
          data: {
            full_name: leadInfo.nome,
            phone: leadInfo.telefone,
            waitlist_id: leadInfo.lead_id,
            is_founder: true,
          },
        },
      });

      if (signUpError) {
        // If user already registered, attempt sign-in to link/update
        if (
          signUpError.message?.toLowerCase().includes("already registered") ||
          signUpError.message?.toLowerCase().includes("already exists") ||
          signUpError.message?.toLowerCase().includes("user already")
        ) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: leadInfo.email,
            password: password,
          });

          if (signInError) {
            throw new Error(
              "Esta conta já existe com outra senha. Por favor, faça login ou recupere sua senha."
            );
          }
          authUserId = signInData?.user?.id || null;
        } else {
          throw signUpError;
        }
      } else {
        authUserId = signUpData?.user?.id || null;
      }

      if (!authUserId) {
        // Fallback: check session
        const { data: sessionData } = await supabase.auth.getSession();
        authUserId = sessionData?.session?.user?.id || null;
      }

      if (authUserId) {
        // 2. Link onboarding record & create active profile via RPC
        const { data: completeData, error: completeError } = await supabase.rpc(
          "complete_onboarding",
          {
            p_token: token,
            p_user_id: authUserId,
          }
        );

        if (completeError) {
          console.warn("Aviso ao vincular complete_onboarding:", completeError);
        }

        // 3. Mark persistent flags to bypass terms & tour reprompt
        localStorage.setItem("ubt_lgpd_accepted", "true");
        localStorage.setItem("ubt_tour_completed", "true");

        // 4. Analytics & Logging
        trackEvent("onboarding_completed", { lead_id: leadInfo.lead_id, user_id: authUserId });
        logSystem(
          "INFO",
          "AUTH",
          "onboarding_submit",
          "success",
          Date.now() - startTime,
          undefined,
          undefined,
          { email: leadInfo.email, user_id: authUserId }
        );

        setCompletedSuccess(true);
        showToast("Conta de Fundador ativada com sucesso! Bem-vindo(a) ao UBT! 🎉");

        // 5. Navigate to Home
        setTimeout(() => {
          const isPrestador =
            completeData?.role === "prestador" ||
            (Array.isArray(leadInfo.perfil) &&
              leadInfo.perfil.some((p: any) =>
                typeof p === "string"
                  ? ["mototaxista", "ambulante", "prestador"].includes(p)
                  : Array.isArray(p) && p.some((subP: string) => ["mototaxista", "ambulante", "prestador"].includes(subP))
              ));

          if (isPrestador) {
            navigate("/app/prestador/home", { replace: true });
          } else {
            navigate("/app/home", { replace: true });
          }
        }, 1200);
      } else {
        showToast("Conta criada! Verifique seu e-mail para confirmar seu acesso.");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err: any) {
      console.error("Erro durante onboarding:", err);
      logSystem(
        "ERROR",
        "AUTH",
        "onboarding_submit",
        "failed",
        Date.now() - startTime,
        err.message,
        err.code || "ONBOARDING_ERROR",
        { email: leadInfo?.email }
      );
      showToast(err.message || "Não foi possível ativar sua conta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between px-6 py-6 font-sans">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
        <AuthTopBar backTo="/login" />

        {/* 1. Loading State */}
        {validating && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green/10 border border-green/30 flex items-center justify-center mb-6 animate-pulse">
              <Sparkles className="text-green w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">
              Validando seu Convite...
            </h2>
            <p className="text-sm text-white/60 max-w-xs">
              Estamos consultando sua aprovação como Membro Fundador do UBT.
            </p>
          </div>
        )}

        {/* 2. Invalid or Expired Token State */}
        {!validating && (!leadInfo || !leadInfo.valid) && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
              <AlertCircle className="text-red-400 w-8 h-8" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">
              {leadInfo?.error === "ALREADY_COMPLETED"
                ? "Convite Já Utilizado"
                : "Convite Indisponível"}
            </h2>
            <p className="text-sm text-white/70 max-w-sm mb-6 leading-relaxed">
              {leadInfo?.message ||
                "O link de acesso é inválido, expirou ou ainda não foi aprovado na fila de espera."}
            </p>

            <div className="w-full space-y-3">
              <Link
                to="/login"
                className="w-full py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-sm flex items-center justify-center transition-colors"
              >
                Ir para o Login
              </Link>
              <Link
                to="/"
                className="block text-xs text-white/50 hover:text-white transition-colors"
              >
                Voltar à Página Inicial
              </Link>
            </div>
          </div>
        )}

        {/* 3. Valid Lead State - Password Setup Form */}
        {!validating && leadInfo && leadInfo.valid && (
          <div className="flex-1 flex flex-col justify-center py-6">
            {/* Header / Founder Badge */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green/10 border border-green/30 text-green text-xs font-semibold uppercase tracking-wider mb-3">
                <ShieldCheck size={14} />
                Membro Fundador Aprovado
              </div>
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">
                Olá, {leadInfo.nome?.split(" ")[0]}! 🎉
              </h1>
              <p className="text-sm text-white/60 mt-1">
                Seu cadastro foi aprovado. Crie sua senha definitiva para ativar sua conta no UBT.
              </p>
            </div>

            {/* Read-Only Lead Details Card */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40 flex items-center gap-1.5">
                  <Mail size={13} /> E-mail Cadastrado
                </span>
                <span className="text-white font-medium">{leadInfo.email}</span>
              </div>
              {leadInfo.telefone && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 flex items-center gap-1.5">
                    <Phone size={13} /> Telefone / WhatsApp
                  </span>
                  <span className="text-white font-medium">{maskPhone(leadInfo.telefone)}</span>
                </div>
              )}
            </div>

            {/* Password Setup Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="Criar Senha"
                icon={Lock}
                type={showPwd ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />

              {/* Strength Indicator */}
              {strength && (
                <div className="flex items-center gap-2 px-1 -mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden flex gap-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        strength === "fraca"
                          ? "w-1/3 bg-red-500"
                          : strength === "razoavel"
                          ? "w-2/3 bg-yellow-500"
                          : "w-full bg-green"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-medium capitalize ${
                      strength === "fraca"
                        ? "text-red-400"
                        : strength === "razoavel"
                        ? "text-yellow-400"
                        : "text-green"
                    }`}
                  >
                    Senha {strength}
                  </span>
                </div>
              )}

              <FormField
                label="Confirmar Senha"
                icon={Key}
                type={showConfirmPwd ? "text" : "password"}
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />

              <div className="pt-3">
                <PrimaryButton
                  type="submit"
                  loading={submitting}
                  loadingText="Ativando sua Conta..."
                  className="shadow-lg shadow-green/20"
                >
                  {completedSuccess ? (
                    <>
                      <CheckCircle2 size={18} className="text-white" /> Conta Ativada!
                    </>
                  ) : (
                    <>
                      <UserCheck size={18} /> Ativar Minha Conta de Fundador
                    </>
                  )}
                </PrimaryButton>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <footer className="pt-6 text-center text-xs text-white/40 border-t border-white/5 mt-auto">
          UBT SuperApp &copy; {new Date().getFullYear()} &bull; Todos os direitos reservados.
        </footer>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
