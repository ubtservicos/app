export const maskCPF = (v: string) =>
  v
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .slice(0, 14);

export const maskPhone = (v: string) =>
  v
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);

export const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const maskCardNumber = (v: string) =>
  v
    .replace(/\D/g, "")
    .replace(/(\d{4})(\d)/, "$1 $2")
    .replace(/(\d{4})(\d)/, "$1 $2")
    .replace(/(\d{4})(\d)/, "$1 $2")
    .slice(0, 19);

export const maskExpiry = (v: string) =>
  v
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1/$2")
    .slice(0, 5);

export const maskCNPJ = (v: string) =>
  v
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})/, "$1-$2")
    .slice(0, 18);

export const generateReferralSlug = (name?: string, id?: string): string => {
  const rawFirstName = (name || "fundador").trim().split(" ")[0] || "fundador";
  const cleanFirstName = rawFirstName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");

  const safeName = cleanFirstName || "fundador";

  // Alphanumeric 4-character short code
  let shortCode = "x7a9";
  if (id) {
    const cleanId = id.replace(/[^a-zA-Z0-9]/g, "");
    shortCode = cleanId.slice(-4) || "x7a9";
  } else {
    shortCode = Math.random().toString(36).substring(2, 6);
  }

  return `${safeName}-${shortCode}`;
};

