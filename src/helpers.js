export const demoProducts = [
  { id: 'sample-1', title: 'Everyday Woven Tote', category: 'Basketry', price: 1450, description: 'A roomy woven bag, finished by hand. A practical piece inspired by the baskets our family has made for generations.', hindi_description: 'पीढ़ियों से चली आ रही बुनाई की कला से बनाया गया बैग।', image_url: '/bag.jpg' },
  { id: 'sample-2', title: 'Earth & Clay Vase', category: 'Pottery', price: 980, description: 'A small ceramic vase shaped by hand and finished with an earthy glaze. Every piece has its own gentle variations.', hindi_description: '', image_url: '/vase.jpg' },
  { id: 'sample-3', title: 'Quiet Evening Candle', category: 'Other', price: 720, description: 'A small candle poured in batches and finished by hand. Made for slow evenings and thoughtful gifts.', hindi_description: '', image_url: '/candle.jpg' },
];

export const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value) || 0);

const storageKey = 'kalanidhi-products-v2';

export function readDemoProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : demoProducts;
  } catch {
    return demoProducts;
  }
}

// Write first: if browser storage is full, the UI reports it instead of claiming success.
export function saveDemoProducts(products) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(products));
  } catch {
    throw new Error('Your browser storage is full or unavailable. Try a smaller photo, or connect Supabase for cloud saving.');
  }
}

export function getPrice(material, hours, rate, packaging) {
  const labour = Number(hours || 0) * Number(rate || 0);
  const cost = Number(material || 0) + labour + Number(packaging || 0);
  return { labour, cost, low: Math.ceil(cost * 1.2), high: Math.ceil(cost * 1.5) };
}

export function readPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('Choose a JPG, PNG, or WebP photo.'));
  }
  if (file.size > 8 * 1024 * 1024) {
    return Promise.reject(new Error('Please choose a photo smaller than 8 MB.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('This photo could not be opened. Please try another.'));
    reader.readAsDataURL(file);
  });
}

// A basic image adjustment, applied to the actual saved JPEG, with no AI service.
export async function preparePhoto(source, brightness = 100) {
  if (!source) return '';
  const image = new Image();
  image.src = source;
  await image.decode();
  const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.filter = `brightness(${brightness}%)`;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}
