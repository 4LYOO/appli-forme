# Correspondances avec la table Ciqual

Table utilisée : **Ciqual 2020 (ANSES)**, 3 186 aliments. Le site ciqual.anses.fr étant en maintenance (16 au 22/11/2026), elle a été lue depuis une copie au format SQL déposée sur data.gouv.fr (ressource communautaire du jeu de données officiel « Table de composition nutritionnelle des aliments Ciqual »). Contrôles : même nombre d'aliments et mêmes colonnes que la table officielle. Dans cette copie, l'énergie manque pour 888 lignes : elle est alors recalculée avec les coefficients du règlement (UE) n° 1169/2011 (sur les 2 153 aliments où les deux existent, écart médian 0,2 %, 93 % à moins de 3 %).

Correspondances choisies à la main (tools/ciqual_map.json). « ⚠ » = la valeur Ciqual diffère nettement de l'ancienne estimation (la valeur Ciqual est retenue).

Source : ciqual2020.csv — 3186 aliments lus.

| Aliment de l'appli | Aliment Ciqual retenu | Confiance | kcal avant → après |
|---|---|---|---|
| Riz blanc cuit | Riz blanc, cuit, non salé | 1.00 | 140 → 145 |
| Riz complet cuit | Riz complet, cuit, non salé | 1.00 | 140 → 158 |
| Pâtes cuites | Pâtes sèches standard, cuites, non salées | 1.00 | 150 → 126 |
| Pâtes complètes cuites | Pâtes sèches, au blé complet, cuites, non salées | 1.00 | 145 → 128 |
| Semoule de couscous cuite | Graine de couscous (semoule de blé dur précuite), cuite, non salée | 1.00 | 115 → 157 ⚠ |
| Quinoa cuit | Quinoa, bouilli/cuit à l'eau, non salé | 1.00 | 120 → 149 |
| Boulgour cuit | Boulgour de blé, cuit, non salé | 1.00 | 95 → 111 |
| Pommes de terre cuites à l'eau | Pomme de terre, bouillie/cuite à l'eau | 1.00 | 80 → 80 |
| Purée de pommes de terre (lait, beurre) | Pomme de terre, purée, avec lait et beurre, non salée | 1.00 | 95 → 89 |
| Patate douce cuite | Patate douce, cuite | 1.00 | 90 → 63 |
| Frites au four | Frites de pommes de terre, surgelées, rôties/cuites au four | 1.00 | 165 → 213 ⚠ |
| Gnocchis cuits | Gnocchi à la pomme de terre, cuit | 1.00 | 135 → 177 ⚠ |
| Riz cru (pour les préparations) | Riz blanc, cru | 1.00 | 355 → 352 |
| Pâtes sèches (pour les préparations) | Pâtes sèches standard, crues | 1.00 | 355 → 336 |
| Lentilles sèches (pour les préparations) | Lentille verte, sèche (énergie recalculée) | 1.00 | 330 → 295 |
| Pois chiches en boîte (égouttés) | Pois chiche, appertisé, égoutté (énergie recalculée) | 1.00 | 150 → 111 |
| Haricots rouges en boîte (égouttés) | Haricot rouge, appertisé, égoutté (énergie recalculée) | 1.00 | 115 → 94 |
| Flocons d'avoine | Flocon d'avoine | 1.00 | 370 → 367 |
| Muesli | Muesli (aliment moyen) | 1.00 | 370 → 418 |
| Granola | Muesli croustillant aux fruits et/ou fruits secs, graines (non enrichi en vitamines et minéraux) | 1.00 | 450 → 436 |
| Céréales du petit-déjeuner (pétales de maïs) | Céréales pour petit déjeuner (aliment moyen) | 1.00 | 380 → 398 |
| Baguette | Pain, baguette, courante | 1.00 | 275 → 287 |
| Pain complet | Pain complet ou intégral (à la farine T150) | 1.00 | 245 → 244 |
| Pain de mie | Pain de mie, courant | 1.00 | 270 → 278 |
| Pain de mie complet | Pain de mie, complet | 1.00 | 255 → 262 |
| Tortilla de blé (wrap) | Tortilla souple (à garnir), à base de blé | 1.00 | 310 → 327 |
| Croissant | Croissant, sans précision | 1.00 | 420 → 375 |
| Pain au chocolat | Pain au chocolat feuilleté, artisanal | 1.00 | 420 → 423 |
| Biscottes | Biscotte classique | 1.00 | 410 → 409 |
| Lentilles vertes cuites | Lentille verte, bouillie/cuite à l'eau | 1.00 | 125 → 127 |
| Lentilles corail cuites | Lentille corail, bouillie/cuite à l'eau (énergie recalculée) | 1.00 | 115 → 107 |
| Pois chiches cuits | Pois chiche, bouilli/cuit à l'eau | 1.00 | 150 → 147 |
| Haricots rouges cuits | Haricot rouge, bouilli/cuit à l'eau | 1.00 | 115 → 116 |
| Haricots blancs cuits | Haricot blanc, bouilli/cuit à l'eau | 1.00 | 110 → 112 |
| Pois cassés cuits | Pois cassé, bouilli/cuit à l'eau (énergie recalculée) | 1.00 | 120 → 113 |
| Edamame (fèves de soja) | **non remplacé** (aucun) | 0.00 | 125 (provisoire) |
| Houmous | Houmous, préemballé (énergie recalculée) | 1.00 | 300 → 276 |
| Falafels | Falafel ou Boulette de pois-chiche et/ou fève, frite | 1.00 | 330 → 252 |
| Tofu ferme nature | Tofu nature, préemballé | 1.00 | 125 → 148 |
| Tofu fumé | Tofu fumé, préemballé | 1.00 | 170 → 164 |
| Tempeh | Tempeh | 1.00 | 190 → 157 |
| Seitan | Seitan, préemballé | 1.00 | 120 → 134 |
| Steak végétal (soja) | Escalope végétale ou steak à base de soja (énergie recalculée) | 1.00 | 200 → 229 |
| Protéines de soja texturées (sèches) | **non remplacé** (aucun) | 0.00 | 330 (provisoire) |
| Boisson au soja | Boisson au soja, nature, non enrichie, préemballée | 1.00 | 42 → 37 |
| Yaourt au soja nature | Dessert au soja, nature, non sucré, non enrichi, fermenté, préemballé | 1.00 | 50 → 45 |
| Œuf dur ou à la coque | Oeuf, dur | 1.00 | 140 → 134 |
| Œuf au plat | Oeuf, au plat, frit, salé | 1.00 | 190 → 204 |
| Omelette nature (avec matière grasse) | Omelette aux fines herbes | 1.00 | 170 → 147 |
| Œufs brouillés | Oeuf, brouillé, avec matière grasse | 1.00 | 165 → 145 |
| Lait demi-écrémé | Lait demi-écrémé, UHT | 1.00 | 46 → 47 |
| Lait entier | Lait entier, UHT | 1.00 | 65 → 65 |
| Lait chocolaté | **non remplacé** (aucun) | 0.00 | 75 (provisoire) |
| Skyr nature | **non remplacé** (aucun) | 0.00 | 62 (provisoire) |
| Fromage blanc 3 % | Fromage blanc nature, 3% MG environ | 1.00 | 76 → 77 |
| Fromage blanc 0 % | Fromage blanc nature, 0% MG | 1.00 | 46 → 49 |
| Yaourt nature | Yaourt ou spécialité laitière nature (aliment moyen) | 1.00 | 62 → 57 |
| Yaourt à la grecque | Yaourt à la grecque, nature (énergie recalculée) | 1.00 | 120 → 113 |
| Petits-suisses nature | Fromage frais type petit suisse, nature, 4% MG environ | 1.00 | 110 → 89 |
| Crème dessert chocolat | Crème dessert au chocolat, rayon frais | 1.00 | 130 → 130 |
| Protéine en poudre (whey) | **non remplacé** (aucun) | 0.00 | 380 (provisoire) |
| Emmental / fromage râpé | Emmental ou emmenthal râpé | 1.00 | 380 → 367 |
| Comté | Comté | 1.00 | 410 → 418 |
| Mozzarella | Mozzarella au lait de vache | 1.00 | 250 → 227 |
| Feta | Feta AOP | 1.00 | 270 → 285 |
| Camembert | Camembert, sans précision | 1.00 | 270 → 280 |
| Chèvre frais | Fromage de chèvre frais, au lait pasteurisé (type bûchette fraîche) (énergie recalculée) | 1.00 | 200 → 253 ⚠ |
| Fromage fondu (portion) | Fromage fondu en portions ou en cubes environ 20% MG | 1.00 | 240 → 242 |
| Amandes | Amande (avec peau) (énergie recalculée) | 1.00 | 630 → 575 |
| Noix | Noix, séchée, cerneaux (énergie recalculée) | 1.00 | 700 → 686 |
| Noix de cajou | Noix de cajou, grillée, non salée | 1.00 | 595 → 618 |
| Cacahuètes grillées | Cacahuète, grillée, sans sel ajouté (énergie recalculée) | 1.00 | 620 → 606 |
| Noisettes | Noisette (énergie recalculée) | 1.00 | 650 → 598 |
| Mélange fruits secs et oléagineux | Mélange apéritif de graines (non salées) et raisins secs | 1.00 | 480 → 541 |
| Beurre de cacahuète | Beurre de cacahuète ou Pâte d'arachide (énergie recalculée) | 1.00 | 630 → 626 |
| Purée d'amande | **non remplacé** (aucun) | 0.00 | 640 (provisoire) |
| Graines de courge | **non remplacé** (aucun) | 0.00 | 580 (provisoire) |
| Graines de chia | Chia, graine, séchée (énergie recalculée) | 1.00 | 480 → 373 |
| Banane | Banane, pulpe, crue | 1.00 | 90 → 90 |
| Pomme | Pomme, pulpe et peau, crue (énergie recalculée) | 1.00 | 53 → 51 |
| Orange | Orange, pulpe, crue | 1.00 | 45 → 46 |
| Clémentine | Clémentine ou Mandarine, pulpe, crue | 1.00 | 45 → 47 |
| Kiwi | Kiwi, pulpe et graines, cru | 1.00 | 60 → 60 |
| Fruits rouges (surgelés) | Fruits rouges, crus (framboises, fraises, groseilles, cassis) (énergie recalculée) | 1.00 | 45 → 39 |
| Avocat | Avocat, pulpe, cru | 1.00 | 200 → 205 |
| Compote sans sucre ajouté | Purée de pommes, type "compote sans sucres ajoutés" | 1.00 | 65 → 56 |
| Dattes | Datte, pulpe et peau, sèche (énergie recalculée) | 1.00 | 290 → 272 |
| Raisins secs | Raisin, sec | 1.00 | 300 → 321 |
| Abricots secs | Abricot, dénoyauté, sec | 1.00 | 255 → 239 |
| Figues sèches | Figue, sèche (énergie recalculée) | 1.00 | 260 → 239 |
| Jus d'orange | Jus d'orange, pur jus | 1.00 | 45 → 45 |
| Légumes variés cuits | Légume cuit (aliment moyen) | 1.00 | 35 → 44 |
| Poêlée de légumes (avec huile) | Poêlée de légumes assaisonnés sans champignon, surgelée, crue | 1.00 | 60 → 81 |
| Brocoli cuit | Brocoli, cuit (énergie recalculée) | 1.00 | 35 → 20 |
| Haricots verts cuits | Haricot vert, cuit | 1.00 | 30 → 29 |
| Épinards cuits | Épinard, cuit (énergie recalculée) | 1.00 | 25 → 16 |
| Courgette cuite | Courgette, pulpe et peau, cuite | 1.00 | 18 → 16 |
| Ratatouille | Ratatouille cuisinée, préemballée (énergie recalculée) | 1.00 | 60 → 53 |
| Carottes râpées | Carotte, crue | 1.00 | 36 → 40 |
| Tomates | Tomate, crue | 1.00 | 20 → 19 |
| Salade verte | Salade verte, crue, sans assaisonnement (énergie recalculée) | 1.00 | 15 → 11 |
| Maïs doux | Maïs doux, appertisé, égoutté | 1.00 | 100 → 106 |
| Champignons cuits | Champignon de Paris ou champignon de couche, bouilli/cuit à l'eau | 1.00 | 30 → 29 |
| Soupe de légumes | Soupe aux légumes variés, préemballée à réchauffer | 1.00 | 35 → 39 |
| Huile d'olive | Huile d'olive vierge extra | 1.00 | 900 → 900 |
| Huile de colza | Huile de colza | 1.00 | 900 → 900 |
| Beurre | Beurre à 82% MG, doux | 1.00 | 745 → 753 |
| Crème fraîche | Crème de lait, 30% MG, épaisse, rayon frais | 1.00 | 290 → 304 |
| Mayonnaise | Mayonnaise (70% MG min.), préemballée (énergie recalculée) | 1.00 | 700 → 695 |
| Pesto | Sauce pesto, préemballée | 1.00 | 450 → 370 |
| Sauce tomate | Sauce tomate aux petits légumes, préemballée (énergie recalculée) | 1.00 | 45 → 63 |
| Chocolat noir 70 % | Chocolat noir à 70% cacao minimum, extra, dégustation, tablette | 1.00 | 580 → 591 |
| Chocolat au lait | Chocolat au lait, tablette | 1.00 | 545 → 537 |
| Barre de céréales | Barre céréalière aux fruits | 1.00 | 410 → 377 |
| Biscuits secs (type petit-beurre) | Biscuit sec petit beurre (énergie recalculée) | 1.00 | 450 → 440 |
| Gâteau type quatre-quarts | Quatre-quarts, préemballé (énergie recalculée) | 1.00 | 430 → 432 |
| Pâte à tartiner chocolat-noisette | Pâte à tartiner chocolat et noisette (énergie recalculée) | 1.00 | 540 → 543 |
| Miel | Miel (énergie recalculée) | 1.00 | 325 → 329 |
| Confiture | Confiture ou Marmelade, tout type de fruits (aliment moyen) | 1.00 | 260 → 249 |
| Sucre | Sucre blanc (énergie recalculée) | 1.00 | 400 → 399 |
| Soda | Boisson gazeuse, sans jus de fruit, sucrée | 1.00 | 42 → 37 |
| Café noir | Café, non instantané, non sucré, prêt à boire | 1.00 | 2 → 7 |
| Café au lait (lait demi-écrémé) | Café au lait, café crème ou cappuccino, instantané ou non, non sucré, prêt à boire | 1.00 | 25 → 22 |
| Thé ou tisane | Thé infusé, non sucré | 1.00 | 1 → 0 |
| Chocolat chaud au lait | **non remplacé** (aucun) | 0.00 | 80 (provisoire) |
| Pizza margherita | Pizza au fromage ou Pizza margherita, préemballée | 1.00 | 245 → 227 |
| Quiche aux légumes | Tarte aux légumes, préemballée | 1.00 | 250 → 216 |
| Lasagnes végétariennes | Lasagnes ou cannellonis aux légumes, préemballés, cuits | 1.00 | 130 → 122 |
| Gratin de pâtes au fromage | Gratin de pâtes | 1.00 | 170 → 179 |
| Dahl de lentilles | **non remplacé** (aucun) | 0.00 | 130 (provisoire) |
| Chili sin carne | **non remplacé** (aucun) | 0.00 | 110 (provisoire) |
| Curry de pois chiches | **non remplacé** (aucun) | 0.00 | 140 (provisoire) |
| Soupe de lentilles | Soupe aux lentilles, préemballée à réchauffer | 1.00 | 70 → 55 |
| Riz cantonais végétarien | **non remplacé** (aucun) | 0.00 | 160 (provisoire) |
| Nouilles sautées aux légumes | **non remplacé** (aucun) | 0.00 | 160 (provisoire) |
| Taboulé | Taboulé ou Salade de couscous, préemballé | 1.00 | 180 → 179 |
| Sandwich fromage (baguette) | **non remplacé** (aucun) | 0.00 | 280 (provisoire) |
| Wrap végétarien | **non remplacé** (aucun) | 0.00 | 200 (provisoire) |
| Burrito végétarien | **non remplacé** (aucun) | 0.00 | 180 (provisoire) |
| Maki avocat / légumes | **non remplacé** (aucun) | 0.00 | 150 (provisoire) |
