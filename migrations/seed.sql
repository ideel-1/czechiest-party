-- Beers (extend to >= 40)
INSERT INTO beers (id, label, image_path) VALUES
  ('pilsner_urquell', 'Pilsner Urquell', '/images/mrbeast.webp'),
  ('staropramen', 'Staropramen', '/images/lucyguo.webp'),
  ('kozell_dark', 'Kozel Dark', '/images/marandreesen.webp'),
  ('budvar', 'Budweiser Budvar', '/images/michaeltruell.webp'),
  ('bernard_ipa', 'Bernard IPA', '/images/mira.webp');

-- …add 35+ more rows following the same pattern…

-- Ruda prefs (0/1 per beer_id you inserted)
INSERT INTO host_prefs (host, beer_id, like) VALUES
  ('ruda', 'pilsner_urquell', 1),
  ('ruda', 'staropramen', 1),
  ('ruda', 'kozell_dark', 0),
  ('ruda', 'budvar', 1),
  ('ruda', 'bernard_ipa', 1);

-- Marek prefs
INSERT INTO host_prefs (host, beer_id, like) VALUES
  ('marek', 'pilsner_urquell', 1),
  ('marek', 'staropramen', 0),
  ('marek', 'kozell_dark', 1),
  ('marek', 'budvar', 1),
  ('marek', 'bernard_ipa', 0);
