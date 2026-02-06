import dotenv from 'dotenv';
dotenv.config();

import { fetchFoursquarePOIs, getFoursquareUsage } from './src/services/foursquare.js';

async function test() {
  console.log('Testing Foursquare service...\n');

  const usage = getFoursquareUsage();
  console.log('Foursquare usage before test:', usage);
  console.log('API key configured:', process.env.FOURSQUARE_API_KEY ? 'YES' : 'NO');
  console.log('');

  const pois = await fetchFoursquarePOIs(33.7756, -84.3963, 1609); // 1 mile radius

  if (!pois) {
    console.log('Result: null (not configured or rate-limited)');
    const usageAfter = getFoursquareUsage();
    console.log('Usage after test:', usageAfter);
    return;
  }

  console.log(`Total POIs found: ${pois.length}\n`);

  const cats: Record<string, number> = {};
  pois.forEach((p: any) => {
    cats[p.category] = (cats[p.category] || 0) + 1;
  });

  console.log('Category breakdown:');
  Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  console.log('\nSample POIs from previously missing categories:');
  pois
    .filter((p: any) => ['gym', 'pharmacy', 'bank', 'healthcare'].includes(p.category))
    .slice(0, 10)
    .forEach((p: any) => {
      console.log(`  [${p.category}] ${p.name} - ${p.distance}mi`);
    });
}

test();
