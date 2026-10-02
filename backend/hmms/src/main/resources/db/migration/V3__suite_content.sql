-- Suite details and photos from carmensuites.com/suites (October 2026): descriptions in
-- Spanish (from the website) and English, size, amenities and the photo galleries. The photos
-- are shipped with the frontend (frontend/hmms/public/suites/).
--
-- Suites are matched by name, ignoring case, spaces and º/°, so "Suite 1ºA" and "suite 1a" both
-- match. Only empty details are filled and only suites without photos get photos, so anything
-- edited in Settings is never overwritten. Suites with other names are left alone.

-- The website calls the ground-floor patio suite "Suite 0ºA"
UPDATE suites SET suite_name = 'Suite 0ºA' WHERE lower(trim(suite_name)) = 'patio';

UPDATE suites s
SET description_en = COALESCE(s.description_en, w.description_en),
    description_es = COALESCE(s.description_es, w.description_es),
    size_m2        = COALESCE(s.size_m2, w.size_m2),
    amenities      = COALESCE(s.amenities, w.amenities)
FROM (VALUES
    ('suite0a', 48, 'twin_beds,extra_bed,patio,rooftop_solarium,accessible,elevator,kitchen,air_conditioning,wifi,spacious_bathroom,no_pets',
     'A suite adapted for guests with reduced mobility, with exclusive use of the patio: an open-air space sheltered by the Mudéjar brick walls of the neighbouring building, protected 19th-century heritage.

The suite is designed to be spacious, for comfort and ease of movement, with two huge windows onto the Mudéjar patio. Ideal for a comfortable, peaceful stay, with no obstacles or steps between the street and the suite.

The suite is one open space with:
• Living room with sofa, dining area, TV and a kitchen with appliances (fridge, ceramic hob, oven, toaster…).
• Sleeping area with two single beds (90 × 190 cm each) and an extra bed (90 × 190 cm).
• Spacious bathroom.',
     'Suite adaptada para personas con movilidad reducida, con uso exclusivo del patio, un espacio al aire libre abrigado por paredes de ladrillo mudéjar del edificio colindante, patrimonio protegido del siglo XIX.

Esta suite está pensada con amplitud para facilitar la comodidad y la movilidad del huésped, con dos enormes ventanales al patio mudéjar. Ideal para la comodidad y la tranquilidad de nuestros huéspedes, sin ningún obstáculo ni escalón entre la calle y la suite.

La suite, en una sola estancia, se distribuye en:
• Salón con sofá, comedor, televisión y cocina dotada de electrodomésticos (nevera, vitro, horno, tostadora…).
• Dormitorio integrado con dos camas individuales (90/190 cm cada una) y una cama supletoria (90/190 cm).
• Cuarto de baño amplio.'),
    ('suite1a', 45, 'double_bed,rooftop_solarium,city_view,elevator,kitchen,air_conditioning,wifi,spacious_bathroom,no_pets',
     'First-floor suite with three large windows onto Calle Beatas, on the corner of Calle Cañuelo de San Bernardo: a very bright apartment with views of the street, right in the rhythm of the city.

On Friday and Saturday nights the street is noticeably livelier and more fun, with the many bars, restaurants and nightspots in the area.

The suite has:
• Bedroom with a double bed (150 × 190 cm).
• Living room with sofa, dining table, TV and a kitchen with appliances (fridge, ceramic hob, oven, toaster…).
• Spacious bathroom.',
     'Suite en primera planta, con tres grandes ventanales a la calle Beatas esquina a calle Cañuelo de San Bernardo: alojamiento muy luminoso que disfruta de la visión de la calle y vive directamente el ritmo de la ciudad.

La calle se hace notar en las noches del fin de semana, viernes y sábado, más ambientada y divertida, ante la variedad de bares, restaurantes y “garitos” de la zona.

La suite se distribuye del siguiente modo:
• Dormitorio con cama de matrimonio de 150/190 cm.
• Salón con sofá, mesa comedor, televisión y cocina dotada de electrodomésticos (nevera, vitro, horno, tostadora…).
• Cuarto de baño amplio.'),
    ('suite1b', 48, 'twin_beds,rooftop_solarium,patio_view,elevator,kitchen,air_conditioning,wifi,spacious_bathroom,no_pets',
     'First-floor suite overlooking the patio, an open-air space sheltered by the Mudéjar brick walls of the neighbouring building, protected 19th-century heritage.

A quiet suite, designed to be spacious and bright, with two huge windows onto the Mudéjar patio. Away from the busier rhythm of Calle Beatas, it is ideal for a comfortable, peaceful stay.

The suite has:
• Sleeping area with two single beds (90 × 190 cm each).
• Living room with sofa, dining table, TV and a kitchen with appliances (fridge, ceramic hob, oven, toaster…).
• Spacious bathroom.',
     'Suite en primera planta con vistas al patio, un espacio al aire libre abrigado por las paredes en ladrillo mudéjar del edificio colindante, patrimonio protegido del siglo XIX.

Es una suite tranquila, pensada con amplitud para facilitar la comodidad y la luminosidad. Cuenta con dos enormes ventanales al patio mudéjar, es ajena al ritmo más urbano de la calle Beatas e ideal para la comodidad y la tranquilidad de nuestros huéspedes.

La suite se distribuye del siguiente modo:
• Dormitorio integrado con dos camas individuales de 90/190 cm cada una.
• Salón con sofá, mesa comedor, televisión y cocina dotada de electrodomésticos (nevera, vitro, horno, tostadora…).
• Cuarto de baño amplio.'),
    ('suite2a', 45, 'double_bed,rooftop_solarium,city_view,elevator,kitchen,air_conditioning,wifi,spacious_bathroom,no_pets',
     'Second-floor suite with three large windows onto Calle Beatas, on the corner of Calle Cañuelo de San Bernardo: a very bright apartment with views of the street, right in the rhythm of the city.

On Friday and Saturday nights the street is noticeably livelier and more fun, with the many bars, restaurants and nightspots in the area.

The suite has:
• Bedroom with a double bed (150 × 190 cm).
• Living room with sofa, dining table, TV and a kitchen with appliances (fridge, ceramic hob, oven, toaster…).
• Spacious bathroom.',
     'Suite en segunda planta, con tres grandes ventanales a la calle Beatas esquina a calle Cañuelo de San Bernardo: alojamiento muy luminoso que disfruta de la visión de la calle y vive directamente el ritmo de la ciudad.

La calle se hace notar en las noches del fin de semana, viernes y sábado, más ambientada y divertida, ante la variedad de bares, restaurantes y “garitos” de la zona.

La suite se distribuye del siguiente modo:
• Dormitorio con cama de matrimonio de 150/190 cm.
• Salón con sofá, mesa comedor, televisión y cocina dotada de electrodomésticos (nevera, vitro, horno, tostadora…).
• Cuarto de baño amplio.'),
    ('suite2b', 48, 'double_bed,rooftop_solarium,patio_view,elevator,kitchen,air_conditioning,wifi,spacious_bathroom,no_pets',
     'Second-floor suite with views of the Málaga sky, the Mudéjar patio and the neighbouring building itself, protected 19th-century heritage.

A quiet and very bright suite with two huge windows onto the Mudéjar patio. Away from the busier pace of Calle Beatas, it is designed to be spacious, for a comfortable, peaceful stay.

The suite has:
• Bedroom with a double bed (150 × 190 cm).
• Living room with sofa, dining table, TV and a kitchen with appliances (fridge, ceramic hob, oven, toaster…).
• Spacious bathroom.',
     'Suite en segunda planta con vistas al cielo de Málaga, al patio mudéjar y al propio edificio colindante, patrimonio protegido del siglo XIX.

Es una suite tranquila y muy luminosa, con dos enormes ventanales al patio mudéjar, ajena al ritmo más ajetreado de la calle Beatas y pensada con amplitud para facilitar la comodidad y la tranquilidad de nuestros huéspedes.

La suite se distribuye del siguiente modo:
• Dormitorio con cama de matrimonio de 150/190 cm.
• Salón con sofá, mesa comedor, televisión y cocina dotada de electrodomésticos (nevera, vitro, horno, tostadora…).
• Cuarto de baño amplio.')
) AS w (match_key, size_m2, amenities, description_en, description_es)
WHERE regexp_replace(lower(s.suite_name), '[^a-z0-9]', '', 'g') = w.match_key;

INSERT INTO suite_photos (suite_id, sort_order, url)
SELECT s.suite_id, p.sort_order, p.url
FROM suites s
JOIN (VALUES
    ('suite0a', 0, '/suites/57.webp'),
    ('suite0a', 1, '/suites/61.webp'),
    ('suite0a', 2, '/suites/69.webp'),
    ('suite0a', 3, '/suites/71.webp'),
    ('suite0a', 4, '/suites/65.webp'),
    ('suite0a', 5, '/suites/64.webp'),
    ('suite0a', 6, '/suites/67.webp'),
    ('suite0a', 7, '/suites/70.webp'),
    ('suite0a', 8, '/suites/73.webp'),
    ('suite0a', 9, '/suites/79.webp'),
    ('suite0a', 10, '/suites/77.webp'),
    ('suite0a', 11, '/suites/66.webp'),
    ('suite0a', 12, '/suites/76.webp'),
    ('suite0a', 13, '/suites/72.webp'),
    ('suite0a', 14, '/suites/63.webp'),
    ('suite0a', 15, '/suites/78.webp'),
    ('suite0a', 16, '/suites/58.webp'),
    ('suite0a', 17, '/suites/59.webp'),
    ('suite0a', 18, '/suites/68.webp'),
    ('suite0a', 19, '/suites/74.webp'),
    ('suite0a', 20, '/suites/75.webp'),
    ('suite1a', 0, '/suites/36.webp'),
    ('suite1a', 1, '/suites/50.webp'),
    ('suite1a', 2, '/suites/38.webp'),
    ('suite1a', 3, '/suites/55.webp'),
    ('suite1a', 4, '/suites/54.webp'),
    ('suite1a', 5, '/suites/153.webp'),
    ('suite1a', 6, '/suites/34.webp'),
    ('suite1a', 7, '/suites/37.webp'),
    ('suite1a', 8, '/suites/43.webp'),
    ('suite1a', 9, '/suites/51.webp'),
    ('suite1a', 10, '/suites/52.webp'),
    ('suite1a', 11, '/suites/44.webp'),
    ('suite1a', 12, '/suites/41.webp'),
    ('suite1a', 13, '/suites/140.webp'),
    ('suite1a', 14, '/suites/142.webp'),
    ('suite1a', 15, '/suites/47.webp'),
    ('suite1a', 16, '/suites/46.webp'),
    ('suite1b', 0, '/suites/70.webp'),
    ('suite1b', 1, '/suites/74.webp'),
    ('suite1b', 2, '/suites/69.webp'),
    ('suite1b', 3, '/suites/63.webp'),
    ('suite1b', 4, '/suites/57.webp'),
    ('suite1b', 5, '/suites/61.webp'),
    ('suite1b', 6, '/suites/73.webp'),
    ('suite1b', 7, '/suites/59.webp'),
    ('suite1b', 8, '/suites/58.webp'),
    ('suite1b', 9, '/suites/75.webp'),
    ('suite1b', 10, '/suites/66.webp'),
    ('suite1b', 11, '/suites/65.webp'),
    ('suite1b', 12, '/suites/79.webp'),
    ('suite1b', 13, '/suites/78.webp'),
    ('suite1b', 14, '/suites/64.webp'),
    ('suite1b', 15, '/suites/72.webp'),
    ('suite1b', 16, '/suites/71.webp'),
    ('suite1b', 17, '/suites/67.webp'),
    ('suite1b', 18, '/suites/68.webp'),
    ('suite1b', 19, '/suites/76.webp'),
    ('suite1b', 20, '/suites/77.webp'),
    ('suite2a', 0, '/suites/90.webp'),
    ('suite2a', 1, '/suites/38.webp'),
    ('suite2a', 2, '/suites/43.webp'),
    ('suite2a', 3, '/suites/37.webp'),
    ('suite2a', 4, '/suites/55.webp'),
    ('suite2a', 5, '/suites/95.webp'),
    ('suite2a', 6, '/suites/44.webp'),
    ('suite2a', 7, '/suites/94.webp'),
    ('suite2a', 8, '/suites/83.webp'),
    ('suite2a', 9, '/suites/82.webp'),
    ('suite2a', 10, '/suites/36.webp'),
    ('suite2a', 11, '/suites/41.webp'),
    ('suite2a', 12, '/suites/88.webp'),
    ('suite2a', 13, '/suites/80.webp'),
    ('suite2a', 14, '/suites/53.webp'),
    ('suite2a', 15, '/suites/96.webp'),
    ('suite2a', 16, '/suites/86.webp'),
    ('suite2a', 17, '/suites/84.webp'),
    ('suite2a', 18, '/suites/39.webp'),
    ('suite2a', 19, '/suites/54.webp'),
    ('suite2a', 20, '/suites/89.webp'),
    ('suite2a', 21, '/suites/85.webp'),
    ('suite2a', 22, '/suites/47.webp'),
    ('suite2a', 23, '/suites/93.webp'),
    ('suite2a', 24, '/suites/56.webp'),
    ('suite2a', 25, '/suites/42.webp'),
    ('suite2b', 0, '/suites/108.webp'),
    ('suite2b', 1, '/suites/157.webp'),
    ('suite2b', 2, '/suites/101.webp'),
    ('suite2b', 3, '/suites/145.webp'),
    ('suite2b', 4, '/suites/114.webp'),
    ('suite2b', 5, '/suites/143.webp'),
    ('suite2b', 6, '/suites/136.webp'),
    ('suite2b', 7, '/suites/120.webp'),
    ('suite2b', 8, '/suites/104.webp'),
    ('suite2b', 9, '/suites/111.webp'),
    ('suite2b', 10, '/suites/135.webp'),
    ('suite2b', 11, '/suites/126.webp'),
    ('suite2b', 12, '/suites/100.webp'),
    ('suite2b', 13, '/suites/103.webp'),
    ('suite2b', 14, '/suites/107.webp'),
    ('suite2b', 15, '/suites/146.webp'),
    ('suite2b', 16, '/suites/124.webp'),
    ('suite2b', 17, '/suites/123.webp'),
    ('suite2b', 18, '/suites/125.webp'),
    ('suite2b', 19, '/suites/109.webp'),
    ('suite2b', 20, '/suites/110.webp'),
    ('suite2b', 21, '/suites/156.webp'),
    ('suite2b', 22, '/suites/144.webp'),
    ('suite2b', 23, '/suites/105.webp'),
    ('suite2b', 24, '/suites/106.webp'),
    ('suite2b', 25, '/suites/122.webp'),
    ('suite2b', 26, '/suites/102.webp'),
    ('suite2b', 27, '/suites/112.webp')
) AS p (match_key, sort_order, url)
  ON regexp_replace(lower(s.suite_name), '[^a-z0-9]', '', 'g') = p.match_key
WHERE NOT EXISTS (SELECT 1 FROM suite_photos existing WHERE existing.suite_id = s.suite_id);
