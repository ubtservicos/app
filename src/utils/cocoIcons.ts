import { getMaterial } from "@/mocks/cocoMateriais";

export function getPinIconUrl(material: string): string {
  const mat = getMaterial(material);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="${mat.cor}" stroke="#FFFFFF" stroke-width="2.5"/>
    <text x="50%" y="54%" font-size="18" text-anchor="middle" dominant-baseline="middle">${mat.emoji}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getPinIcon(material: string) {
  return {
    url: getPinIconUrl(material),
    scaledSize: { width: 36, height: 36 } as any,
  };
}

export function getTruckIconUrl(isOnline: boolean = true): string {
  const cor = isOnline ? "#0DB87E" : "#9399AD";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="${cor}" stroke="#FFFFFF" stroke-width="3"/>
    <text x="50%" y="54%" font-size="20" text-anchor="middle" dominant-baseline="middle">🚚</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getTruckIcon(isOnline: boolean = true) {
  return {
    url: getTruckIconUrl(isOnline),
    scaledSize: { width: 40, height: 40 } as any,
  };
}
