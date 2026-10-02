import {
  AirVent,
  Armchair,
  Baby,
  Bath,
  BedDouble,
  BedSingle,
  Building,
  Check,
  Coffee,
  CookingPot,
  Fan,
  Heater,
  KeyRound,
  Laptop,
  Microwave,
  Refrigerator,
  Shirt,
  ShowerHead,
  Sofa,
  Sun,
  Trees,
  Tv,
  Utensils,
  WashingMachine,
  Wifi,
  Wind,
} from 'lucide-react';

// Amenity keys stored on a suite (comma-separated in the database), with icon and labels.
// Order here is the order used in the Settings editor.
export const AMENITIES = {
  double_bed: { icon: BedDouble, en: 'Double bed', es: 'Cama doble' },
  twin_beds: { icon: BedSingle, en: 'Twin beds', es: 'Camas individuales' },
  sofa_bed: { icon: Sofa, en: 'Sofa bed', es: 'Sofá cama' },
  living_area: { icon: Armchair, en: 'Living area', es: 'Zona de estar' },
  private_terrace: { icon: Sun, en: 'Private terrace', es: 'Terraza privada' },
  patio: { icon: Trees, en: 'Patio', es: 'Patio' },
  balcony: { icon: Building, en: 'Balcony', es: 'Balcón' },
  kitchen: { icon: CookingPot, en: 'Kitchen', es: 'Cocina' },
  kitchenette: { icon: Microwave, en: 'Kitchenette', es: 'Cocina pequeña' },
  dining_area: { icon: Utensils, en: 'Dining area', es: 'Comedor' },
  fridge: { icon: Refrigerator, en: 'Fridge', es: 'Nevera' },
  coffee_machine: { icon: Coffee, en: 'Coffee machine', es: 'Cafetera' },
  washing_machine: { icon: WashingMachine, en: 'Washing machine', es: 'Lavadora' },
  air_conditioning: { icon: AirVent, en: 'Air conditioning', es: 'Aire acondicionado' },
  heating: { icon: Heater, en: 'Heating', es: 'Calefacción' },
  fan: { icon: Fan, en: 'Ceiling fan', es: 'Ventilador de techo' },
  wifi: { icon: Wifi, en: 'Free Wi-Fi', es: 'Wi-Fi gratis' },
  smart_tv: { icon: Tv, en: 'Smart TV', es: 'Smart TV' },
  workspace: { icon: Laptop, en: 'Workspace', es: 'Zona de trabajo' },
  private_bathroom: { icon: ShowerHead, en: 'Private bathroom', es: 'Baño privado' },
  bathtub: { icon: Bath, en: 'Bathtub', es: 'Bañera' },
  hairdryer: { icon: Wind, en: 'Hairdryer', es: 'Secador de pelo' },
  iron: { icon: Shirt, en: 'Iron', es: 'Plancha' },
  cot_available: { icon: Baby, en: 'Cot on request', es: 'Cuna bajo petición' },
  self_check_in: { icon: KeyRound, en: 'Self check-in', es: 'Check-in autónomo' },
};

export const AMENITY_KEYS = Object.keys(AMENITIES);

/** Label in the current language; unknown keys are shown humanized ("sea_view" -> "Sea view"). */
export function amenityLabel(key, tr = (en) => en) {
  const amenity = AMENITIES[key];
  if (amenity) {
    return tr(amenity.en, amenity.es);
  }
  const text = String(key || '').replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function amenityIcon(key) {
  return AMENITIES[key]?.icon || Check;
}
