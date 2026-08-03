export interface ProductCustomizationOption {
  id: string;
  name: string;
  type: 'REMOVAL' | 'EXTRA' | 'CHOICE';
  additionalCost: number;
  available: boolean;
}

export interface ProductCustomizationGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  required: boolean;
  options: ProductCustomizationOption[];
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  availableQty: number; // Produzida - (Reservada + Vendida + Descartada)
  customizationGroups: ProductCustomizationGroup[];
}
