// =============================================================================
// GEORGIA DATA SEEDING SCRIPT
// =============================================================================
// Run this script to populate the database with Georgia county, city, and ZIP data
// Usage: npx tsx src/scripts/seed-georgia.ts

import { PrismaClient } from '@prisma/client';
import { GEORGIA_CRIME_DATA, CRIME_DATA_BY_NAME, DATA_YEAR } from '../data/georgia-crime-data.js';
import { calculateSafetyScore, GEORGIA_COUNTIES } from '../services/fbi-crime.js';

const prisma = new PrismaClient();

// Georgia ZIP codes with centroids (subset - full list would be ~700+)
// In production, you'd fetch this from Census Bureau or similar
const GEORGIA_ZIP_DATA: Array<{
  zipCode: string;
  city: string;
  county: string;
  lat: number;
  lng: number;
}> = [
  // Atlanta Metro
  { zipCode: '30301', city: 'Atlanta', county: 'Fulton', lat: 33.7490, lng: -84.3880 },
  { zipCode: '30302', city: 'Atlanta', county: 'Fulton', lat: 33.7550, lng: -84.3900 },
  { zipCode: '30303', city: 'Atlanta', county: 'Fulton', lat: 33.7537, lng: -84.3901 },
  { zipCode: '30305', city: 'Atlanta', county: 'Fulton', lat: 33.8340, lng: -84.3800 },
  { zipCode: '30306', city: 'Atlanta', county: 'Fulton', lat: 33.7870, lng: -84.3500 },
  { zipCode: '30307', city: 'Atlanta', county: 'DeKalb', lat: 33.7650, lng: -84.3350 },
  { zipCode: '30308', city: 'Atlanta', county: 'Fulton', lat: 33.7710, lng: -84.3740 },
  { zipCode: '30309', city: 'Atlanta', county: 'Fulton', lat: 33.7990, lng: -84.3850 },
  { zipCode: '30310', city: 'Atlanta', county: 'Fulton', lat: 33.7310, lng: -84.4200 },
  { zipCode: '30311', city: 'Atlanta', county: 'Fulton', lat: 33.7200, lng: -84.4700 },
  { zipCode: '30312', city: 'Atlanta', county: 'Fulton', lat: 33.7420, lng: -84.3760 },
  { zipCode: '30313', city: 'Atlanta', county: 'Fulton', lat: 33.7620, lng: -84.4010 },
  { zipCode: '30314', city: 'Atlanta', county: 'Fulton', lat: 33.7550, lng: -84.4200 },
  { zipCode: '30315', city: 'Atlanta', county: 'Fulton', lat: 33.7050, lng: -84.3870 },
  { zipCode: '30316', city: 'Atlanta', county: 'DeKalb', lat: 33.7200, lng: -84.3350 },
  { zipCode: '30317', city: 'Atlanta', county: 'DeKalb', lat: 33.7490, lng: -84.3180 },
  { zipCode: '30318', city: 'Atlanta', county: 'Fulton', lat: 33.7920, lng: -84.4400 },
  { zipCode: '30319', city: 'Atlanta', county: 'DeKalb', lat: 33.8720, lng: -84.3360 },
  { zipCode: '30324', city: 'Atlanta', county: 'Fulton', lat: 33.8170, lng: -84.3560 },
  { zipCode: '30326', city: 'Atlanta', county: 'Fulton', lat: 33.8510, lng: -84.3620 },
  { zipCode: '30327', city: 'Atlanta', county: 'Fulton', lat: 33.8640, lng: -84.4220 },
  { zipCode: '30328', city: 'Atlanta', county: 'Fulton', lat: 33.9350, lng: -84.3600 },
  { zipCode: '30329', city: 'Atlanta', county: 'DeKalb', lat: 33.8280, lng: -84.3220 },
  { zipCode: '30030', city: 'Decatur', county: 'DeKalb', lat: 33.7740, lng: -84.2960 },
  { zipCode: '30032', city: 'Decatur', county: 'DeKalb', lat: 33.7390, lng: -84.2630 },
  { zipCode: '30033', city: 'Decatur', county: 'DeKalb', lat: 33.8100, lng: -84.2830 },
  { zipCode: '30034', city: 'Decatur', county: 'DeKalb', lat: 33.6920, lng: -84.2530 },
  { zipCode: '30035', city: 'Decatur', county: 'DeKalb', lat: 33.7190, lng: -84.2100 },

  // Marietta / Cobb
  { zipCode: '30060', city: 'Marietta', county: 'Cobb', lat: 33.9530, lng: -84.5500 },
  { zipCode: '30062', city: 'Marietta', county: 'Cobb', lat: 33.9870, lng: -84.4770 },
  { zipCode: '30064', city: 'Marietta', county: 'Cobb', lat: 33.9250, lng: -84.5900 },
  { zipCode: '30066', city: 'Marietta', county: 'Cobb', lat: 34.0230, lng: -84.5000 },
  { zipCode: '30067', city: 'Marietta', county: 'Cobb', lat: 33.9360, lng: -84.4600 },
  { zipCode: '30068', city: 'Marietta', county: 'Cobb', lat: 33.9780, lng: -84.4400 },

  // Alpharetta / Johns Creek
  { zipCode: '30004', city: 'Alpharetta', county: 'Fulton', lat: 34.1320, lng: -84.2900 },
  { zipCode: '30005', city: 'Alpharetta', county: 'Fulton', lat: 34.0770, lng: -84.2320 },
  { zipCode: '30009', city: 'Alpharetta', county: 'Fulton', lat: 34.0630, lng: -84.2770 },
  { zipCode: '30022', city: 'Alpharetta', county: 'Fulton', lat: 34.0250, lng: -84.2350 },
  { zipCode: '30024', city: 'Suwanee', county: 'Gwinnett', lat: 34.0510, lng: -84.0710 },
  { zipCode: '30097', city: 'Duluth', county: 'Gwinnett', lat: 34.0030, lng: -84.1550 },

  // Gwinnett
  { zipCode: '30044', city: 'Lawrenceville', county: 'Gwinnett', lat: 33.9310, lng: -84.0730 },
  { zipCode: '30045', city: 'Lawrenceville', county: 'Gwinnett', lat: 33.9670, lng: -83.9870 },
  { zipCode: '30046', city: 'Lawrenceville', county: 'Gwinnett', lat: 33.9400, lng: -83.9400 },
  { zipCode: '30043', city: 'Lawrenceville', county: 'Gwinnett', lat: 34.0000, lng: -84.0300 },
  { zipCode: '30047', city: 'Lilburn', county: 'Gwinnett', lat: 33.8890, lng: -84.1430 },
  { zipCode: '30052', city: 'Loganville', county: 'Gwinnett', lat: 33.8390, lng: -83.9000 },
  { zipCode: '30071', city: 'Norcross', county: 'Gwinnett', lat: 33.9410, lng: -84.2130 },
  { zipCode: '30078', city: 'Snellville', county: 'Gwinnett', lat: 33.8570, lng: -84.0200 },
  { zipCode: '30084', city: 'Tucker', county: 'DeKalb', lat: 33.8550, lng: -84.2170 },
  { zipCode: '30087', city: 'Stone Mountain', county: 'DeKalb', lat: 33.8080, lng: -84.1700 },
  { zipCode: '30088', city: 'Stone Mountain', county: 'DeKalb', lat: 33.7700, lng: -84.1600 },

  // Savannah
  { zipCode: '31401', city: 'Savannah', county: 'Chatham', lat: 32.0760, lng: -81.0910 },
  { zipCode: '31404', city: 'Savannah', county: 'Chatham', lat: 32.0410, lng: -81.0630 },
  { zipCode: '31405', city: 'Savannah', county: 'Chatham', lat: 32.0570, lng: -81.1250 },
  { zipCode: '31406', city: 'Savannah', county: 'Chatham', lat: 31.9920, lng: -81.0920 },
  { zipCode: '31410', city: 'Savannah', county: 'Chatham', lat: 32.0020, lng: -80.9630 },
  { zipCode: '31419', city: 'Savannah', county: 'Chatham', lat: 31.9510, lng: -81.1580 },

  // Augusta
  { zipCode: '30901', city: 'Augusta', county: 'Richmond', lat: 33.4735, lng: -81.9650 },
  { zipCode: '30904', city: 'Augusta', county: 'Richmond', lat: 33.4900, lng: -82.0100 },
  { zipCode: '30906', city: 'Augusta', county: 'Richmond', lat: 33.4120, lng: -82.0390 },
  { zipCode: '30907', city: 'Augusta', county: 'Richmond', lat: 33.5310, lng: -82.1060 },
  { zipCode: '30909', city: 'Augusta', county: 'Richmond', lat: 33.4850, lng: -82.0880 },

  // Columbus
  { zipCode: '31901', city: 'Columbus', county: 'Muscogee', lat: 32.4610, lng: -84.9880 },
  { zipCode: '31903', city: 'Columbus', county: 'Muscogee', lat: 32.4200, lng: -84.9600 },
  { zipCode: '31904', city: 'Columbus', county: 'Muscogee', lat: 32.5100, lng: -84.9400 },
  { zipCode: '31906', city: 'Columbus', county: 'Muscogee', lat: 32.4400, lng: -84.9100 },
  { zipCode: '31907', city: 'Columbus', county: 'Muscogee', lat: 32.4000, lng: -84.8700 },

  // Macon
  { zipCode: '31201', city: 'Macon', county: 'Bibb', lat: 32.8407, lng: -83.6324 },
  { zipCode: '31204', city: 'Macon', county: 'Bibb', lat: 32.8550, lng: -83.6800 },
  { zipCode: '31206', city: 'Macon', county: 'Bibb', lat: 32.7900, lng: -83.6500 },
  { zipCode: '31210', city: 'Macon', county: 'Bibb', lat: 32.8900, lng: -83.7300 },
  { zipCode: '31211', city: 'Macon', county: 'Bibb', lat: 32.8600, lng: -83.5900 },

  // Athens
  { zipCode: '30601', city: 'Athens', county: 'Clarke', lat: 33.9608, lng: -83.3781 },
  { zipCode: '30605', city: 'Athens', county: 'Clarke', lat: 33.9100, lng: -83.3550 },
  { zipCode: '30606', city: 'Athens', county: 'Clarke', lat: 33.9460, lng: -83.4400 },
  { zipCode: '30607', city: 'Athens', county: 'Clarke', lat: 34.0000, lng: -83.4000 },

  // Sandy Springs / Dunwoody
  { zipCode: '30338', city: 'Dunwoody', county: 'DeKalb', lat: 33.9460, lng: -84.3170 },
  { zipCode: '30339', city: 'Atlanta', county: 'Cobb', lat: 33.8800, lng: -84.4600 },
  { zipCode: '30340', city: 'Atlanta', county: 'DeKalb', lat: 33.8970, lng: -84.2570 },
  { zipCode: '30341', city: 'Atlanta', county: 'DeKalb', lat: 33.8900, lng: -84.2900 },
  { zipCode: '30342', city: 'Atlanta', county: 'Fulton', lat: 33.8800, lng: -84.3700 },
  { zipCode: '30350', city: 'Atlanta', county: 'Fulton', lat: 33.9800, lng: -84.3400 },

  // Additional suburban areas
  { zipCode: '30080', city: 'Smyrna', county: 'Cobb', lat: 33.8840, lng: -84.5140 },
  { zipCode: '30082', city: 'Smyrna', county: 'Cobb', lat: 33.8560, lng: -84.4900 },
  { zipCode: '30126', city: 'Mableton', county: 'Cobb', lat: 33.8140, lng: -84.5620 },
  { zipCode: '30127', city: 'Powder Springs', county: 'Cobb', lat: 33.8590, lng: -84.6840 },
  { zipCode: '30134', city: 'Douglasville', county: 'Douglas', lat: 33.7510, lng: -84.7480 },
  { zipCode: '30135', city: 'Douglasville', county: 'Douglas', lat: 33.7130, lng: -84.6880 },
  { zipCode: '30168', city: 'Austell', county: 'Cobb', lat: 33.8120, lng: -84.6340 },
  { zipCode: '30188', city: 'Woodstock', county: 'Cherokee', lat: 34.1020, lng: -84.5200 },
  { zipCode: '30189', city: 'Woodstock', county: 'Cherokee', lat: 34.1150, lng: -84.4850 },
  { zipCode: '30144', city: 'Kennesaw', county: 'Cobb', lat: 34.0230, lng: -84.6150 },
  { zipCode: '30152', city: 'Kennesaw', county: 'Cobb', lat: 34.0480, lng: -84.6600 },
  { zipCode: '30101', city: 'Acworth', county: 'Cobb', lat: 34.0660, lng: -84.6770 },
  { zipCode: '30102', city: 'Acworth', county: 'Cherokee', lat: 34.0890, lng: -84.6380 },

  // South Atlanta
  { zipCode: '30236', city: 'Jonesboro', county: 'Clayton', lat: 33.5220, lng: -84.3540 },
  { zipCode: '30238', city: 'Jonesboro', county: 'Clayton', lat: 33.4900, lng: -84.3250 },
  { zipCode: '30260', city: 'Morrow', county: 'Clayton', lat: 33.5830, lng: -84.3390 },
  { zipCode: '30273', city: 'Rex', county: 'Clayton', lat: 33.5890, lng: -84.2750 },
  { zipCode: '30274', city: 'Riverdale', county: 'Clayton', lat: 33.5630, lng: -84.4130 },
  { zipCode: '30281', city: 'Stockbridge', county: 'Henry', lat: 33.5440, lng: -84.2330 },
  { zipCode: '30228', city: 'Hampton', county: 'Henry', lat: 33.3870, lng: -84.2840 },
  { zipCode: '30253', city: 'McDonough', county: 'Henry', lat: 33.4470, lng: -84.1470 },

  // Peachtree City / Fayetteville
  { zipCode: '30269', city: 'Peachtree City', county: 'Fayette', lat: 33.3970, lng: -84.5960 },
  { zipCode: '30214', city: 'Fayetteville', county: 'Fayette', lat: 33.4480, lng: -84.4550 },
  { zipCode: '30215', city: 'Fayetteville', county: 'Fayette', lat: 33.4000, lng: -84.4600 },

  // Newnan / Coweta
  { zipCode: '30263', city: 'Newnan', county: 'Coweta', lat: 33.3810, lng: -84.7990 },
  { zipCode: '30265', city: 'Newnan', county: 'Coweta', lat: 33.3750, lng: -84.7420 },

  // Canton / Cherokee
  { zipCode: '30114', city: 'Canton', county: 'Cherokee', lat: 34.2370, lng: -84.4910 },
  { zipCode: '30115', city: 'Canton', county: 'Cherokee', lat: 34.2200, lng: -84.5800 },
];

/**
 * Seed Georgia counties with pre-downloaded FBI crime data
 */
async function seedCounties() {
  console.log('Seeding Georgia counties with static crime data...');
  console.log(`Data source: FBI Crime Data Explorer (${DATA_YEAR})`);

  let seededCount = 0;

  for (const county of GEORGIA_CRIME_DATA) {
    // Calculate safety score from crime rates
    const safetyScore = calculateSafetyScore({
      violentCrime: county.violentCrimeRate,
      propertyCrime: county.propertyCrimeRate,
      murder: county.murderRate,
      robbery: county.robberyRate,
      assault: county.assaultRate,
      burglary: county.burglaryRate,
      larceny: county.larcenyRate,
      vehicleTheft: county.vehicleTheftRate,
    });

    await prisma.georgiaCounty.upsert({
      where: { fips: county.fips },
      update: {
        name: county.name,
        population: county.population,
        violentCrimeRate: county.violentCrimeRate,
        propertyCrimeRate: county.propertyCrimeRate,
        murderRate: county.murderRate,
        robberyRate: county.robberyRate,
        assaultRate: county.assaultRate,
        burglaryRate: county.burglaryRate,
        larcenyRate: county.larcenyRate,
        vehicleTheftRate: county.vehicleTheftRate,
        safetyScore: safetyScore.overall,
        safetyGrade: safetyScore.grade,
        crimeDataYear: DATA_YEAR,
      },
      create: {
        fips: county.fips,
        name: county.name,
        population: county.population,
        violentCrimeRate: county.violentCrimeRate,
        propertyCrimeRate: county.propertyCrimeRate,
        murderRate: county.murderRate,
        robberyRate: county.robberyRate,
        assaultRate: county.assaultRate,
        burglaryRate: county.burglaryRate,
        larcenyRate: county.larcenyRate,
        vehicleTheftRate: county.vehicleTheftRate,
        safetyScore: safetyScore.overall,
        safetyGrade: safetyScore.grade,
        crimeDataYear: DATA_YEAR,
      },
    });

    seededCount++;
  }

  console.log(`✓ Seeded ${seededCount} Georgia counties with crime data`);
}

/**
 * Seed Georgia cities
 */
async function seedCities() {
  console.log('Seeding Georgia cities...');

  const cityMap = new Map<string, { lat: number; lng: number; county: string }>();

  // Aggregate cities from ZIP data
  for (const zip of GEORGIA_ZIP_DATA) {
    const key = `${zip.city}-${zip.county}`;
    if (!cityMap.has(key)) {
      cityMap.set(key, { lat: zip.lat, lng: zip.lng, county: zip.county });
    }
  }

  let cityCount = 0;
  for (const [key, data] of cityMap) {
    const [cityName] = key.split('-');

    // Find county
    const countyFips = GEORGIA_COUNTIES[data.county];
    if (!countyFips) {
      console.log(`Warning: County not found: ${data.county}`);
      continue;
    }

    const county = await prisma.georgiaCounty.findUnique({
      where: { fips: countyFips },
    });

    if (!county) continue;

    await prisma.georgiaCity.upsert({
      where: {
        name_countyId: {
          name: cityName,
          countyId: county.id,
        },
      },
      update: {
        lat: data.lat,
        lng: data.lng,
      },
      create: {
        name: cityName,
        countyId: county.id,
        lat: data.lat,
        lng: data.lng,
      },
    });

    cityCount++;
  }

  console.log(`Created ${cityCount} cities`);
}

/**
 * Seed Georgia ZIP codes
 */
async function seedZipCodes() {
  console.log('Seeding Georgia ZIP codes...');

  let zipCount = 0;
  for (const zip of GEORGIA_ZIP_DATA) {
    // Find county
    const countyFips = GEORGIA_COUNTIES[zip.county];
    if (!countyFips) continue;

    const county = await prisma.georgiaCounty.findUnique({
      where: { fips: countyFips },
    });

    if (!county) continue;

    // Find city
    const city = await prisma.georgiaCity.findFirst({
      where: {
        name: zip.city,
        countyId: county.id,
      },
    });

    await prisma.georgiaZipCode.upsert({
      where: { zipCode: zip.zipCode },
      update: {
        lat: zip.lat,
        lng: zip.lng,
        countyId: county.id,
        cityId: city?.id,
      },
      create: {
        zipCode: zip.zipCode,
        countyId: county.id,
        cityId: city?.id,
        lat: zip.lat,
        lng: zip.lng,
      },
    });

    zipCount++;
  }

  console.log(`Created ${zipCount} ZIP codes`);
}

/**
 * Main seeding function
 */
async function main() {
  console.log('Starting Georgia data seed...\n');

  try {
    await seedCounties();
    await seedCities();
    await seedZipCodes();

    console.log('\nSeed completed successfully!');

    // Print summary
    const countyCount = await prisma.georgiaCounty.count();
    const cityCount = await prisma.georgiaCity.count();
    const zipCount = await prisma.georgiaZipCode.count();

    console.log('\nDatabase summary:');
    console.log(`  Counties: ${countyCount}`);
    console.log(`  Cities: ${cityCount}`);
    console.log(`  ZIP Codes: ${zipCount}`);
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
