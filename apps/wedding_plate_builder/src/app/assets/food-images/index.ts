/**
 * Centralized food item images, bundled from this folder by Vite.
 * To change a dish photo, replace the corresponding PNG here (same filename) or point the import at a new file.
 */

import paneerTikkaImg from './paneer-tikka.png';
import samosaImg from './samosa.png';
import tandooriChickenImg from './tandoori-chicken.png';
import springRollsImg from './spring-rolls.png';
import butterChickenImg from './butter-chicken.png';
import palakPaneerImg from './palak-paneer.png';
import dalMakhaniImg from './dal-makhani.png';
import butterNaanImg from './butter-naan.png';
import rotiImg from './roti.png';
import biryaniImg from './hyderabadi-biryani.png';
import jeeraRiceImg from './jeera-rice.png';
import gulabJamunImg from './gulab-jamun.png';
import rasmalaiImg from './rasmalai.png';
import mangoLassiImg from './mango-lassi.png';
import masalaChaiImg from './masala-chai.png';
import raitaImg from './raita.png';
import picklePapadImg from './pickle-papad.png';

// ─── Starters ───────────────────────────────────────────
export const IMG_PANEER_TIKKA = paneerTikkaImg;

export const IMG_SAMOSA = samosaImg;

export const IMG_TANDOORI_CHICKEN = tandooriChickenImg;

export const IMG_SPRING_ROLLS = springRollsImg;

// ─── Main Course ────────────────────────────────────────
export const IMG_BUTTER_CHICKEN = butterChickenImg;

export const IMG_PALAK_PANEER = palakPaneerImg;

export const IMG_DAL_MAKHANI = dalMakhaniImg;

// ─── Breads ─────────────────────────────────────────────
export const IMG_BUTTER_NAAN = butterNaanImg;

export const IMG_ROTI = rotiImg;

// ─── Rice ───────────────────────────────────────────────
export const IMG_HYDERABADI_BIRYANI = biryaniImg;

export const IMG_JEERA_RICE = jeeraRiceImg;

// ─── Desserts ───────────────────────────────────────────
export const IMG_GULAB_JAMUN = gulabJamunImg;

export const IMG_RASMALAI = rasmalaiImg;

// ─── Drinks ─────────────────────────────────────────────
export const IMG_MANGO_LASSI = mangoLassiImg;

export const IMG_MASALA_CHAI = masalaChaiImg;

// ─── Add-ons ────────────────────────────────────────────
export const IMG_RAITA = raitaImg;

export const IMG_PICKLE_PAPAD = picklePapadImg;

/**
 * Convenience map: look up any image by food item ID.
 * Usage: import { foodImageMap } from '../assets/food-images';
 *        const url = foodImageMap['s1']; // Paneer Tikka image
 */
export const foodImageMap: Record<string, string> = {
  s1: IMG_PANEER_TIKKA,
  s2: IMG_SAMOSA,
  s3: IMG_TANDOORI_CHICKEN,
  s4: IMG_SPRING_ROLLS,
  m1: IMG_BUTTER_CHICKEN,
  m2: IMG_PALAK_PANEER,
  m3: IMG_DAL_MAKHANI,
  b1: IMG_BUTTER_NAAN,
  b2: IMG_ROTI,
  r1: IMG_HYDERABADI_BIRYANI,
  r2: IMG_JEERA_RICE,
  d1: IMG_GULAB_JAMUN,
  d2: IMG_RASMALAI,
  dr1: IMG_MANGO_LASSI,
  dr2: IMG_MASALA_CHAI,
  a1: IMG_RAITA,
  a2: IMG_PICKLE_PAPAD,
};
